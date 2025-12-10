import json
from pathlib import Path
from typing import Any, List
import s3fs
import pandas as pd

from app import config

fs = s3fs.S3FileSystem(anon=False)


def _read_json_file(path: Path) -> Any:
  with path.open("r", encoding="utf-8") as f:
    return json.load(f)


def _read_json_s3(uri: str) -> Any:
  with fs.open(uri, "r") as f:
    return json.load(f)


def load_stats() -> dict:
  if config.USE_S3:
    uri = f"s3://{config.S3_BUCKET}/api/stats.json"
    try:
      return _read_json_s3(uri)
    except Exception:
      pass
  return _read_json_file(config.STATS_FALLBACK_FILE)


def load_pipeline() -> List[dict]:
  if config.USE_S3:
    uri = f"s3://{config.S3_BUCKET}/api/pipeline.json"
    try:
      return _read_json_s3(uri)
    except Exception:
      pass
  return _read_json_file(config.PIPELINE_FALLBACK_FILE)


def load_precomputed_recs(user_id: str) -> List[dict]:
  # Try user-specific first, then shared file; RECS_BASE_PATH can be s3:// or local path.
  paths = []
  if config.RECS_BASE_PATH:
    base = config.RECS_BASE_PATH.rstrip("/") + "/"
    paths.append(base + f"{user_id}.json")
    paths.append(base + "recommendations.json")
  paths.append(str(config.RECS_FALLBACK_FILE))

  for path in paths:
    try:
      if path.startswith("s3://"):
        return _read_json_s3(path)
      else:
        return _read_json_file(Path(path))
    except Exception:
      continue
  return []


def load_games_metadata() -> pd.DataFrame:
  if not config.USE_S3:
    return pd.DataFrame()
  uri = f"s3://{config.S3_BUCKET}/{config.CURATED_PREFIX}/games_clean/v=1"
  try:
    return pd.read_parquet(uri)
  except Exception:
    return pd.DataFrame()
