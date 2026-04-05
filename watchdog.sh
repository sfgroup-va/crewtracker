#!/bin/bash
cd /home/z/my-project

while true; do
  npx next start --port 3000 >> /tmp/server.log 2>&1 &
  PID=$!
  echo "$(date): Started PID $PID" >> /tmp/watchdog.log
  
  # Aggressive ping every 2 seconds
  while kill -0 $PID 2>/dev/null; do
    sleep 2
    curl -s --max-time 2 http://localhost:3000/ > /dev/null 2>&1
  done
  
  echo "$(date): Died, restarting now" >> /tmp/watchdog.log
  kill $PID 2>/dev/null
  sleep 1
done
