from datetime import datetime, timezone

def to_iso_z(dt: datetime) -> str:
    """
    Convert a datetime to ISO 8601 string with Z (UTC).
    Example: 2026-02-20T07:11:31.210Z
    """
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"