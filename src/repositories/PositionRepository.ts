import { db } from '@/database/connection';
import type { Position } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class PositionRepository {
  async createPosition(
    instrument: string,
    side: 'BUY' | 'SELL',
    entryPrice: number,
    quantity: number,
    entryTime: Date = new Date(),
    strategyId?: string
  ): Promise<Position> {
    const id = uuidv4();

    const query = `
      INSERT INTO positions (id, instrument, side, entry_price, quantity, entry_time, strategy_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [id, instrument, side, entryPrice, quantity, entryTime, strategyId];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async closePosition(id: string, exitPrice: number, exitTime: Date = new Date()): Promise<Position | null> {
    // First get the position to calculate PnL
    const position = await this.getPositionById(id);
    if (!position || position.status === 'CLOSED') {
      return null;
    }

    const pnl = this.calculatePnl(position, exitPrice);

    const query = `
      UPDATE positions 
      SET status = 'CLOSED', exit_price = $2, exit_time = $3, pnl = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, exitPrice, exitTime, pnl]);
    return result.rows[0] || null;
  }

  async getPositionById(id: string): Promise<Position | null> {
    const query = `SELECT * FROM positions WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async getPositions(
    instrument?: string,
    status?: 'OPEN' | 'CLOSED',
    strategyId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<Position[]> {
    let query = `SELECT * FROM positions WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (instrument) {
      query += ` AND instrument = $${paramIndex}`;
      params.push(instrument);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (strategyId) {
      query += ` AND strategy_id = $${paramIndex}`;
      params.push(strategyId);
      paramIndex++;
    }

    query += ` ORDER BY entry_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async getOpenPositions(instrument?: string): Promise<Position[]> {
    return this.getPositions(instrument, 'OPEN');
  }

  async getClosedPositions(instrument?: string): Promise<Position[]> {
    return this.getPositions(instrument, 'CLOSED');
  }

  async getPositionsByStrategy(strategyId: string): Promise<Position[]> {
    return this.getPositions(undefined, undefined, strategyId);
  }

  async getPositionsByDateRange(startDate: Date, endDate: Date, instrument?: string): Promise<Position[]> {
    let query = `
      SELECT * FROM positions 
      WHERE entry_time BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate, endDate];
    let paramIndex = 3;

    if (instrument) {
      query += ` AND instrument = $${paramIndex}`;
      params.push(instrument);
    }

    query += ` ORDER BY entry_time DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async updatePositionPnl(id: string, currentPrice: number): Promise<Position | null> {
    const position = await this.getPositionById(id);
    if (!position || position.status === 'CLOSED') {
      return null;
    }

    const unrealizedPnl = this.calculatePnl(position, currentPrice);

    const query = `
      UPDATE positions 
      SET pnl = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, unrealizedPnl]);
    return result.rows[0] || null;
  }

  async deletePosition(id: string): Promise<boolean> {
    const query = `DELETE FROM positions WHERE id = $1`;
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getPositionsCount(instrument?: string, status?: 'OPEN' | 'CLOSED', strategyId?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM positions WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (instrument) {
      query += ` AND instrument = $${paramIndex}`;
      params.push(instrument);
      paramIndex++;
    }

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (strategyId) {
      query += ` AND strategy_id = $${paramIndex}`;
      params.push(strategyId);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  private calculatePnl(position: Position, currentPrice: number): number {
    const priceDiff =
      position.side === 'BUY' ? currentPrice - position.entry_price : position.entry_price - currentPrice;

    return priceDiff * position.quantity;
  }

  async getTotalPnl(instrument?: string, strategyId?: string): Promise<number> {
    let query = `SELECT COALESCE(SUM(pnl), 0) as total_pnl FROM positions WHERE status = 'CLOSED'`;
    const params: any[] = [];
    let paramIndex = 1;

    if (instrument) {
      query += ` AND instrument = $${paramIndex}`;
      params.push(instrument);
      paramIndex++;
    }

    if (strategyId) {
      query += ` AND strategy_id = $${paramIndex}`;
      params.push(strategyId);
    }

    const result = await db.query(query, params);
    return parseFloat(result.rows[0].total_pnl) || 0;
  }
}
