import { db } from '@/database/connection';
import type { Candle, CandleData, CandleQueryParams } from '@/types';

export class CandleRepository {
  async insertCandles(instrument: string, timeframe: string, candles: CandleData[]): Promise<void> {
    if (candles.length === 0) return;

    const values = candles
      .map(
        (candle) =>
          `('${instrument}', '${timeframe}', ${candle[0]}, ${candle[1]}, ${candle[2]}, ${candle[3]}, ${candle[4]}, ${candle[5]}, ${candle[6]})`
      )
      .join(',');

    const query = `
      INSERT INTO candles (instrument, timeframe, epoch_time, open_price, high_price, low_price, close_price, volume, open_interest)
      VALUES ${values}
      ON CONFLICT (instrument, timeframe, epoch_time) 
      DO UPDATE SET
        open_price = EXCLUDED.open_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume = EXCLUDED.volume,
        open_interest = EXCLUDED.open_interest
    `;

    await db.query(query);
  }

  async getCandles(instrument: string, params: CandleQueryParams): Promise<Candle[]> {
    let query = `
      SELECT * FROM candles 
      WHERE instrument = $1
    `;
    const queryParams: any[] = [instrument];
    let paramIndex = 2;

    if (params.timeframe) {
      query += ` AND timeframe = $${paramIndex}`;
      queryParams.push(params.timeframe);
      paramIndex++;
    }

    if (params.from) {
      query += ` AND epoch_time >= $${paramIndex}`;
      queryParams.push(params.from);
      paramIndex++;
    }

    if (params.to) {
      query += ` AND epoch_time <= $${paramIndex}`;
      queryParams.push(params.to);
      paramIndex++;
    }

    query += ` ORDER BY epoch_time DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex}`;
      queryParams.push(params.limit);
    }

    const result = await db.query(query, queryParams);
    return result.rows;
  }

  async getLatestCandle(instrument: string, timeframe: string): Promise<Candle | null> {
    const query = `
      SELECT * FROM candles 
      WHERE instrument = $1 AND timeframe = $2
      ORDER BY epoch_time DESC 
      LIMIT 1
    `;

    const result = await db.query(query, [instrument, timeframe]);
    return result.rows[0] || null;
  }

  async getCandleCount(instrument: string, timeframe?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM candles WHERE instrument = $1`;
    const params: any[] = [instrument];

    if (timeframe) {
      query += ` AND timeframe = $2`;
      params.push(timeframe);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getAvailableInstruments(): Promise<string[]> {
    const query = `SELECT DISTINCT instrument FROM candles ORDER BY instrument`;
    const result = await db.query(query);
    return result.rows.map((row: any) => row.instrument);
  }

  async getAvailableTimeframes(instrument?: string): Promise<string[]> {
    let query = `SELECT DISTINCT timeframe FROM candles`;
    const params: any[] = [];

    if (instrument) {
      query += ` WHERE instrument = $1`;
      params.push(instrument);
    }

    query += ` ORDER BY timeframe`;
    const result = await db.query(query, params);
    return result.rows.map((row: any) => row.timeframe);
  }

  async deleteCandles(instrument: string, timeframe?: string): Promise<number> {
    let query = `DELETE FROM candles WHERE instrument = $1`;
    const params: any[] = [instrument];

    if (timeframe) {
      query += ` AND timeframe = $2`;
      params.push(timeframe);
    }

    const result = await db.query(query, params);
    return result.rowCount || 0;
  }
}
