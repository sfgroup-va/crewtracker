#!/bin/bash
while true; do
  echo "[$(date)] Starting CrewTracker server..."
  cd /home/z/my-project
  npx next start --port 3000 2>&1 | tee /tmp/next-prod.log
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
