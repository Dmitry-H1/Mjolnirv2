from fastapi import FastAPI
from app.api.routes.incidents import router as incident_router

app = FastAPI(title="Mjolnir API")

app.include_router(incident_router, prefix="/incidents")
