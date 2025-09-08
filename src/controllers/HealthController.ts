import { Elysia } from 'elysia';
import { db } from '../database/connection';

export const healthController = new Elysia()
  .get('/health', async () => {
    try {
      const dbConnected = await db.testConnection();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbConnected ? 'connected' : 'disconnected',
          api: 'running',
        },
        version: '1.0.0',
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
          api: 'running',
        },
        error: error.message,
        version: '1.0.0',
      };
    }
  });
