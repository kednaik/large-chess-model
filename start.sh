#!/bin/bash
set -e

echo "Downloading model weights from S3..."
mkdir -p /app/checkpoints/run_20260313_133630
aws s3 cp s3://large-chess-model-weights-kednaik/chess_vit_latest.pt /app/checkpoints/run_20260313_133630/chess_vit_latest.pt

echo "Starting FastAPI server..."
cd /app/model
exec python -m uvicorn api:app --host 0.0.0.0 --port 8000
