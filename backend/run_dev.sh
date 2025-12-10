#!/usr/bin/env bash
# Dev runner with reload but ignoring .venv
uvicorn app.main:app --reload --port 8001 --reload-dir app --reload-exclude ".venv/*"
