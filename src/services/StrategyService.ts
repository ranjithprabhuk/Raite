import { StrategyRepository } from '@/repositories/StrategyRepository';
import { PositionRepository } from '@/repositories/PositionRepository';
import { CandleRepository } from '@/repositories/CandleRepository';
import type { Strategy, StrategyResult, CreateStrategyRequest, DeployStrategyRequest, Position, Candle } from '@/types';
import { ValidationError, NotFoundError } from '@/types';

export class StrategyService {
  private strategyRepository: StrategyRepository;
  private positionRepository: PositionRepository;
  private candleRepository: CandleRepository;

  constructor() {
    this.strategyRepository = new StrategyRepository();
    this.positionRepository = new PositionRepository();
    this.candleRepository = new CandleRepository();
  }

  async createStrategy(strategyData: CreateStrategyRequest): Promise<Strategy> {
    this.validateStrategyData(strategyData);

    // Check if strategy name already exists
    const existing = await this.strategyRepository.getStrategyByName(strategyData.name);
    if (existing) {
      throw new ValidationError('Strategy name already exists');
    }

    return await this.strategyRepository.createStrategy(strategyData);
  }

  async getStrategy(id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.getStrategyById(id);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }
    return strategy;
  }

  async getAllStrategies(
    status?: 'ACTIVE' | 'INACTIVE' | 'TESTING',
    limit: number = 100,
    offset: number = 0
  ): Promise<{ strategies: Strategy[]; total: number }> {
    const strategies = await this.strategyRepository.getAllStrategies(status, limit, offset);
    const total = await this.strategyRepository.getStrategiesCount(status);

    return { strategies, total };
  }

  async updateStrategy(id: string, updates: Partial<CreateStrategyRequest>): Promise<Strategy> {
    const existingStrategy = await this.strategyRepository.getStrategyById(id);
    if (!existingStrategy) {
      throw new NotFoundError('Strategy not found');
    }

    // If updating name, check for duplicates
    if (updates.name && updates.name !== existingStrategy.name) {
      const duplicate = await this.strategyRepository.getStrategyByName(updates.name);
      if (duplicate) {
        throw new ValidationError('Strategy name already exists');
      }
    }

    this.validateStrategyUpdates(updates);

    const updatedStrategy = await this.strategyRepository.updateStrategy(id, updates);
    if (!updatedStrategy) {
      throw new Error('Failed to update strategy');
    }

    return updatedStrategy;
  }

  async deleteStrategy(id: string): Promise<void> {
    const strategy = await this.strategyRepository.getStrategyById(id);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    // Check if strategy has any active positions
    const positions = await this.positionRepository.getPositionsByStrategy(id);
    const openPositions = positions.filter((p) => p.status === 'OPEN');

    if (openPositions.length > 0) {
      throw new ValidationError('Cannot delete strategy with open positions');
    }

    const deleted = await this.strategyRepository.deleteStrategy(id);
    if (!deleted) {
      throw new Error('Failed to delete strategy');
    }
  }

  async activateStrategy(id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.updateStrategyStatus(id, 'ACTIVE');
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }
    return strategy;
  }

  async deactivateStrategy(id: string): Promise<Strategy> {
    const strategy = await this.strategyRepository.updateStrategyStatus(id, 'INACTIVE');
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }
    return strategy;
  }

  async deployStrategies(deployRequest: DeployStrategyRequest): Promise<StrategyResult[]> {
    this.validateDeployRequest(deployRequest);

    const results: StrategyResult[] = [];

    for (const strategyId of deployRequest.strategy_ids) {
      const strategy = await this.strategyRepository.getStrategyById(strategyId);
      if (!strategy) {
        throw new NotFoundError(`Strategy ${strategyId} not found`);
      }

      // Set strategy to testing mode
      await this.strategyRepository.updateStrategyStatus(strategyId, 'TESTING');

      for (const instrument of deployRequest.instruments) {
        const result = await this.backtestStrategy(
          strategy,
          instrument,
          deployRequest.start_date,
          deployRequest.end_date
        );
        results.push(result);
      }
    }

    return results;
  }

  async getStrategyResults(strategyId: string): Promise<StrategyResult[]> {
    const strategy = await this.strategyRepository.getStrategyById(strategyId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    return await this.strategyRepository.getStrategyResults(strategyId);
  }

  async getStrategiesByInstrument(instrument: string): Promise<Strategy[]> {
    return await this.strategyRepository.getStrategiesByInstrument(instrument);
  }

  private async backtestStrategy(
    strategy: Strategy,
    instrument: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<StrategyResult> {
    // Get historical data for backtesting
    const candles = await this.getCandlesForBacktest(instrument, startDate, endDate);

    if (candles.length === 0) {
      throw new ValidationError(`No historical data available for ${instrument}`);
    }

    // Simulate strategy execution
    const trades = await this.simulateStrategy(strategy, candles);

    // Calculate performance metrics
    const metrics = this.calculatePerformanceMetrics(trades, candles);

    // Store results
    const resultData = {
      strategy_id: strategy.id,
      instrument,
      total_trades: metrics.totalTrades,
      winning_trades: metrics.winningTrades,
      total_pnl: metrics.totalPnl,
      max_drawdown: metrics.maxDrawdown,
      win_rate: metrics.winRate,
      sharpe_ratio: metrics.sharpeRatio,
      start_date: startDate || new Date(candles[0].epoch_time * 1000),
      end_date: endDate || new Date(candles[candles.length - 1].epoch_time * 1000),
    };

    return await this.strategyRepository.createStrategyResult(resultData);
  }

  private async getCandlesForBacktest(instrument: string, startDate?: Date, endDate?: Date): Promise<Candle[]> {
    const params = {
      from: startDate ? Math.floor(startDate.getTime() / 1000) : undefined,
      to: endDate ? Math.floor(endDate.getTime() / 1000) : undefined,
      timeframe: '1m', // Default to 1-minute candles for backtesting
      limit: 100000, // Large limit for comprehensive backtesting
    };

    return await this.candleRepository.getCandles(instrument, params);
  }

  private async simulateStrategy(strategy: Strategy, candles: Candle[]): Promise<Position[]> {
    // This is a simplified simulation - in a real implementation,
    // you would execute the actual strategy logic based on strategy.parameters
    const positions: Position[] = [];

    // Example simple moving average crossover strategy simulation
    if (strategy.parameters.type === 'sma_crossover') {
      const shortPeriod = strategy.parameters.short_period || 10;
      const longPeriod = strategy.parameters.long_period || 20;

      // Calculate moving averages and generate signals
      for (let i = longPeriod; i < candles.length; i++) {
        const shortSMA = this.calculateSMA(candles, i, shortPeriod);
        const longSMA = this.calculateSMA(candles, i, longPeriod);
        const prevShortSMA = this.calculateSMA(candles, i - 1, shortPeriod);
        const prevLongSMA = this.calculateSMA(candles, i - 1, longPeriod);

        // Generate buy signal
        if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
          const position = await this.positionRepository.createPosition(
            candles[i].instrument,
            'BUY',
            candles[i].close_price,
            100, // Fixed quantity for simulation
            new Date(candles[i].epoch_time * 1000),
            strategy.id
          );
          positions.push(position);
        }

        // Generate sell signal (close existing position)
        if (prevShortSMA >= prevLongSMA && shortSMA < longSMA && positions.length > 0) {
          const lastPosition = positions[positions.length - 1];
          if (lastPosition.status === 'OPEN') {
            const closedPosition = await this.positionRepository.closePosition(
              lastPosition.id,
              candles[i].close_price,
              new Date(candles[i].epoch_time * 1000)
            );
            if (closedPosition) {
              positions[positions.length - 1] = closedPosition;
            }
          }
        }
      }
    }

    return positions;
  }

  private calculateSMA(candles: Candle[], index: number, period: number): number {
    const start = Math.max(0, index - period + 1);
    const slice = candles.slice(start, index + 1);
    const sum = slice.reduce((acc, candle) => acc + candle.close_price, 0);
    return sum / slice.length;
  }

  private calculatePerformanceMetrics(
    positions: Position[],
    candles: Candle[]
  ): {
    totalTrades: number;
    winningTrades: number;
    totalPnl: number;
    maxDrawdown: number;
    winRate: number;
    sharpeRatio: number;
  } {
    const closedPositions = positions.filter((p) => p.status === 'CLOSED');
    const totalTrades = closedPositions.length;
    const winningTrades = closedPositions.filter((p) => p.pnl > 0).length;
    const totalPnl = closedPositions.reduce((sum, p) => sum + p.pnl, 0);
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

    // Calculate returns for each trade
    const returns = closedPositions.map((p) => p.pnl / (p.entry_price * p.quantity));

    // Calculate Sharpe ratio (simplified)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const returnVariance =
      returns.length > 0 ? returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length : 0;
    const returnStdDev = Math.sqrt(returnVariance);
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let runningPnl = 0;

    for (const position of closedPositions) {
      runningPnl += position.pnl;
      if (runningPnl > peak) {
        peak = runningPnl;
      }
      const drawdown = (peak - runningPnl) / (peak || 1);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return {
      totalTrades,
      winningTrades,
      totalPnl,
      maxDrawdown,
      winRate,
      sharpeRatio,
    };
  }

  private validateStrategyData(strategyData: CreateStrategyRequest): void {
    if (!strategyData.name || typeof strategyData.name !== 'string') {
      throw new ValidationError('Strategy name is required');
    }

    if (strategyData.name.length < 1 || strategyData.name.length > 100) {
      throw new ValidationError('Strategy name must be between 1 and 100 characters');
    }

    if (!strategyData.parameters || typeof strategyData.parameters !== 'object') {
      throw new ValidationError('Strategy parameters are required');
    }

    if (!Array.isArray(strategyData.instruments) || strategyData.instruments.length === 0) {
      throw new ValidationError('At least one instrument must be specified');
    }

    for (const instrument of strategyData.instruments) {
      if (!instrument || typeof instrument !== 'string') {
        throw new ValidationError('All instruments must be valid strings');
      }
    }
  }

  private validateStrategyUpdates(updates: Partial<CreateStrategyRequest>): void {
    if (updates.name !== undefined) {
      if (typeof updates.name !== 'string' || updates.name.length < 1 || updates.name.length > 100) {
        throw new ValidationError('Strategy name must be between 1 and 100 characters');
      }
    }

    if (updates.parameters !== undefined) {
      if (typeof updates.parameters !== 'object') {
        throw new ValidationError('Strategy parameters must be an object');
      }
    }

    if (updates.instruments !== undefined) {
      if (!Array.isArray(updates.instruments) || updates.instruments.length === 0) {
        throw new ValidationError('At least one instrument must be specified');
      }

      for (const instrument of updates.instruments) {
        if (!instrument || typeof instrument !== 'string') {
          throw new ValidationError('All instruments must be valid strings');
        }
      }
    }
  }

  private validateDeployRequest(deployRequest: DeployStrategyRequest): void {
    if (!Array.isArray(deployRequest.strategy_ids) || deployRequest.strategy_ids.length === 0) {
      throw new ValidationError('At least one strategy ID must be provided');
    }

    if (!Array.isArray(deployRequest.instruments) || deployRequest.instruments.length === 0) {
      throw new ValidationError('At least one instrument must be provided');
    }

    if (deployRequest.start_date && deployRequest.end_date) {
      if (deployRequest.start_date >= deployRequest.end_date) {
        throw new ValidationError('Start date must be before end date');
      }
    }
  }
}
