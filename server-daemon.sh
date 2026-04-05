#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next start --port 3000 >> /tmp/crewtracker.log 2>&1
  echo "[$(date)] Restarting..." >> /tmp/crewtracker.log
  sleep 2
done
