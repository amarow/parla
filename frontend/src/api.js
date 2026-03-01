const isProd = import.meta.env.PROD;
export const API_BASE = isProd ? '/parla/api' : 'http://localhost:3001/api';
export const BASE_URL = isProd ? '/parla' : 'http://localhost:3001';
