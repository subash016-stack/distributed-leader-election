import logging
import os
import sys
from contextlib import asynccontextmanager

# Ensure workspace root and backend are in sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_current_dir, ".."))
_workspace_dir = os.path.abspath(os.path.join(_backend_dir, ".."))
for _p in [_workspace_dir, _backend_dir]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import dataset, elections, events, experiments, health, metrics, nodes, simulation, topology
from app.config import settings
from app.services.simulation_service import simulation_service
from app.websocket import events as ws_events

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
)
logger = logging.getLogger("Main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Distributed Leader Election Backend initializing...")
    yield
    logger.info("Distributed Leader Election Backend shutting down...")
    await simulation_service.stop()


app = FastAPI(
    title="Distributed Leader Election API",
    description="Backend API, SNAP Gnutella Dataset, and MPI/Multithreading Orchestrator for Parallel & Distributed Systems",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static plots and reports directory
plots_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "experiments", "plots"))
if os.path.exists(plots_dir):
    app.mount("/plots", StaticFiles(directory=plots_dir), name="plots")

reports_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "reports"))
if os.path.exists(reports_dir):
    app.mount("/reports", StaticFiles(directory=reports_dir), name="reports")

# Include API routes
app.include_router(health.router, prefix="/api")
app.include_router(dataset.router, prefix="/api")
app.include_router(experiments.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(topology.router, prefix="/api")
app.include_router(elections.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(ws_events.router)


@app.get("/")
async def root():
    return {
        "title": "Distributed Leader Election in Networked Systems Using MPI and Multithreading",
        "dataset": "Stanford SNAP p2p-Gnutella08",
        "docs": "/docs",
        "health": "/api/health",
        "dataset_info": "/api/dataset/info",
    }
