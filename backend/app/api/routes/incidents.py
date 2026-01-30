from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
'''from db.session import get_db'''
from models.incident import Incident

router = APIRouter()

'''@router.get("/")
def list_incidents(db: Session = Depends(get_db)):
    return (
        db.query(Incident)
        .order_by(Incident.created_at.desc())
        .all()
    )'''

@router.get("/")
def test():
    return "It works!"

<<<<<<< HEAD
def gihubztestz():
    return "githubztestz"
=======
def testGit():
    return 'fffff'
>>>>>>> b31079976141b017c57eb4ad1dcd80e47a1f4ea3
