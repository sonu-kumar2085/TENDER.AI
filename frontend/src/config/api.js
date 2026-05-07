// Central API configuration
// In production, VITE_API_URL is set as an environment variable on Vercel
// In development, it falls back to localhost:5000
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default API_BASE;
