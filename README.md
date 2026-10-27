Blooming Tales SmartQueue — Backend Prototype
Requirements
Node.js 18+ (20+ recommended)
npm
Run
Open a terminal in this folder.
Run:
npm install
npm start
Open:
http://localhost:3000
API
GET  /api/health
GET  /api/queue
POST /api/queue
PATCH /api/queue/:id   body: {"action":"CALL|SEAT|CANCEL|RESET"}
GET  /api/analytics
Notes
This is a demonstration backend. It stores data in memory, so restarting the server clears the queue.
The ETA uses a simple prototype assumption of approximately 7 minutes per group ahead. Replace this with measured historical data in a production system.
