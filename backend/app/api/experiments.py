import json
import os
from typing import Any, Dict, List

import pandas as pd
from experiments.run_experiment import RESULTS_DIR, experiment_runner
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/experiments", tags=["Experiments"])


class ExperimentRunRequest(BaseModel):
    subgraph_size: int = 10
    num_ranks: int = 2
    seed: int = 42
    failed_nodes: List[int] = []
    enable_threading: bool = True


@router.post("/run")
def run_experiment_scenario(request: ExperimentRunRequest) -> Dict[str, Any]:
    """Execute a distributed election scenario across MPI ranks."""
    try:
        result = experiment_runner.run_scenario(
            subgraph_size=request.subgraph_size,
            num_ranks=request.num_ranks,
            seed=request.seed,
            failed_nodes=request.failed_nodes,
            enable_threading=request.enable_threading,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
def list_experiments() -> Dict[str, Any]:
    """Retrieve summary of experiment benchmarks."""
    csv_path = os.path.join(RESULTS_DIR, "benchmark_results.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        return {"total_runs": len(df), "benchmarks": df.to_dict(orient="records")}
    return {"total_runs": 0, "benchmarks": []}


@router.get("/latest")
def get_latest_experiment() -> Dict[str, Any]:
    """Retrieve latest experiment scenario output."""
    latest_path = os.path.join(RESULTS_DIR, "latest_run.json")
    if os.path.exists(latest_path):
        with open(latest_path, "r") as f:
            return json.load(f)
    return {}
