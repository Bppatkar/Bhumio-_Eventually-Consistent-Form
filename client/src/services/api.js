import axios from 'axios';

import { v4 as uuidv4 } from 'uuid';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000
});

// Idempotency key generator
const generateIdempotencyKey = () => uuidv4();

export const submitFormData = async (formData) => {
  const idempotencyKey = generateIdempotencyKey();

  try {
    const response = await api.post('/submit', {
      email: formData.email,
      amount: parseFloat(formData.amount),
      idempotencyKey
    });

    return {
      success: true,
      data: response.data,
      idempotencyKey
    };
  } catch (error) {
    const errorMessage = error.response?.data?.error ||
      error.message ||
      'Failed to submit form';

    return {
      success: false,
      error: errorMessage,
      status: error.response?.status,
      idempotencyKey
    };
  }
};


export const checkDuplicateSubmission = async (email, amount) => {
  try {
    const response = await api.post('/check-duplicate', {
      email,
      amount: parseFloat(amount)
    });

    return response.data;
  } catch (error) {
    console.error('Duplicate check failed:', error);
    return { isDuplicate: false };
  }
};

// Fetch all submissions (for admin/monitoring)
export const fetchSubmissions = async () => {
  try {
    const response = await api.get('/submissions');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    return { submissions: [], total: 0 };
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    return null;
  }
};

export default api;
