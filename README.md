# Raite

Trading candle data management and paper trading backend built with modern technologies.

## 🚀 Features

- **Historical Data Management**: Store and retrieve candle data using TimescaleDB for optimal time-series performance
- **Paper Trading**: Simulate buy/sell orders with comprehensive portfolio tracking
- **Strategy Management**: Create, deploy, and backtest trading strategies
- **RESTful API**: Comprehensive API with Swagger documentation
- **TypeScript**: Full type safety and modern JavaScript features
- **Fast Performance**: Built on Bun runtime with Elysia framework

## 🛠 Tech Stack

- **Runtime**: Bun
- **Framework**: Elysia
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Database**: PostgreSQL with TimescaleDB extension
- **Containerization**: Docker (for database)
- **API Documentation**: Swagger (OpenAPI 3.x)

## 📊 Candle Data Format

Each candle is represented as an array with 7 elements:

```typescript
[
  epochTime: number,         // 1. Epoch time (in seconds)
  open: number,              // 2. Open price
  high: number,              // 3. High price
  low: number,               // 4. Low price
  close: number,             // 5. Close price
  volume: number,            // 6. Volume (total traded quantity)
  oi: number                 // 7. Open interest
]
```

## 🏗 Project Structure

```
src/
├── controllers/           # API route handlers
│   ├── HistoricalDataController.ts
│   ├── PaperTradingController.ts
│   └── StrategyController.ts
├── services/             # Business logic layer
│   ├── HistoricalDataService.ts
│   ├── PaperTradingService.ts
│   └── StrategyService.ts
├── repositories/         # Data access layer
│   ├── CandleRepository.ts
│   ├── OrderRepository.ts
│   ├── HoldingRepository.ts
│   ├── PositionRepository.ts
│   └── StrategyRepository.ts
├── database/            # Database configuration and migrations
│   ├── connection.ts
│   ├── init/
│   ├── migrations/
│   └── seeds/
├── types/               # TypeScript type definitions
│   └── index.ts
└── index.ts            # Application entry point
```

## 🚦 Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Docker](https://www.docker.com/) and Docker Compose
- [pnpm](https://pnpm.io/) (latest version)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/ranjithprabhuk/Raite.git
   cd Raite
   ```

2. **Run the setup script**

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

   Or manually:

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Start the database**

   ```bash
   docker-compose up -d
   ```

5. **Copy environment variables**

   ```bash
   cp .env.example .env
   ```

6. **Run database migrations**

   ```bash
   pnpm run db:migrate
   ```

7. **Seed the database (optional)**

   ```bash
   pnpm run db:seed
   ```

8. **Start the development server**
   ```bash
   pnpm run dev
   ```

The API will be available at `http://localhost:3000`

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:3000/swagger
- **Health Check**: http://localhost:3000/health

## 🔗 API Endpoints

### Historical Data Management

- `POST /v1/candles/:instrument` - Store historical candle data
- `GET /v1/candles/:instrument` - Retrieve candle data
- `GET /v1/candles/:instrument/latest` - Get latest candle
- `GET /v1/candles/:instrument/stats` - Get candle statistics
- `GET /v1/candles/instruments` - List available instruments
- `GET /v1/candles/timeframes` - List available timeframes
- `DELETE /v1/candles/:instrument` - Delete candle data

### Paper Trading

- `POST /v1/trading/orders` - Create new order
- `GET /v1/trading/orders` - Get orders
- `PUT /v1/trading/orders/:id/cancel` - Cancel order
- `GET /v1/trading/holdings` - Get current holdings
- `GET /v1/trading/positions` - Get positions
- `PUT /v1/trading/positions/:id/close` - Close position
- `GET /v1/trading/reports/pl` - Generate P&L report

### Strategy Management

- `POST /v1/strategies` - Create strategy
- `GET /v1/strategies` - List strategies
- `GET /v1/strategies/:id` - Get strategy
- `PUT /v1/strategies/:id` - Update strategy
- `DELETE /v1/strategies/:id` - Delete strategy
- `PUT /v1/strategies/:id/activate` - Activate strategy
- `PUT /v1/strategies/:id/deactivate` - Deactivate strategy
- `POST /v1/strategies/deploy` - Deploy strategies for backtesting
- `GET /v1/strategies/:id/results` - Get strategy results

## 🧪 Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage
```

## 🔧 Available Scripts

```bash
# Development
pnpm run dev          # Start development server with hot reload
pnpm run start        # Start production server
pnpm run build        # Build for production

# Database
pnpm run db:migrate   # Run database migrations
pnpm run db:seed      # Seed database with sample data

# Code Quality
pnpm run lint         # Run ESLint
pnpm run test         # Run tests
```

## 🐳 Docker Support

The project includes Docker configuration for easy deployment:

```bash
# Build and run with Docker
docker-compose up --build

# Run only the database
docker-compose up postgres
```

## 🔧 Configuration

Environment variables can be configured in `.env`:

```env
# Database Configuration
DATABASE_URL=postgresql://raite_user:raite_password@localhost:5432/raite
DB_HOST=localhost
DB_PORT=5432
DB_NAME=raite
DB_USER=raite_user
DB_PASSWORD=raite_password

# Server Configuration
PORT=3000
NODE_ENV=development
API_VERSION=v1
```

## 📝 Example Usage

### Store Candle Data

```bash
curl -X POST http://localhost:3000/v1/candles/BTCUSDT \
  -H "Content-Type: application/json" \
  -d '{
    "timeframe": "1m",
    "candles": [
      [1704067200, 42000, 42500, 41800, 42200, 1500.5, 0]
    ]
  }'
```

### Create an Order

```bash
curl -X POST http://localhost:3000/v1/trading/orders \
  -H "Content-Type: application/json" \
  -d '{
    "instrument": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.1,
    "price": 42000
  }'
```

### Create a Strategy

```bash
curl -X POST http://localhost:3000/v1/strategies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Simple SMA Crossover",
    "description": "Moving average crossover strategy",
    "parameters": {
      "type": "sma_crossover",
      "short_period": 10,
      "long_period": 20
    },
    "instruments": ["BTCUSDT", "ETHUSDT"]
  }'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [API documentation](http://localhost:3000/swagger)
2. Review the [health endpoint](http://localhost:3000/health)
3. Open an issue on GitHub
4. Contact support at support@raite.com

## 🎯 Roadmap

- [ ] Real-time data streaming
- [ ] Advanced strategy templates
- [ ] Risk management features
- [ ] Portfolio optimization
- [ ] Machine learning integration
- [ ] WebSocket API
- [ ] Authentication and authorization
- [ ] Multi-tenancy support

---

Built with ❤️ using Bun, Elysia, and TimescaleDB
