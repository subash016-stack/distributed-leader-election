import os
from typing import Any, Dict

import pandas as pd
from experiments.run_experiment import RESULTS_DIR
from fastapi import APIRouter

router = APIRouter(prefix="/metrics", tags=["Metrics"])


@router.get("")
def get_performance_metrics() -> Dict[str, Any]:
    """Retrieve benchmark metrics table and speedup data."""
    csv_path = os.path.join(RESULTS_DIR, "benchmark_results.csv")
    if os.path.exists(csv_path):
        df = pd.read_csv(csv_path)
        return {"metrics": df.to_dict(orient="records"), "csv_available": True}
    return {"metrics": [], "csv_available": False}
