// Central API configuration
// Priority:
// 1) VITE_API_URL env var (if provided)
// 2) Production default -> deployed Render backend
// 3) Development default -> local backend
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://tender-ai-1-292p.onrender.com'
    : 'http://localhost:5000');

export default API_BASE;
