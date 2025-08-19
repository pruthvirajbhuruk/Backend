const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

function loadData() {
  try {
    return JSON.parse(fs.readFileSync("database.json"));
  } catch {
    return { users: {} };
  }
}
function saveData(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2));
}

// Register user
app.post("/register", (req, res) => {
  const { id, username } = req.body;
  const data = loadData();
  if (!data.users[id]) {
    data.users[id] = {
      username,
      plan: null,
      amount: 0,
      next_payout: null,
      ref_by: null,
      ref_earn: 0,
      ref_count: 0,
    };
    saveData(data);
  }
  res.json({ success: true, user: data.users[id] });
});

// Submit investment
app.post("/invest", (req, res) => {
  const { id, plan, amount, txn_hash } = req.body;
  const data = loadData();
  if (!data.users[id]) return res.status(400).json({ error: "User not found" });

  data.users[id].plan = plan;
  data.users[id].amount = amount;
  data.users[id].txn_hash = txn_hash;

  const WALLET_ADDRESS = "TNH9tQy2UAipH9ECQDaHPkAA13Np2nS5bV";
  saveData(data);
  res.json({ success: true, wallet: WALLET_ADDRESS });
});

// Approve investment (Admin)
app.post("/approve", (req, res) => {
  const { admin, user_id, amount } = req.body;
  if (admin !== "Pruthvirajbhuruk") return res.status(403).json({ error: "Unauthorized" });

  const data = loadData();
  if (!data.users[user_id]) return res.status(400).json({ error: "User not found" });

  data.users[user_id].approved = true;
  const nextPayout = new Date();
  nextPayout.setDate(nextPayout.getDate() + 30);
  data.users[user_id].next_payout = nextPayout.toISOString().split("T")[0];

  const ref_by = data.users[user_id].ref_by;
  if (ref_by && data.users[ref_by]) {
    data.users[ref_by].ref_earn += amount * 0.01;
    data.users[ref_by].ref_count += 1;
  }

  saveData(data);
  res.json({ success: true, user: data.users[user_id] });
});

// Get portfolio
app.get("/portfolio/:id", (req, res) => {
  const data = loadData();
  const user = data.users[req.params.id];
  if (!user) return res.status(400).json({ error: "User not found" });
  res.json(user);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
