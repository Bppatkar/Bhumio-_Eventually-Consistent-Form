import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './db/db.js';
import cors from 'cors';
import { submitForm, getSubmissions, checkDuplicate } from "./controllers/fromController.js"

connectDB();
const app = express();
const PORT = 8000 || process.env.PORT;

app.use(cors());
app.use(express.json());


// Routes
app.post('/api/submit', submitForm);
app.get('/api/submissions', getSubmissions);
app.post('/api/check-duplicate', checkDuplicate);

// health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
})

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
  console.log(`📝 Form API: POST http://localhost:${PORT}/api/submit`);
  console.log(`📊 Check submissions: GET http://localhost:${PORT}/api/submissions\n`);
});