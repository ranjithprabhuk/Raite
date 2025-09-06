// Candle data format as specified
export type CandleData = [
  number, // epochTime
  number, // open
  number, // high
  number, // low
  number, // close
  number, // volume
  number // open interest
];

// Database models
export interface Candle {
  id: number;
  instrument: string;
  timeframe: string;
  epoch_time: number;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  open_interest: number;
  created_at: Date;
}

export interface Order {
  id: string;
  instrument: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
  filled_quantity: number;
  filled_price?: number;
  order_time: Date;
  filled_time?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Holding {
  id: string;
  instrument: string;
  quantity: number;
  average_price: number;
  total_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  created_at: Date;
  updated_at: Date;
}

export interface Position {
  id: string;
  instrument: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price?: number;
  quantity: number;
  status: 'OPEN' | 'CLOSED';
  pnl: number;
  entry_time: Date;
  exit_time?: Date;
  strategy_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
  parameters: Record<string, any>;
  status: 'ACTIVE' | 'INACTIVE' | 'TESTING';
  instruments: string[];
  created_at: Date;
  updated_at: Date;
}

export interface StrategyResult {
  id: string;
  strategy_id: string;
  instrument: string;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  max_drawdown: number;
  win_rate: number;
  sharpe_ratio?: number;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

// Request/Response DTOs
export interface CandleQueryParams {
  from?: number;
  to?: number;
  timeframe?: string;
  limit?: number;
}

export interface CreateOrderRequest {
  instrument: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  order_time?: Date;
}

export interface CreateStrategyRequest {
  name: string;
  description?: string;
  parameters: Record<string, any>;
  instruments: string[];
}

export interface DeployStrategyRequest {
  strategy_ids: string[];
  instruments: string[];
  start_date?: Date;
  end_date?: Date;
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
