import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './db/db.js';
import cors from 'cors';
import { submitForm, getSubmissions, checkDuplicate } from "./controllers/fromController.js"

connectDB();
const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://bhumio-client.vercel.app'
  ],
  credentials: true
}));
app.use(express.json());


// POST Routes
app.post('/api/submit', submitForm);
app.post('/api/check-duplicate', checkDuplicate);

// GET Routes
app.get('/api/submissions', getSubmissions);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (req, res) => {
  res.json({
    message: 'Eventually Consistent Form API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      submit: 'POST /api/submit',
      checkDuplicate: 'POST /api/check-duplicate',
      submissions: 'GET /api/submissions'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`📝 Submit form: POST http://localhost:${PORT}/api/submit`);
  console.log(`🔍 Check duplicate: POST http://localhost:${PORT}/api/check-duplicate`);
  console.log(`📊 Get submissions: GET http://localhost:${PORT}/api/submissions`);
  console.log(`ℹ️  API info: GET http://localhost:${PORT}\n`);
});