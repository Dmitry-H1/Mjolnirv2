LEGACY_LOG_SCHEMA_CONVERSION_SAMPLE_SIZE = 2

SEVERITY_PATTERNS = {
    "CRITICAL": [
        r"\bcritical\b",
        r"\bpanic\b",
        r"\bfatal\b",
        r"\bsystem crash\b"
    ],
    "ERROR": [
        r"\berror\b",
        r"\bexception\b",
        r"\bfailed\b",
        r"\btimeout\b"
    ],
    "WARNING": [
        r"\bwarn\b",
        r"\bwarning\b",
        r"\bdeprecated\b",
        r"\bretry\b"
    ],
    "INFO": [
        r"\binfo\b",
        r"\bstarted\b",
        r"\bcompleted\b",
        r"\bsuccess\b"
    ],
    "DEBUG": [
        r"\bdebug\b",
        r"\btrace\b"
    ]
}
