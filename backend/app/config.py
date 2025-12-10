import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

S3_BUCKET = os.getenv("S3_BUCKET", "steam-reco-team-yw1204")
CURATED_PREFIX = os.getenv("CURATED_PREFIX", "curated")
RECS_BASE_PATH = os.getenv("RECS_BASE_PATH", f"s3://{S3_BUCKET}/api/recommendations/")
USE_S3 = os.getenv("USE_S3", "0") == "1"
MOCK_DIR = BASE_DIR / "mock"

RECS_FALLBACK_FILE = MOCK_DIR / "recommendations.json"
STATS_FALLBACK_FILE = MOCK_DIR / "stats.json"
PIPELINE_FALLBACK_FILE = MOCK_DIR / "pipeline.json"

DEFAULT_LIMIT = int(os.getenv("DEFAULT_LIMIT", "20"))
MAX_LIMIT = int(os.getenv("MAX_LIMIT", "50"))
