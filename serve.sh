#!/bin/bash
cd /home/z/my-project
while true; do
  echo "[$(date)] Starting CrewTracker..."
  npx next start --port 3000 2>&1
  echo "[$(date)] Server exited. Restarting in 2s..."
  sleep 2
done
