import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Connection pool — reused across requests (faster + safer than new connections)
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Always return DATETIME columns as JS strings (avoids timezone surprises)
  dateStrings: true,

  // Reject multiple statements in one query — defense vs SQL injection
  multipleStatements: false,
});

// Small helper for readability — always use parameterized queries
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Connectivity test — call this once on server startup
export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
    console.log('✅ MySQL connected');
  } finally {
    conn.release();
  }
}