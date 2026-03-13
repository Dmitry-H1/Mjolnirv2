from fastapi import FastAPI
from api.routes.incidents import router as incident_router
from api.routes.logs_api import router as logs_router
from api.routes.metrics_api import router as metrics_router

app = FastAPI(title="Mjolnir API")

app.include_router(incident_router, prefix="/incidents")
app.include_router(logs_router, prefix="/logs")
app.include_router(metrics_router, prefix="/metrics")
