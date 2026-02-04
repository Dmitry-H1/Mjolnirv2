from fastapi import FastAPI
from api.routes.incidents import router as incident_router
from api.routes.logs_api import router as logs_router

app = FastAPI(title="Mjolnir API")

app.include_router(incident_router, prefix="/incidents")
app.include_router(logs_router, prefix="/logs")
