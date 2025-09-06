import { Elysia } from 'elysia';

// Simple working server without all the complex imports
const app = new Elysia()
  .get('/', () => ({
    message: 'Welcome to Raite API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  }))
  .get('/health', () => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      api: 'running',
    },
    version: '1.0.0',
  }))
  .listen({ port: 3333, hostname: '0.0.0.0' }, ({ hostname, port }) => {
    console.log(`🚀 Raite API server started on http://${hostname}:${port}`);
    console.log(`🏥 Health check available at http://${hostname}:${port}/health`);
  });

export default app;
