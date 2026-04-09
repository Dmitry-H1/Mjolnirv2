import { severityColor, severityBg } from "@/lib/format";

interface Props {
  severity?: string | null;
}

export default function SeverityBadge({ severity }: Props) {
  if (!severity) {
    return <span style={{ color: "var(--muted)" }}>—</span>;
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold uppercase tracking-wide"
      style={{
        background: severityBg(severity),
        color: severityColor(severity),
      }}
    >
      {severity}
    </span>
  );
}
