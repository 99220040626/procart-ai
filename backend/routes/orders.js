const express = require("express");
const router = express.Router();
const db = require("../db");

/* ===============================
   PLACE ORDER
=============================== */
router.post("/", (req, res) => {
  console.log("ORDER API HIT");
  console.log(req.body);

  const { userId, total, items } = req.body;

  if (!userId || !total || !items || items.length === 0) {
    return res.status(400).json({ message: "Invalid order data" });
  }

  // 🚀 FIX: Added Database Transaction
  // If order items fail to save, the entire order is rolled back so you don't get empty ghost orders!
  db.beginTransaction((transactionErr) => {
    if (transactionErr) {
      console.error("TRANSACTION START ERROR:", transactionErr);
      return res.status(500).json({ message: "Order processing failed to start" });
    }

    const orderSql =
      "INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)";

    db.query(orderSql, [userId, total, "Placed"], (err, orderResult) => {
      if (err) {
        return db.rollback(() => {
          console.error("ORDER INSERT ERROR:", err);
          res.status(500).json({ message: "Order failed" });
        });
      }

      const orderId = orderResult.insertId;

      /* ===============================
         SAVE ORDER ITEMS
      ================================ */
      const itemSql =
        "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES ?";

      const values = items.map((item) => [
        orderId,
        item.id,
        item.name,
        item.price,
        item.qty,
      ]);

      db.query(itemSql, [values], (err) => {
        if (err) {
          return db.rollback(() => {
            console.error("ORDER ITEMS ERROR:", err);
            res.status(500).json({ message: "Order items failed" });
          });
        }

        // 🚀 FIX: Commit the transaction only if BOTH queries succeed
        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              console.error("COMMIT ERROR:", commitErr);
              res.status(500).json({ message: "Failed to finalize order" });
            });
          }

          res.json({
            message: "Order placed successfully",
            orderId,
          });
        });
      });
    });
  });
});

/* ===============================
   GET ORDERS BY USER
=============================== */
router.get("/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      id,
      total,
      status,
      created_at
    FROM orders
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, orders) => {
    if (err) {
      console.error("FETCH ORDERS ERROR:", err);
      return res.status(500).json({ message: "Failed to fetch orders" });
    }

    res.json(orders);
  });
});

module.exports = router;