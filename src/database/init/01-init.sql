-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create enum types
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_status AS ENUM ('PENDING', 'FILLED', 'CANCELLED');
CREATE TYPE position_status AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE strategy_status AS ENUM ('ACTIVE', 'INACTIVE', 'TESTING');

-- Candles table for time-series data
CREATE TABLE candles (
    id SERIAL PRIMARY KEY,
    instrument VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    epoch_time BIGINT NOT NULL,
    open_price DECIMAL(18, 8) NOT NULL,
    high_price DECIMAL(18, 8) NOT NULL,
    low_price DECIMAL(18, 8) NOT NULL,
    close_price DECIMAL(18, 8) NOT NULL,
    volume DECIMAL(18, 8) NOT NULL DEFAULT 0,
    open_interest DECIMAL(18, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(instrument, timeframe, epoch_time)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('candles', 'created_at', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_candles_instrument_timeframe_epoch 
ON candles (instrument, timeframe, epoch_time DESC);

CREATE INDEX IF NOT EXISTS idx_candles_epoch_time 
ON candles (epoch_time DESC);

-- Orders table for paper trading
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument VARCHAR(50) NOT NULL,
    side order_side NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    filled_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    filled_price DECIMAL(18, 8),
    order_time TIMESTAMP WITH TIME ZONE NOT NULL,
    filled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_instrument_status ON orders (instrument, status);
CREATE INDEX IF NOT EXISTS idx_orders_order_time ON orders (order_time DESC);

-- Holdings table for current positions
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument VARCHAR(50) NOT NULL UNIQUE,
    quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    average_price DECIMAL(18, 8) NOT NULL DEFAULT 0,
    total_value DECIMAL(18, 8) NOT NULL DEFAULT 0,
    unrealized_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
    realized_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Positions table for tracking individual trades
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument VARCHAR(50) NOT NULL,
    side order_side NOT NULL,
    entry_price DECIMAL(18, 8) NOT NULL,
    exit_price DECIMAL(18, 8),
    quantity DECIMAL(18, 8) NOT NULL,
    status position_status NOT NULL DEFAULT 'OPEN',
    pnl DECIMAL(18, 8) DEFAULT 0,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE,
    strategy_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_instrument_status ON positions (instrument, status);
CREATE INDEX IF NOT EXISTS idx_positions_strategy ON positions (strategy_id);

-- Strategies table
CREATE TABLE strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parameters JSONB NOT NULL DEFAULT '{}',
    status strategy_status NOT NULL DEFAULT 'INACTIVE',
    instruments TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strategy results table for backtesting/performance tracking
CREATE TABLE strategy_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
    instrument VARCHAR(50) NOT NULL,
    total_trades INTEGER NOT NULL DEFAULT 0,
    winning_trades INTEGER NOT NULL DEFAULT 0,
    total_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
    max_drawdown DECIMAL(18, 8) NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
    sharpe_ratio DECIMAL(10, 6),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategy_results_updated_at BEFORE UPDATE ON strategy_results 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
