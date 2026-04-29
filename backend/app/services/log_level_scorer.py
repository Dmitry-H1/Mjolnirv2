from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

FEATURE_WEIGHTS: dict[str, float] = {
    "severity":        0.30,
    "message_entropy": 0.20,
    "stack_depth":     0.15,
    "message_length":  0.10,
    "error_keywords":  0.15,
    "numeric_density": 0.10,
}

assert abs(sum(FEATURE_WEIGHTS.values()) - 1.0) < 1e-9, "Weights must sum to 1.0"

SEVERITY_SCORES: dict[str, float] = {
    "fatal":    1.00,
    "critical": 0.95,
    "error":    0.80,
    "warn":     0.40,
    "warning":  0.40,
    "info":     0.05,
    "debug":    0.02,
    "trace":    0.01,
}

ERROR_KEYWORDS: frozenset[str] = frozenset({
    "exception", "traceback", "stacktrace", "null pointer", "segfault",
    "out of memory", "oom", "timeout", "connection refused", "refused",
    "deadlock", "panic", "fatal", "corrupt", "undefined", "assertion",
    "unhandled", "unexpected", "critical", "abort", "crash",
})


@dataclass
class LogScoreResult:
    score: float                          # final combined score in [0, 1]
    sub_scores: dict[str, float] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "log_anomaly_score": round(self.score, 6),
            "log_score_reasons": ",".join(self.reasons) if self.reasons else "",
            **{f"log_sub_{k}": round(v, 4) for k, v in self.sub_scores.items()},
        }



def _score_severity(severity: str | None) -> tuple[float, list[str]]:
    """Higher severity → higher anomaly score."""
    if not severity:
        return 0.10, []
    key = severity.strip().lower()
    s = SEVERITY_SCORES.get(key, 0.05)
    reasons = [f"severity:{key}"] if s >= 0.80 else []
    return s, reasons


def _score_message_entropy(message: str | None) -> tuple[float, list[str]]:

    #Shannon entropy of character distribution.

    if not message or len(message) < 4:
        return 0.0, []

    text = message[:500]
    counts: dict[str, int] = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1

    n = len(text)
    entropy = -sum((c / n) * math.log2(c / n) for c in counts.values())

    # Normal range: [3.5, 4.8]. Outside → anomalous.
    if entropy < 2.0:
        s = 1.0 - (entropy / 2.0)          # very low → score near 1
        return min(s, 1.0), ["low_entropy"]
    if entropy > 5.5:
        s = (entropy - 5.5) / 2.0          # very high → score rises
        return min(s, 1.0), ["high_entropy"]

    return 0.0, []


def _score_stack_depth(message: str | None) -> tuple[float, list[str]]:

    #More frames → more anomalous (errors with deep stacks are unusual).
    #Score saturates at 10 frames

    if not message:
        return 0.0, []

    frame_pattern = re.compile(
        r'^\s*at\s+\S+|'           
        r'^\s*File\s+"[^"]+",\s+line\s+\d+|'  # Python
        r'^\s*\w[\w.]+\.[a-zA-Z_]+\(.*\)$',   # generic
        re.MULTILINE,
    )
    depth = len(frame_pattern.findall(message))
    if depth == 0:
        return 0.0, []

    s = min(depth / 10.0, 1.0)
    return s, [f"stack_depth:{depth}"]


def _score_message_length(message: str | None) -> tuple[float, list[str]]:

    #long messages (heap dumps) are unusual.

    if not message:
        return 0.0, []
    n = len(message)
    if n <= 500:
        return 0.0, []
    s = min((n - 500) / 4500.0, 1.0)
    return s, ["long_message"] if s > 0.3 else []


def _score_error_keywords(message: str | None) -> tuple[float, list[str]]:

    #each keyword adds 0.25, saturating at 1.0.

    if not message:
        return 0.0, []

    lower = message.lower()
    found = [kw for kw in ERROR_KEYWORDS if kw in lower]
    if not found:
        return 0.0, []

    s = min(len(found) * 0.25, 1.0)
    return s, [f"keyword:{kw}" for kw in found[:4]]     # cap reason list


def _score_numeric_density(message: str | None) -> tuple[float, list[str]]:
    #ratio of numeric characters in the message.
    if not message or len(message) < 10:
        return 0.0, []

    digits = sum(1 for ch in message if ch.isdigit())
    ratio = digits / len(message)
    if ratio < 0.40:
        return 0.0, []

    s = min((ratio - 0.40) / 0.40, 1.0)
    return s, ["high_numeric_density"]



def score_log(
    severity: str | None,
    message: str | None,
    normalized_message: str | None = None,
) -> LogScoreResult:

    #compute a per-log anomaly score in [0, 1].


    text = normalized_message if normalized_message else message

    scorers = {
        "severity":        lambda: _score_severity(severity),
        "message_entropy": lambda: _score_message_entropy(text),
        "stack_depth":     lambda: _score_stack_depth(message),   # raw msg for frame detection
        "message_length":  lambda: _score_message_length(message),
        "error_keywords":  lambda: _score_error_keywords(text),
        "numeric_density": lambda: _score_numeric_density(message),
    }

    sub_scores: dict[str, float] = {}
    all_reasons: list[str] = []

    for name, fn in scorers.items():
        s, reasons = fn()
        sub_scores[name] = s
        all_reasons.extend(reasons)

    final = sum(FEATURE_WEIGHTS[k] * v for k, v in sub_scores.items())
    final = max(0.0, min(final, 1.0))

    return LogScoreResult(score=final, sub_scores=sub_scores, reasons=all_reasons)
