import { CandleRepository } from '@/repositories/CandleRepository';
import type { CandleData, CandleQueryParams, Candle, OIInterpretation, OIAnalysis } from '@/types';
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

    // Get existing candles to calculate OI interpretations for new candles
    const existingCandles = await this.candleRepository.getCandles(instrument, { 
      timeframe,
      limit: 10 // Get recent candles for context
    });

    // Sort existing candles by epoch time
    const sortedExistingCandles = existingCandles.sort((a, b) => a.epoch_time - b.epoch_time);

    // Prepare candles with OI interpretations
    const candlesWithOI: Array<{
      candleData: CandleData;
      oiInterpretation?: OIInterpretation;
    }> = [];

    // Sort new candles by epoch time
    const sortedNewCandles = candles.sort((a, b) => a[0] - b[0]); // Sort by epoch time

    for (let i = 0; i < sortedNewCandles.length; i++) {
      const currentCandleData = sortedNewCandles[i];
      let oiInterpretation: OIInterpretation | undefined;

      // Find the previous candle for OI interpretation calculation
      let previousCandle: Candle | undefined;

      if (i === 0) {
        // For the first new candle, look in existing candles
        const lastExistingCandle = sortedExistingCandles[sortedExistingCandles.length - 1];
        if (lastExistingCandle && lastExistingCandle.epoch_time < currentCandleData[0]) {
          previousCandle = lastExistingCandle;
        }
      } else {
        // For subsequent candles, use the previous new candle
        const prevCandleData = sortedNewCandles[i - 1];
        previousCandle = {
          id: 0, // Temporary ID
          instrument,
          timeframe,
          epoch_time: prevCandleData[0],
          open_price: prevCandleData[1],
          high_price: prevCandleData[2],
          low_price: prevCandleData[3],
          close_price: prevCandleData[4],
          volume: prevCandleData[5],
          open_interest: prevCandleData[6],
          created_at: new Date()
        } as Candle;
      }

      // Calculate OI interpretation if we have a previous candle
      if (previousCandle) {
        const currentCandle: Candle = {
          id: 0, // Temporary ID
          instrument,
          timeframe,
          epoch_time: currentCandleData[0],
          open_price: currentCandleData[1],
          high_price: currentCandleData[2],
          low_price: currentCandleData[3],
          close_price: currentCandleData[4],
          volume: currentCandleData[5],
          open_interest: currentCandleData[6],
          created_at: new Date()
        } as Candle;

        const oiAnalysis = this.calculateOIInterpretation(previousCandle, currentCandle);
        oiInterpretation = oiAnalysis.interpretation;
      }

      candlesWithOI.push({
        candleData: currentCandleData,
        oiInterpretation
      });
    }

    // Insert candles with OI interpretations
    await this.candleRepository.insertCandlesWithOI(instrument, timeframe, candlesWithOI);
  }

  async getCandles(instrument: string, params: CandleQueryParams): Promise<Candle[]> {
    this.validateInstrument(instrument);

    if (params.timeframe) {
      this.validateTimeframe(params.timeframe);
    }

    if (params.from && params.to && params.from > params.to) {
      throw new ValidationError('From date cannot be after to date');
    }

    if (params.limit && (params.limit <= 0 || params.limit > 100000)) {
      throw new ValidationError('Limit must be between 1 and 100000');
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

  /**
   * Analyze and update OI interpretations for candles
   * This method should be called after storing new candles to compute OI analysis
   */
  async analyzeAndUpdateOIInterpretations(
    instrument: string, 
    timeframe: string, 
    batchSize: number = 1000
  ): Promise<{ updated: number; total: number }> {
    this.validateInstrument(instrument);
    this.validateTimeframe(timeframe);

    // Get all candles for the instrument/timeframe ordered by time
    const candles = await this.candleRepository.getCandles(instrument, { 
      timeframe,
      limit: 100000 // Get all candles, will paginate if needed
    });

    if (candles.length < 2) {
      return { updated: 0, total: candles.length };
    }

    // Sort by epoch time to ensure proper order
    const sortedCandles = candles.sort((a, b) => a.epoch_time - b.epoch_time);
    let updatedCount = 0;

    // Process candles in batches starting from the second candle
    for (let i = 1; i < sortedCandles.length; i += batchSize) {
      const batch = sortedCandles.slice(i, i + batchSize);
      const updates: Array<{ id: number; interpretation: OIInterpretation }> = [];

      for (const currentCandle of batch) {
        const currentIndex = sortedCandles.findIndex(c => c.id === currentCandle.id);
        if (currentIndex === 0) continue; // Skip first candle

        const previousCandle = sortedCandles[currentIndex - 1];
        const oiAnalysis = this.calculateOIInterpretation(previousCandle, currentCandle);
        
        updates.push({
          id: currentCandle.id,
          interpretation: oiAnalysis.interpretation
        });
      }

      // Batch update the database
      if (updates.length > 0) {
        await this.candleRepository.updateOIInterpretations(updates);
        updatedCount += updates.length;
      }
    }

    return { updated: updatedCount, total: sortedCandles.length };
  }

  /**
   * Calculate OI interpretation for a single candle compared to the previous one
   */
  calculateOIInterpretation(previousCandle: Candle, currentCandle: Candle): OIAnalysis {
    // Calculate price and OI changes
    const priceChange = currentCandle.close_price - previousCandle.close_price;
    const oiChange = currentCandle.open_interest - previousCandle.open_interest;
    
    // Calculate percentage changes for better analysis
    const priceChangePercent = (priceChange / previousCandle.close_price) * 100;
    const oiChangePercent = previousCandle.open_interest > 0 
      ? (oiChange / previousCandle.open_interest) * 100 
      : 0;

    // Define thresholds for significant changes
    const PRICE_THRESHOLD = 0.1; // 0.1% price change threshold
    const OI_THRESHOLD = 1.0; // 1% OI change threshold

    // Determine directions
    const priceDirection: 'UP' | 'DOWN' | 'FLAT' = 
      Math.abs(priceChangePercent) < PRICE_THRESHOLD ? 'FLAT' :
      priceChange > 0 ? 'UP' : 'DOWN';

    const oiDirection: 'UP' | 'DOWN' | 'FLAT' = 
      Math.abs(oiChangePercent) < OI_THRESHOLD ? 'FLAT' :
      oiChange > 0 ? 'UP' : 'DOWN';

    // Determine interpretation based on price and OI movements
    let interpretation: OIInterpretation;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW';

    if (priceDirection === 'UP' && oiDirection === 'UP') {
      interpretation = 'LONG_BUILDUP';
      confidence = Math.abs(priceChangePercent) > 0.5 && Math.abs(oiChangePercent) > 2 ? 'HIGH' : 
                   Math.abs(priceChangePercent) > 0.2 && Math.abs(oiChangePercent) > 1 ? 'MEDIUM' : 'LOW';
    } else if (priceDirection === 'DOWN' && oiDirection === 'UP') {
      interpretation = 'SHORT_BUILDUP';
      confidence = Math.abs(priceChangePercent) > 0.5 && Math.abs(oiChangePercent) > 2 ? 'HIGH' : 
                   Math.abs(priceChangePercent) > 0.2 && Math.abs(oiChangePercent) > 1 ? 'MEDIUM' : 'LOW';
    } else if (priceDirection === 'DOWN' && oiDirection === 'DOWN') {
      interpretation = 'LONG_UNWINDING';
      confidence = Math.abs(priceChangePercent) > 0.5 && Math.abs(oiChangePercent) > 2 ? 'HIGH' : 
                   Math.abs(priceChangePercent) > 0.2 && Math.abs(oiChangePercent) > 1 ? 'MEDIUM' : 'LOW';
    } else if (priceDirection === 'UP' && oiDirection === 'DOWN') {
      interpretation = 'SHORT_COVERING';
      confidence = Math.abs(priceChangePercent) > 0.5 && Math.abs(oiChangePercent) > 2 ? 'HIGH' : 
                   Math.abs(priceChangePercent) > 0.2 && Math.abs(oiChangePercent) > 1 ? 'MEDIUM' : 'LOW';
    } else {
      interpretation = 'INCONCLUSIVE';
      confidence = 'LOW';
    }

    return {
      interpretation,
      priceChange,
      oiChange,
      priceDirection,
      oiDirection,
      confidence
    };
  }

  /**
   * Get OI analysis for a specific candle
   */
  async getOIAnalysis(candleId: number): Promise<OIAnalysis | null> {
    const candle = await this.candleRepository.getCandleById(candleId);
    if (!candle) return null;

    const previousCandle = await this.candleRepository.getPreviousCandle(
      candle.instrument, 
      candle.timeframe, 
      candle.epoch_time
    );
    
    if (!previousCandle) return null;

    return this.calculateOIInterpretation(previousCandle, candle);
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
