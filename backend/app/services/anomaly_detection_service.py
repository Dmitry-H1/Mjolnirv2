import os
import time
from typing import Dict, Tuple, Optional

from google.api_core.exceptions import NotFound,Forbidden,BadRequest,GoogleAPICallError
from google.cloud import bigquery


class AnomalyDetectionService:
    def __init__(
        self,
        bq_client: bigquery.Client,
        project_id: Optional[str] = None,
        dataset: Optional[str] = None,
        base_template_table: Optional[str] = None,
        base_latency_table: Optional[str] = None,
        base_error_table: Optional[str] = None,
        baseline_ttl_seconds: Optional[int] = None,
    ) -> None:
        self.bq = bq_client
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "mjolnir333")
        self.dataset = dataset or os.getenv("BQ_DATASET", "mjolnir_logs")
        self.base_template_table = base_template_table or os.getenv(
            "BQ_BASE_TEMPLATE", "baselines_template_daily"
        )
        self.base_latency_table = base_latency_table or os.getenv(
            "BQ_BASE_LATENCY", "baselines_service_latency_daily"
        )
        self.base_error_table = base_error_table or os.getenv(
            "BQ_BASE_ERROR", "baselines_service_errorrate_5m"
        )
        self.baseline_ttl_seconds = baseline_ttl_seconds or int(
            os.getenv("BASELINE_TTL_SECONDS", "600")
        )

        self._last_loaded = 0.0
        self._latest_date: Optional[str] = None
        self._template_freq: Dict[Tuple[str, str], float] = {}
        self._latency_p95: Dict[str, int] = {}
        self._error_rate: Dict[str, float] = {}
        self._baselines_available = False

    def load_baselines_if_needed(self) -> None:
        now = time.time()
        if now - self._last_loaded < self.baseline_ttl_seconds:
            return

        latest_date: Optional[str] = None
        template_freq: Dict[Tuple[str, str], float] = {}
        latency_p95: Dict[str, int] = {}
        error_rate: Dict[str, float] = {}

        try:
            q_date = f"""
            SELECT CAST(MAX(baseline_date) AS STRING) AS d
            FROM `{self.project_id}.{self.dataset}.{self.base_template_table}`
            """
            rows = list(self.bq.query(q_date).result())
            latest_date = rows[0]["d"] if rows and rows[0].get("d") else None

            if latest_date:
                q_templates = f"""
                SELECT service, normalized_message, freq
                FROM `{self.project_id}.{self.dataset}.{self.base_template_table}`
                WHERE baseline_date = DATE("{latest_date}")
                """
                for r in self.bq.query(q_templates).result():
                    svc = r.get("service") or "unknown"
                    tmpl = r.get("normalized_message") or ""
                    freq_val = r.get("freq")
                    template_freq[(svc, tmpl)] = float(freq_val) if freq_val is not None else 0.0

                q_latency = f"""
                SELECT service, p95_latency_ms
                FROM `{self.project_id}.{self.dataset}.{self.base_latency_table}`
                WHERE baseline_date = DATE("{latest_date}")
                """
                for r in self.bq.query(q_latency).result():
                    svc = r.get("service") or "unknown"
                    p95 = r.get("p95_latency_ms")
                    if p95 is not None:
                        latency_p95[svc] = int(p95)

            q_err = f"""
            SELECT service, error_rate
            FROM `{self.project_id}.{self.dataset}.{self.base_error_table}`
            WHERE window_start = (
              SELECT MAX(window_start)
              FROM `{self.project_id}.{self.dataset}.{self.base_error_table}`
            )
            """
            for r in self.bq.query(q_err).result():
                svc = r.get("service") or "unknown"
                er = r.get("error_rate")
                if er is not None:
                    error_rate[svc] = float(er)

            self._latest_date = latest_date
            self._template_freq = template_freq
            self._latency_p95 = latency_p95
            self._error_rate = error_rate
            self._baselines_available = True

            print(
                f"Loaded baselines: date={self._latest_date}, "
                f"templates={len(self._template_freq)}, "
                f"latency={len(self._latency_p95)}, "
                f"error={len(self._error_rate)}",
                flush=True,
            )

        except (NotFound, Forbidden, BadRequest, GoogleAPICallError) as e:
            self._latest_date = None
            self._template_freq = {}
            self._latency_p95 = {}
            self._error_rate = {}
            self._baselines_available = False
            print(
                f"[WARN] Baselines unavailable; anomaly scoring fallback will be used. Error: {e}",
                flush=True,
            )

        except Exception as e:
            self._latest_date = None
            self._template_freq = {}
            self._latency_p95 = {}
            self._error_rate = {}
            self._baselines_available = False
            print(
                f"[WARN] Unexpected baseline load failure; anomaly scoring fallback will be used. Error: {e}",
                flush=True,
            )

        finally:
            self._last_loaded = now

    def score(
        self,
        service: Optional[str],
        normalized_message: Optional[str],
        severity: Optional[str],
        latency_ms: Optional[int] = None,
    ) -> Tuple[float, str]:
        try:
            self.load_baselines_if_needed()

            if not self._baselines_available:
                return self._fallback_score(severity=severity, latency_ms=latency_ms)

            svc = service or "unknown"
            tmpl = normalized_message or ""
            sev = (severity or "").upper()

            s_template = 0.0
            r_template = "no_template_baseline"

            freq = self._template_freq.get((svc, tmpl), 0.0)
            if freq == 0.0:
                s_template, r_template = 0.9, "new_template"
            elif freq < 0.001:
                s_template, r_template = 0.6, "rare_template"
            else:
                s_template, r_template = 0.1, "common_template"

            s_latency = 0.0
            r_latency = "normal_latency"
            p95 = self._latency_p95.get(svc)
            if latency_ms is not None and p95 is not None and latency_ms > p95:
                s_latency, r_latency = 0.7, "latency_over_p95"

            s_error = 0.0
            r_error = "normal_error_rate"
            er = self._error_rate.get(svc)
            if er is not None and er > 0.2 and sev == "ERROR":
                s_error, r_error = 0.7, "error_spike"

            candidates = [
                (s_template, r_template),
                (s_latency, r_latency),
                (s_error, r_error),
            ]
            score, reason = max(candidates, key=lambda x: x[0])
            return score, reason

        except Exception as e:
            print(
                f"[WARN] Anomaly scoring failed unexpectedly; using fallback score. Error: {e}",
                flush=True,
            )
            return self._fallback_score(severity=severity, latency_ms=latency_ms)

    def _fallback_score(
        self,
        severity: Optional[str],
        latency_ms: Optional[int] = None,
    ) -> Tuple[float, str]:
        sev = (severity or "").upper()

        if sev == "ERROR":
            return 0.5, "fallback_error_severity"
        if sev == "WARN":
            return 0.2, "fallback_warn_severity"
        if latency_ms is not None and latency_ms > 5000:
            return 0.3, "fallback_high_latency"
        return 0.0, "fallback_no_baseline"