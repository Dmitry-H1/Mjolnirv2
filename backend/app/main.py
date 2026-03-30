from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.incidents import router as incident_router
from api.routes.logs_api import router as logs_router
from api.routes.metrics_api import router as metrics_router
from api.routes.auth_api import router as auth_router

app = FastAPI(title="Mjolnir API")

# -----------------------
# CORS CONFIGURATION
# -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# ROUTES
# -----------------------
app.include_router(incident_router, prefix="/incidents")
app.include_router(logs_router, prefix="/logs")
app.include_router(metrics_router, prefix="/metrics")
app.include_router(auth_router, prefix="/auth")