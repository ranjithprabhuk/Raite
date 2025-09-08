import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { historicalDataController } from './controllers/HistoricalDataController';
import { paperTradingController } from './controllers/PaperTradingController';
import { strategyController } from './controllers/StrategyController';
import { mongoDataController } from './controllers/MongoDataController';
import { healthController } from './controllers/HealthController';
import { staticRoutesController } from './controllers/StaticRoutesController';
import { errorHandler } from './middleware/errorHandler';
import { swaggerConfig } from './config/swagger';
import { db } from './database/connection';
import { mongoConnection } from './database/mongoConnection';

// Load environment variables
const PORT = Number(process.env.PORT) || 3001;
const API_VERSION = process.env.API_VERSION || 'v1';

const app = new Elysia()
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  )
  .use(swagger(swaggerConfig(PORT)))
  .use(staticRoutesController)
  .use(healthController)
  .get('/', () => ({
    message: 'Welcome to Raite API',
    version: '1.0.0',
    documentation: '/swagger',
    endpoints: {
      historical_data: '/candles',
      paper_trading: '/trading',
      strategies: '/strategies',
      socket_data: '/socket-data',
    },
    status: 'running',
  }))
  .group(`/${API_VERSION}`, (app) =>
    app.use(historicalDataController).use(paperTradingController).use(strategyController).use(mongoDataController)
  )
  .onError(errorHandler)
  .listen({ port: PORT, hostname: '0.0.0.0' }, async ({ hostname, port }) => {
    console.log(`🚀 Raite API server is running on http://${hostname}:${port}`);
    console.log(`📚 API documentation: http://${hostname}:${port}/swagger`);
    console.log(`❤️  Health check: http://${hostname}:${port}/health`);
    
    // Initialize MongoDB connection
    try {
      await mongoConnection.connect();
      console.log('📊 MongoDB connection initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MongoDB connection:', error);
    }
    
    console.log('⚡ Ready to handle requests!');
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Raite API server...');

  try {
    await db.close();
    console.log('📦 PostgreSQL connection closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection:', error);
  }

  try {
    await mongoConnection.disconnect();
    console.log('📊 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }

  console.log('✅ Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

  try {
    await db.close();
    console.log('📦 PostgreSQL connection closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL connection:', error);
  }

  try {
    await mongoConnection.disconnect();
    console.log('📊 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }

  console.log('✅ Server shutdown complete');
  process.exit(0);
});

export default app;
