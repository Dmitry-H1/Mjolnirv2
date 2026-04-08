import type { LogRecord } from "@/lib/contracts";

export function buildLogInsights(log: LogRecord) {
  const combined = `${log.normalized_message || ""} ${log.message || ""}`.toLowerCase();
  const score = log.anomaly_score || 0;

  let probableCause = "The service is reporting an unusual runtime pattern.";
  let nextAction = "Review recent deploys, dependency health, and related service logs.";

  if (combined.includes("timeout")) {
    probableCause = "A downstream dependency or network path is likely responding too slowly.";
    nextAction = "Check latency on upstream services and confirm autoscaling is keeping up.";
  } else if (combined.includes("connection refused")) {
    probableCause = "The target service may be unavailable or rejecting traffic.";
    nextAction = "Verify connectivity, pod health, and service discovery configuration.";
  } else if (combined.includes("memory")) {
    probableCause = "The workload may be under memory pressure or restarting under load.";
    nextAction = "Inspect memory limits, restart counts, and heap-related telemetry.";
  } else if (score > 0.8) {
    probableCause = "The backend marked this event as a high-confidence anomaly.";
    nextAction = "Compare this record with surrounding logs to isolate what changed.";
  }

  return [
    {
      title: "Simplified issue",
      body: `${log.service || "This service"} reported ${
        log.anomaly_reason?.replaceAll("_", " ") || "an unusual event"
      } and should be treated as a potentially actionable signal.`,
    },
    {
      title: "Probable cause",
      body: probableCause,
    },
    {
      title: "Recommended next step",
      body: nextAction,
    },
  ];
}
