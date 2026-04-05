#!/bin/bash
cd /home/z/my-project

# Kill any existing Next.js
pkill -f "next dev" 2>/dev/null
sleep 2
rm -rf .next

# Start Next.js in background
npx next dev --port 3000 > /tmp/nextdev.log 2>&1 &
NPID=$!
echo "Next.js PID: $NPID"

# Wait for it to be ready
sleep 10

# Keep alive by pinging every 5 seconds
while kill -0 $NPID 2>/dev/null; do
  sleep 5
  curl -s --max-time 5 http://localhost:3000/ > /dev/null 2>&1 || {
    echo "$(date): Server died, restarting..." >> /tmp/nextdev.log
    npx next dev --port 3000 > /tmp/nextdev.log 2>&1 &
    NPID=$!
    sleep 10
  }
done
