import json
from app.models.incident import Incident
from app.db.session import SessionLocal

def create_incident(log: dict, detection: dict):
    db = SessionLocal()

    incident = Incident(
        service=log.get("service"),
        severity=log.get("severity", 0),
        summary=log.get("message", "")[:256],
        detection=json.dumps(detection),
        status="OPEN"
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)
    db.close()

    return incident
