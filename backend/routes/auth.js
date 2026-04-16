const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router(); // ✅ THIS WAS MISSING

/* ======================
   REGISTER
====================== */
router.post("/register", async (req, res) => {
  console.log("REGISTER API HIT");
  console.log(req.body);

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 🚀 FIX: Ensure email is stored in lowercase so login matching works perfectly
    const safeEmail = email.toLowerCase(); 

    const sql =
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";

    db.query(sql, [name, safeEmail, hashedPassword], (err) => {
      if (err) {
        console.log("DB ERROR:", err);
        return res.status(400).json({ message: "User already exists" });
      }

      res.json({ message: "User registered successfully" });
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ======================
   LOGIN
====================== */
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email.toLowerCase()], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🚀 FIX: Use environment variable for JWT secret in production
    const jwtSecret = process.env.JWT_SECRET || "SECRET_KEY";

    const token = jwt.sign(
      { id: user.id },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
});

module.exports = router;