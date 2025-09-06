import { CandleRepository } from '@/repositories/CandleRepository';
import type { CandleData, CandleQueryParams, Candle } from '@/types';
import { ValidationError } from '@/types';

export class HistoricalDataService {
  private candleRepository: CandleRepository;

  constructor() {
    this.candleRepository = new CandleRepository();
  }

  async storeCandles(instrument: string, timeframe: string, candles: CandleData[]): Promise<void> {
    this.validateInstrument(instrument);
    this.validateTimeframe(timeframe);
    this.validateCandles(candles);

    await this.candleRepository.insertCandles(instrument, timeframe, candles);
  }

  async getCandles(instrument: string, params: CandleQueryParams): Promise<Candle[]> {
    this.validateInstrument(instrument);

    if (params.timeframe) {
      this.validateTimeframe(params.timeframe);
    }

    if (params.from && params.to && params.from > params.to) {
      throw new ValidationError('From date cannot be after to date');
    }

    if (params.limit && (params.limit <= 0 || params.limit > 10000)) {
      throw new ValidationError('Limit must be between 1 and 10000');
    }

    return await this.candleRepository.getCandles(instrument, params);
  }

  async getLatestCandle(instrument: string, timeframe: string): Promise<Candle | null> {
    this.validateInstrument(instrument);
    this.validateTimeframe(timeframe);

    return await this.candleRepository.getLatestCandle(instrument, timeframe);
  }

  async getCandleCount(instrument: string, timeframe?: string): Promise<number> {
    this.validateInstrument(instrument);

    if (timeframe) {
      this.validateTimeframe(timeframe);
    }

    return await this.candleRepository.getCandleCount(instrument, timeframe);
  }

  async getAvailableInstruments(): Promise<string[]> {
    return await this.candleRepository.getAvailableInstruments();
  }

  async getAvailableTimeframes(instrument?: string): Promise<string[]> {
    if (instrument) {
      this.validateInstrument(instrument);
    }

    return await this.candleRepository.getAvailableTimeframes(instrument);
  }

  async deleteCandles(instrument: string, timeframe?: string): Promise<number> {
    this.validateInstrument(instrument);

    if (timeframe) {
      this.validateTimeframe(timeframe);
    }

    return await this.candleRepository.deleteCandles(instrument, timeframe);
  }

  async getCandleStats(
    instrument: string,
    timeframe: string
  ): Promise<{
    count: number;
    firstCandle: Candle | null;
    lastCandle: Candle | null;
    priceRange: { min: number; max: number } | null;
  }> {
    this.validateInstrument(instrument);
    this.validateTimeframe(timeframe);

    const candles = await this.candleRepository.getCandles(instrument, { timeframe });

    if (candles.length === 0) {
      return {
        count: 0,
        firstCandle: null,
        lastCandle: null,
        priceRange: null,
      };
    }

    const sortedCandles = candles.sort((a, b) => a.epoch_time - b.epoch_time);
    const firstCandle = sortedCandles[0];
    const lastCandle = sortedCandles[sortedCandles.length - 1];

    const prices = candles.flatMap((c) => [c.high_price, c.low_price]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      count: candles.length,
      firstCandle,
      lastCandle,
      priceRange: { min, max },
    };
  }

  private validateInstrument(instrument: string): void {
    if (!instrument || typeof instrument !== 'string') {
      throw new ValidationError('Invalid instrument');
    }

    if (instrument.length < 1 || instrument.length > 50) {
      throw new ValidationError('Instrument must be between 1 and 50 characters');
    }

    // Basic format validation
    if (!/^[A-Za-z0-9_-]+$/.test(instrument)) {
      throw new ValidationError('Instrument can only contain letters, numbers, underscores, and hyphens');
    }
  }

  private validateTimeframe(timeframe: string): void {
    if (!timeframe || typeof timeframe !== 'string') {
      throw new ValidationError('Invalid timeframe');
    }

    // Valid timeframes: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
    const validTimeframes = [
      '1m',
      '3m',
      '5m',
      '15m',
      '30m',
      '1h',
      '2h',
      '4h',
      '6h',
      '8h',
      '12h',
      '1d',
      '3d',
      '1w',
      '1M',
    ];

    if (!validTimeframes.includes(timeframe)) {
      throw new ValidationError(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
    }
  }

  private validateCandles(candles: CandleData[]): void {
    if (!Array.isArray(candles)) {
      throw new ValidationError('Candles must be an array');
    }

    if (candles.length === 0) {
      throw new ValidationError('Candles array cannot be empty');
    }

    if (candles.length > 50000) {
      throw new ValidationError('Cannot process more than 50000 candles at once');
    }

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];

      if (!Array.isArray(candle) || candle.length !== 7) {
        throw new ValidationError(`Candle at index ${i} must be an array with exactly 7 elements`);
      }

      const [epochTime, open, high, low, close, volume, oi] = candle;

      // Validate epoch time
      if (!Number.isInteger(epochTime) || epochTime <= 0) {
        throw new ValidationError(`Invalid epoch time at index ${i}`);
      }

      // Validate prices
      if (typeof open !== 'number' || open <= 0) {
        throw new ValidationError(`Invalid open price at index ${i}`);
      }

      if (typeof high !== 'number' || high <= 0) {
        throw new ValidationError(`Invalid high price at index ${i}`);
      }

      if (typeof low !== 'number' || low <= 0) {
        throw new ValidationError(`Invalid low price at index ${i}`);
      }

      if (typeof close !== 'number' || close <= 0) {
        throw new ValidationError(`Invalid close price at index ${i}`);
      }

      // Validate price relationships
      if (high < Math.max(open, close) || low > Math.min(open, close)) {
        throw new ValidationError(`Invalid OHLC relationship at index ${i}`);
      }

      if (high < low) {
        throw new ValidationError(`High price cannot be less than low price at index ${i}`);
      }

      // Validate volume and open interest
      if (typeof volume !== 'number' || volume < 0) {
        throw new ValidationError(`Invalid volume at index ${i}`);
      }

      if (typeof oi !== 'number' || oi < 0) {
        throw new ValidationError(`Invalid open interest at index ${i}`);
      }
    }
  }
}
