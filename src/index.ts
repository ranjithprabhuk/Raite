import { Elysia } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { cors } from '@elysiajs/cors';
import { historicalDataController } from '@/controllers/HistoricalDataController';
import { paperTradingController } from '@/controllers/PaperTradingController';
import { strategyController } from '@/controllers/StrategyController';
import { db } from '@/database/connection';

// Load environment variables
const PORT = process.env.PORT || 3000;
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
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Raite API',
          version: '1.0.0',
          description: `
          Raite - Trading Candle Data Management and Paper Trading Backend
          
          ## Features
          - Historical candle data storage and retrieval using TimescaleDB
          - Paper trading simulation with order management
          - Strategy backtesting and performance analysis
          - RESTful API with comprehensive validation
          
          ## Candle Data Format
          Each candle is represented as an array: [epochTime, open, high, low, close, volume, openInterest]
          
          ## Authentication
          Currently running in development mode without authentication.
        `,
          contact: {
            name: 'Raite API Support',
            email: 'support@raite.com',
          },
        },
        servers: [
          {
            url: `http://localhost:${PORT}`,
            description: 'Local development server',
          },
        ],
        tags: [
          {
            name: 'Historical Data',
            description: 'Candle data storage and retrieval operations',
          },
          {
            name: 'Paper Trading',
            description: 'Simulated trading operations and portfolio management',
          },
          {
            name: 'Strategy Management',
            description: 'Trading strategy creation, management, and backtesting',
          },
        ],
      },
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  )
  .get('/', () => ({
    message: 'Welcome to Raite API',
    version: '1.0.0',
    documentation: '/swagger',
    endpoints: {
      historical_data: '/candles',
      paper_trading: '/trading',
      strategies: '/strategies',
    },
    status: 'running',
  }))
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
  })
  .group(`/${API_VERSION}`, (app) =>
    app.use(historicalDataController).use(paperTradingController).use(strategyController)
  )
  .onError(({ code, error, set }) => {
    console.error('API Error:', error);

    switch (code) {
      case 'VALIDATION':
        set.status = 400;
        return {
          success: false,
          error: 'Validation Error',
          message: error.message,
          details: error,
        };

      case 'NOT_FOUND':
        set.status = 404;
        return {
          success: false,
          error: 'Not Found',
          message: 'The requested resource was not found',
        };

      case 'INTERNAL_SERVER_ERROR':
        set.status = 500;
        return {
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred',
        };

      default:
        set.status = 500;
        return {
          success: false,
          error: 'Unknown Error',
          message: error.message || 'An unexpected error occurred',
        };
    }
  })
  .listen({ port: 3000, hostname: '0.0.0.0' }, ({ hostname, port }) => {
    console.log(`🚀 Raite API server started on http://${hostname}:${port}`);
    console.log(`📚 API Documentation available at http://${hostname}:${port}/swagger`);
    console.log(`🏥 Health check available at http://${hostname}:${port}/health`);
    console.log(`📊 API Version: ${API_VERSION}`);
  });

// Graceful shutdownvgbmj
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Raite API server...');

  try {
    await db.close();
    console.log('📦 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }

  console.log('✅ Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

  try {
    await db.close();
    console.log('📦 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }

  console.log('✅ Server shutdown complete');
  process.exit(0);
});

export default app;
