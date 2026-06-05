import mysql from "mysql2/promise";
import "dotenv/config";

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(config);
  }
  return pool;
}
