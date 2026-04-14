const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const ordersRoutes = require("./routes/orders");

const app = express();

app.use(cors());
app.use(express.json());

app.use("https://procart-ai.onrender.com/api/auth/register", authRoutes);
app.use("/api/orders", ordersRoutes); // ✅ BEFORE listen

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
