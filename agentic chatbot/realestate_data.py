import os
from pathlib import Path
from typing import Optional

import pandas as pd

from normalize import prepare_district_dataframe
from scoringfunction import add_composite_scores

# Merged district + school + crime + price data (see data/merged_dataset.csv)
DEFAULT_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "merged_dataset.csv"


def load_district_dataframe(csv_path: Optional[str] = None) -> pd.DataFrame:
    """Load raw district CSV, normalize features, and add composite scores."""
    path = csv_path or os.environ.get("REALESTATE_DATA_PATH", str(DEFAULT_DATA_PATH))
    df = pd.read_csv(path)
    df = prepare_district_dataframe(df)
    df = add_composite_scores(df)
    return df
