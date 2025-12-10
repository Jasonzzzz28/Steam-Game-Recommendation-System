# Steam Recommendation Backend (FastAPI)

Purpose: expose `/stats`, `/pipeline`, `/recommendations` for the React frontend. Reads S3 (curated Parquet / precomputed JSON) or falls back to local mock data. The heavy PySpark pipeline from `Steam_Recommendation_System_Final.ipynb` is moved into `app/jobs/notebook_reco.py` so you can run it offline to refresh recommendations and publish JSON to S3.

## Quick start
```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Then set frontend env: `VITE_API_BASE_URL=http://localhost:8000` and run the React app.

## Environment variables
- `S3_BUCKET` (default `steam-reco-team-yw1204`)
- `CURATED_PREFIX` (default `curated`)
- `RECS_BASE_PATH` (S3 prefix or local file for precomputed recs JSON/Parquet)
- `USE_S3` ("1" to fetch from S3; else use local mock)
- AWS creds: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or use role/instance profile)

## Endpoints
- `GET /health` -> `{status: "ok"}`
- `GET /stats` -> counts + trends (from S3 or mock)
- `GET /pipeline` -> pipeline stage status
- `GET /recommendations?userId=<id>&limit=<n>&language=<lang>&platform=<os>&priceCap=<max>` -> list of recommendations

## Notebook pipeline -> backend
- `app/jobs/notebook_reco.py` contains the PySpark + sklearn item-based KNN/content-blend logic from `Steam_Recommendation_System_Final.ipynb`.
- Run it in Colab/EMR to produce `data/recommendations.json` (or Parquet) and upload to `s3://<bucket>/api/recommendations/`.
- The API then serves those precomputed results without re-training at request time.

## Project layout
- `app/main.py` FastAPI app and routes
- `app/schemas.py` Pydantic models for request/response
- `app/services/data_access.py` S3/local readers for stats/pipeline/recs
- `app/services/recommender.py` lightweight recommender wrapper (reads precomputed recs; placeholder for live scoring)
- `app/jobs/notebook_reco.py` offline training/generation based on the notebook
- `app/mock/` sample JSON for local dev
