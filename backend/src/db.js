import mysql from "mysql2/promise";
import { config } from "./config.js";

// Datetimes are stored as UTC (the schema was created by Django with
// USE_TZ=True), so the driver must read and write them as UTC too.
export const pool = mysql.createPool({
  ...config.db,
  charset: "utf8mb4",
  timezone: "Z",
  dateStrings: false,
  waitForConnections: true,
  connectionLimit: 5,
  enableKeepAlive: true,
});

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
