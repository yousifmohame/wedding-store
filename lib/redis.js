// lib/redis.js
import { createClient } from 'redis';

let redis;
if (process.env.REDIS_URL) {
  redis = createClient({
    url: process.env.REDIS_URL
  });
  
  redis.on('error', (err) => console.log('Redis Client Error', err));
  
  await redis.connect();
} else {
  console.warn('REDIS_URL not set, using mock Redis');
  // Simple in-memory mock for development
  redis = {
    async set(key, value, options) {
      // Mock implementation
    },
    async get(key) {
      // Mock implementation
      return null;
    }
  };
}

export default redis;