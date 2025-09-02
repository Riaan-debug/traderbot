const axios = require('axios');

// Validate required environment variables
const requiredEnvVars = ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY', 'ALPACA_BASE_URL'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Create authenticated Axios instance for Alpaca API
const alpacaApi = axios.create({
  baseURL: process.env.ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
    'Content-Type': 'application/json'
  },
  timeout: 10000 // 10 second timeout
});

// Add request interceptor for logging
alpacaApi.interceptors.request.use(
  (config) => {
    console.log(`Making request to Alpaca API: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Alpaca API request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
alpacaApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('Alpaca API error response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      console.error('Alpaca API request timeout or network error');
    } else {
      console.error('Alpaca API error:', error.message);
    }
    return Promise.reject(error);
  }
);

module.exports = alpacaApi;

