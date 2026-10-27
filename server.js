
const express = require("express");
const cors = require("cors");
const path = require("path");
const { randomUUID } = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let queue = [];
let servedCount = 0;
let nextToken = 1;

function token() {
  return `BT${String(nextToken++).padStart(3, "0")}`;
}

function activeQueue() {
  return queue.filter(x => x.status === "WAITING" || x.status === "CALLED");
}

function estimateWait() {
  const active = activeQueue();
  if (!active.length) return 0;
  // Prototype assumption: ~7 minutes per group ahead.
  return Math.max(5, active.length * 7);
}

function decorate(item) {
  const active = activeQueue();
  const idx = active.findIndex(x => x.id === item.id);
  return {
    ...item,
    position: idx >= 0 ? idx + 1 : 0,
    groupsAhead: idx >= 0 ? idx : 0,
    estimatedWait: idx >= 0 ? idx * 7 + 5 : 0
  };
}

app.get("/api/health", (req,res) => res.json({ok:true, service:"Blooming Tales SmartQueue"}));

app.get("/api/queue", (req,res) => {
  res.json({
    queue: queue.map(decorate),
    active: activeQueue().map(decorate),
    servedCount
  });
});

app.post("/api/queue", (req,res) => {
  const { name, mobile, partySize } = req.body;
  if (!name || !mobile || !partySize) {
    return res.status(400).json({error:"name, mobile and partySize are required"});
  }

  const item = {
    id: randomUUID(),
    token: token(),
    name: String(name).trim(),
    mobile: String(mobile).trim(),
    partySize: Number(partySize),
    joinedAt: new Date().toISOString(),
    status: "WAITING"
  };

  queue.push(item);
  res.status(201).json(decorate(item));
});

app.patch("/api/queue/:id", (req,res) => {
  const item = queue.find(x => x.id === req.params.id);
  if (!item) return res.status(404).json({error:"Queue entry not found"});

  const { action } = req.body;
  if (!["CALL","SEAT","CANCEL","RESET"].includes(action)) {
    return res.status(400).json({error:"Invalid action"});
  }

  if (action === "CALL") item.status = "CALLED";
  if (action === "SEAT") {
    if (item.status !== "SEATED") servedCount++;
    item.status = "SEATED";
    item.seatedAt = new Date().toISOString();
  }
  if (action === "CANCEL") item.status = "CANCELLED";
  if (action === "RESET") item.status = "WAITING";

  res.json(decorate(item));
});

app.get("/api/analytics", (req,res) => {
  const active = activeQueue();
  const served = queue.filter(x => x.status === "SEATED");
  const cancelled = queue.filter(x => x.status === "CANCELLED");
  const avgWait = served.length
    ? Math.round(served.reduce((sum,x) => {
        if (!x.seatedAt) return sum;
        return sum + ((new Date(x.seatedAt)-new Date(x.joinedAt))/60000);
      },0) / served.length)
    : 0;

  res.json({
    queueSize: active.length,
    servedToday: servedCount,
    cancelledToday: cancelled.length,
    averageWaitMinutes: avgWait || 0,
    peakWindow: "7:00 PM – 9:00 PM",
    note: "Peak window is a project/demo assumption until real café data is collected."
  });
});

app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SmartQueue running on http://localhost:${PORT}`));
