import { db } from '@/database/connection';
import type { Candle, CandleData, CandleQueryParams, OIInterpretation } from '@/types';

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

  async insertCandlesWithOI(
    instrument: string, 
    timeframe: string, 
    candlesWithOI: Array<{ candleData: CandleData; oiInterpretation?: OIInterpretation }>
  ): Promise<void> {
    if (candlesWithOI.length === 0) return;

    const values = candlesWithOI
      .map(({ candleData, oiInterpretation }) => {
        const oiInterp = oiInterpretation ? `'${oiInterpretation}'` : 'NULL';
        return `('${instrument}', '${timeframe}', ${candleData[0]}, ${candleData[1]}, ${candleData[2]}, ${candleData[3]}, ${candleData[4]}, ${candleData[5]}, ${candleData[6]}, ${oiInterp})`;
      })
      .join(',');

    const query = `
      INSERT INTO candles (instrument, timeframe, epoch_time, open_price, high_price, low_price, close_price, volume, open_interest, oi_interpretation)
      VALUES ${values}
      ON CONFLICT (instrument, timeframe, epoch_time) 
      DO UPDATE SET
        open_price = EXCLUDED.open_price,
        high_price = EXCLUDED.high_price,
        low_price = EXCLUDED.low_price,
        close_price = EXCLUDED.close_price,
        volume = EXCLUDED.volume,
        open_interest = EXCLUDED.open_interest,
        oi_interpretation = EXCLUDED.oi_interpretation
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

  async getCandleById(id: number): Promise<Candle | null> {
    const query = `SELECT * FROM candles WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async getPreviousCandle(instrument: string, timeframe: string, epochTime: number): Promise<Candle | null> {
    const query = `
      SELECT * FROM candles 
      WHERE instrument = $1 AND timeframe = $2 AND epoch_time < $3
      ORDER BY epoch_time DESC 
      LIMIT 1
    `;
    const result = await db.query(query, [instrument, timeframe, epochTime]);
    return result.rows[0] || null;
  }

  async updateOIInterpretations(updates: Array<{ id: number; interpretation: string }>): Promise<void> {
    if (updates.length === 0) return;

    // Build a batch update query using CASE statements for better performance
    const ids = updates.map(u => u.id).join(',');
    const caseStatements = updates.map(u => `WHEN ${u.id} THEN '${u.interpretation}'`).join(' ');
    
    const query = `
      UPDATE candles 
      SET oi_interpretation = CASE id ${caseStatements} END
      WHERE id IN (${ids})
    `;

    await db.query(query);
  }
}
