import { db } from '@/database/connection';
import type { Holding } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class HoldingRepository {
  async getHolding(instrument: string): Promise<Holding | null> {
    const query = `SELECT * FROM holdings WHERE instrument = $1`;
    const result = await db.query(query, [instrument]);
    return result.rows[0] || null;
  }

  async getAllHoldings(): Promise<Holding[]> {
    const query = `SELECT * FROM holdings ORDER BY instrument`;
    const result = await db.query(query);
    return result.rows;
  }

  async updateHolding(
    instrument: string,
    quantity: number,
    averagePrice: number,
    realizedPnl: number = 0
  ): Promise<Holding> {
    const totalValue = quantity * averagePrice;

    const query = `
      INSERT INTO holdings (id, instrument, quantity, average_price, total_value, realized_pnl)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (instrument) 
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        average_price = EXCLUDED.average_price,
        total_value = EXCLUDED.total_value,
        realized_pnl = holdings.realized_pnl + EXCLUDED.realized_pnl,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [uuidv4(), instrument, quantity, averagePrice, totalValue, realizedPnl];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async updateUnrealizedPnl(instrument: string, currentPrice: number): Promise<Holding | null> {
    const holding = await this.getHolding(instrument);
    if (!holding) return null;

    const unrealizedPnl = (currentPrice - holding.average_price) * holding.quantity;
    const totalValue = holding.quantity * currentPrice;

    const query = `
      UPDATE holdings 
      SET unrealized_pnl = $2, total_value = $3, updated_at = NOW()
      WHERE instrument = $1
      RETURNING *
    `;

    const result = await db.query(query, [instrument, unrealizedPnl, totalValue]);
    return result.rows[0] || null;
  }

  async getHoldingsValue(): Promise<number> {
    const query = `SELECT COALESCE(SUM(total_value), 0) as total_value FROM holdings`;
    const result = await db.query(query);
    return parseFloat(result.rows[0].total_value) || 0;
  }

  async getTotalPnl(): Promise<{ realized: number; unrealized: number; total: number }> {
    const query = `
      SELECT 
        COALESCE(SUM(realized_pnl), 0) as realized_pnl,
        COALESCE(SUM(unrealized_pnl), 0) as unrealized_pnl
      FROM holdings
    `;

    const result = await db.query(query);
    const row = result.rows[0];
    const realized = parseFloat(row.realized_pnl) || 0;
    const unrealized = parseFloat(row.unrealized_pnl) || 0;

    return {
      realized,
      unrealized,
      total: realized + unrealized,
    };
  }

  async deleteHolding(instrument: string): Promise<boolean> {
    const query = `DELETE FROM holdings WHERE instrument = $1`;
    const result = await db.query(query, [instrument]);
    return (result.rowCount || 0) > 0;
  }

  async clearAllHoldings(): Promise<number> {
    const query = `DELETE FROM holdings`;
    const result = await db.query(query);
    return result.rowCount || 0;
  }

  async getHoldingsByValue(minValue: number = 0): Promise<Holding[]> {
    const query = `
      SELECT * FROM holdings 
      WHERE total_value >= $1 
      ORDER BY total_value DESC
    `;
    const result = await db.query(query, [minValue]);
    return result.rows;
  }
}
