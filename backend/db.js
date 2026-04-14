require("dotenv").config(); // This loads hidden internet settings
const mysql = require("mysql2");

// If Render gives it an internet link (DATABASE_URL), use it.
// If not, use your local computer details!
const db = process.env.DATABASE_URL 
  ? mysql.createConnection(process.env.DATABASE_URL) 
  : mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "root123",
      database: "ecommerce_db"
    });

db.connect((err) => {
  if (err) {
    console.error("MySQL connection failed:", err);
  } else {
    console.log("MySQL Connected Successfully");
  }
});

module.exports = db;