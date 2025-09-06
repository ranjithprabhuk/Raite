import { db } from '@/database/connection';
import type { Order, CreateOrderRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class OrderRepository {
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const id = uuidv4();
    const orderTime = orderData.order_time || new Date();

    const query = `
      INSERT INTO orders (id, instrument, side, quantity, price, order_time)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [id, orderData.instrument, orderData.side, orderData.quantity, orderData.price, orderTime];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getOrderById(id: string): Promise<Order | null> {
    const query = `SELECT * FROM orders WHERE id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async getOrders(instrument?: string, status?: string, limit: number = 100, offset: number = 0): Promise<Order[]> {
    let query = `SELECT * FROM orders WHERE 1=1`;
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

    query += ` ORDER BY order_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  async updateOrderStatus(
    id: string,
    status: 'FILLED' | 'CANCELLED',
    filledQuantity?: number,
    filledPrice?: number
  ): Promise<Order | null> {
    let query = `
      UPDATE orders 
      SET status = $2, updated_at = NOW()
    `;
    const params: any[] = [id, status];
    let paramIndex = 3;

    if (status === 'FILLED' && filledQuantity !== undefined) {
      query += `, filled_quantity = $${paramIndex}, filled_time = NOW()`;
      params.push(filledQuantity);
      paramIndex++;

      if (filledPrice !== undefined) {
        query += `, filled_price = $${paramIndex}`;
        params.push(filledPrice);
        paramIndex++;
      }
    }

    query += ` WHERE id = $1 RETURNING *`;

    const result = await db.query(query, params);
    return result.rows[0] || null;
  }

  async getPendingOrders(instrument?: string): Promise<Order[]> {
    let query = `SELECT * FROM orders WHERE status = 'PENDING'`;
    const params: any[] = [];

    if (instrument) {
      query += ` AND instrument = $1`;
      params.push(instrument);
    }

    query += ` ORDER BY order_time ASC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async getOrdersByDateRange(startDate: Date, endDate: Date, instrument?: string): Promise<Order[]> {
    let query = `
      SELECT * FROM orders 
      WHERE order_time BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate, endDate];
    let paramIndex = 3;

    if (instrument) {
      query += ` AND instrument = $${paramIndex}`;
      params.push(instrument);
    }

    query += ` ORDER BY order_time DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const query = `DELETE FROM orders WHERE id = $1`;
    const result = await db.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  async getOrdersCount(instrument?: string, status?: string): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM orders WHERE 1=1`;
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
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }
}
