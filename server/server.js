import express, { json } from 'express';
import cors from 'cors';
import { submit } from './controllers/formController';

const app = express();
const PORT = 8000 || process.env.PORT;

app.use(cors());
app.use(json());

// Routes
app.post('/api/submit', submit);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});