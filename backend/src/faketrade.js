db.trades.insertOne({
  signal: "BUY",
  status: "ACTIVE",
  result: "OPEN",
  entry: 100000,
  stopLoss: 90000,
  takeProfit1: 101000,
  takeProfit2: 102000,
  score: 70,
  openTime: Date.now()
})