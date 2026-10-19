import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); 

// --- Security middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// --- Routes ---
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Backend running' }));
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// --- Start server (verify DB first) ---
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await testConnection();
    // 👇 THE CRITICAL FIX: Adding '0.0.0.0' lets Render talk to your app
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
    } catch (err) {
    console.error('❌ Failed to start:', err); // Print the FULL error object
    process.exit(1);
  }
})();