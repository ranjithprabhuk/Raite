#!/bin/bash

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start TimescaleDB
echo "🐳 Starting TimescaleDB..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
pnpm run db:migrate

echo "✅ Setup complete!"
echo "🚀 Start the development server with: pnpm run dev"
echo "📚 API documentation will be available at: http://localhost:3000/swagger"
