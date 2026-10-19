import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Load the Aiven CA certificate
const caPath = path.join(process.cwd(), 'ca.pem');
let sslConfig = { rejectUnauthorized: false }; // Fallback

if (fs.existsSync(caPath)) {
  sslConfig = {
    ca: fs.readFileSync(caPath),
    rejectUnauthorized: true
  };
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  multipleStatements: false,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log('✅ MySQL connected');
  } finally {
    conn.release();
  }
}