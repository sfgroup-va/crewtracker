const { createServer } = require('http');
const { parse } = require('url');

// Simple reverse proxy + health check to keep Next.js alive
const NEXT_PORT = 3000;
const PROXY_PORT = 3000;

// This script replaces the need for a watchdog by keeping
// the Next.js process active with internal pings

const http = require('http');

// Health ping interval
setInterval(() => {
  http.get('http://localhost:3000/api/setup', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // silently consume
    });
  }).on('error', () => {
    // silently ignore - process might be starting
  });
}, 2000);

console.log('Health pinger started - pinging every 2s');
