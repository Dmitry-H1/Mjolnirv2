from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    service = Column(String, index=True)
    severity = Column(Integer)
    summary = Column(String)
    detection = Column(Text)
    status = Column(String, default="OPEN")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
