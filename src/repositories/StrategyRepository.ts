import { db } from '@/database/connection';
import type { Strategy, StrategyResult, CreateStrategyRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class StrategyRepository {
  async createStrategy(strategyData: CreateStrategyRequest): Promise<Strategy> {
    const id = uuidv4();

    const query = `
      INSERT INTO strategies (id, name, description, parameters, instruments)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      id,
      strategyData.name,
      strategyData.description || null,
      JSON.stringify(strategyData.parameters),
      strategyData.instruments,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getStrategyById(id: string): Promise<Strategy | null> {
    const query = `SELECT * FROM strategies WHERE id = $1`;
    const result = await db.query(query, [id]);
    const strategy = result.rows[0];

    if (strategy) {
      strategy.parameters = JSON.parse(strategy.parameters);
    }

    return strategy || null;
  }

  async getStrategyByName(name: string): Promise<Strategy | null> {
    const query = `SELECT * FROM strategies WHERE name = $1`;
    const result = await db.query(query, [name]);
    const strategy = result.rows[0];

    if (strategy) {
      strategy.parameters = JSON.parse(strategy.parameters);
    }

    return strategy || null;
  }

  async getAllStrategies(
    status?: 'ACTIVE' | 'INACTIVE' | 'TESTING',
    limit: number = 100,
    offset: number = 0
  ): Promise<Strategy[]> {
    let query = `SELECT * FROM strategies WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows.map((strategy: any) => ({
      ...strategy,
      parameters: JSON.parse(strategy.parameters),
    }));
  }

  async updateStrategy(id: string, updates: Partial<CreateStrategyRequest>): Promise<Strategy | null> {
    const fields: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.parameters !== undefined) {
      fields.push(`parameters = $${paramIndex}`);
      values.push(JSON.stringify(updates.parameters));
      paramIndex++;
    }

    if (updates.instruments !== undefined) {
      fields.push(`instruments = $${paramIndex}`);
      values.push(updates.instruments);
      paramIndex++;
    }

    if (fields.length === 0) {
      return this.getStrategyById(id);
    }

    fields.push('updated_at = NOW()');

    const query = `
      UPDATE strategies 
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    const strategy = result.rows[0];

    if (strategy) {
      strategy.parameters = JSON.parse(strategy.parameters);
    }

    return strategy || null;
  }

  async updateStrategyStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'TESTING'): Promise<Strategy | null> {
    const query = `
      UPDATE strategies 
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id, status]);
    const strategy = result.rows[0];

    if (strategy) {
      strategy.parameters = JSON.parse(strategy.parameters);
    }

    return strategy || null;
  }

  async deleteStrategy(id: string): Promise<boolean> {
    const query = `DELETE FROM strategies WHERE id = $1`;
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getActiveStrategies(): Promise<Strategy[]> {
    return this.getAllStrategies('ACTIVE');
  }

  async getStrategiesByInstrument(instrument: string): Promise<Strategy[]> {
    const query = `
      SELECT * FROM strategies 
      WHERE $1 = ANY(instruments)
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [instrument]);
    return result.rows.map((strategy: any) => ({
      ...strategy,
      parameters: JSON.parse(strategy.parameters),
    }));
  }

  async getStrategiesCount(status?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM strategies WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      query += ` AND status = $1`;
      params.push(status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Strategy Results methods
  async createStrategyResult(
    resultData: Omit<StrategyResult, 'id' | 'created_at' | 'updated_at'>
  ): Promise<StrategyResult> {
    const id = uuidv4();

    const query = `
      INSERT INTO strategy_results (
        id, strategy_id, instrument, total_trades, winning_trades,
        total_pnl, max_drawdown, win_rate, sharpe_ratio, start_date, end_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      id,
      resultData.strategy_id,
      resultData.instrument,
      resultData.total_trades,
      resultData.winning_trades,
      resultData.total_pnl,
      resultData.max_drawdown,
      resultData.win_rate,
      resultData.sharpe_ratio || null,
      resultData.start_date || null,
      resultData.end_date || null,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getStrategyResults(strategyId: string): Promise<StrategyResult[]> {
    const query = `
      SELECT * FROM strategy_results 
      WHERE strategy_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [strategyId]);
    return result.rows;
  }

  async deleteStrategyResults(strategyId: string): Promise<number> {
    const query = `DELETE FROM strategy_results WHERE strategy_id = $1`;
    const result = await db.query(query, [strategyId]);
    return result.rowCount || 0;
  }
}
