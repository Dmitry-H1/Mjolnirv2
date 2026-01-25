from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.incident import Incident

router = APIRouter()

@router.get("/")
def list_incidents(db: Session = Depends(get_db)):
    return (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .all()
    )
