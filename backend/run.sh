#!/usr/bin/env bash
# Simple runner to start FastAPI without watching the virtualenv
uvicorn app.main:app --host 0.0.0.0 --port 8001
