export const swaggerConfig = (port: string | number) => ({
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
        url: `http://localhost:${port}`,
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
});
