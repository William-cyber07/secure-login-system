import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { testConnection } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import twoFactorRoutes from './routes/twoFactorRoutes.js';   // ← import here (top)
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

dotenv.config();

const app = express();                                        // ← app created HERE

// --- Security middleware ---
app.use(helmet());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// --- Routes (AFTER app exists) ---
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Backend running' }));
app.use('/api/auth', authRoutes);
app.use('/api/2fa', twoFactorRoutes);                         // ← use here
app.use('/api/users', userRoutes); 
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);
                  
// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// --- Start server ---
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
})();