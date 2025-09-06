import { Elysia, t } from 'elysia';
import { PaperTradingService } from '@/services/PaperTradingService';

export const paperTradingController = new Elysia({ prefix: '/trading' })
  .decorate('paperTradingService', new PaperTradingService())
  .post(
    '/orders',
    async ({ body, paperTradingService }: any) => {
      try {
        const order = await paperTradingService.createOrder(body);

        return {
          success: true,
          data: order,
          message: 'Order created successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to create order',
        };
      }
    },
    {
      body: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
        side: t.Union([t.Literal('BUY'), t.Literal('SELL')]),
        quantity: t.Number({ minimum: 0.00001 }),
        price: t.Number({ minimum: 0.00001 }),
        order_time: t.Optional(t.String({ format: 'date-time' })),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Create a new order',
        description: 'Simulate a buy/sell order with instrument, quantity, price, and time',
      },
    }
  )
  .get(
    '/orders',
    async ({ query, paperTradingService }: any) => {
      try {
        const limit = parseInt(query.limit || '100');
        const offset = parseInt(query.offset || '0');

        const result = await paperTradingService.getOrders(query.instrument, query.status, limit, offset);

        return {
          success: true,
          data: result.orders,
          pagination: {
            total: result.total,
            limit,
            offset,
            total_pages: Math.ceil(result.total / limit),
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve orders',
        };
      }
    },
    {
      query: t.Object({
        instrument: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        status: t.Optional(t.Union([t.Literal('PENDING'), t.Literal('FILLED'), t.Literal('CANCELLED')])),
        limit: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })),
        offset: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Get orders',
        description: 'Retrieve orders with optional filtering by instrument and status',
      },
    }
  )
  .put(
    '/orders/:id/cancel',
    async ({ params, paperTradingService }: any) => {
      try {
        const order = await paperTradingService.cancelOrder(params.id);

        return {
          success: true,
          data: order,
          message: 'Order cancelled successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to cancel order',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Cancel an order',
        description: 'Cancel a pending order by ID',
      },
    }
  )
  .get(
    '/holdings',
    async ({ paperTradingService }: any) => {
      try {
        const holdings = await paperTradingService.getHoldings();

        return {
          success: true,
          data: holdings,
          count: holdings.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve holdings',
        };
      }
    },
    {
      detail: {
        tags: ['Paper Trading'],
        summary: 'Get current holdings',
        description: 'Get current holdings by instrument',
      },
    }
  )
  .get(
    '/holdings/:instrument',
    async ({ params, paperTradingService }: any) => {
      try {
        const holding = await paperTradingService.getHolding(params.instrument);

        return {
          success: true,
          data: holding,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve holding',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Get holding for instrument',
        description: 'Get current holding for a specific instrument',
      },
    }
  )
  .get(
    '/positions',
    async ({ query, paperTradingService }: any) => {
      try {
        const limit = parseInt(query.limit || '100');
        const offset = parseInt(query.offset || '0');

        const result = await paperTradingService.getPositions(query.instrument, query.status, limit, offset);

        return {
          success: true,
          data: result.positions,
          pagination: {
            total: result.total,
            limit,
            offset,
            total_pages: Math.ceil(result.total / limit),
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve positions',
        };
      }
    },
    {
      query: t.Object({
        instrument: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
        status: t.Optional(t.Union([t.Literal('OPEN'), t.Literal('CLOSED')])),
        limit: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })),
        offset: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Get positions',
        description: 'View open and closed positions with optional filtering',
      },
    }
  )
  .put(
    '/positions/:id/close',
    async ({ params, body, paperTradingService }: any) => {
      try {
        const position = await paperTradingService.closePosition(params.id, body.exit_price);

        return {
          success: true,
          data: position,
          message: 'Position closed successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to close position',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        exit_price: t.Number({ minimum: 0.00001 }),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Close a position',
        description: 'Close an open position by specifying exit price',
      },
    }
  )
  .get(
    '/reports/pl',
    async ({ query, paperTradingService }: any) => {
      try {
        const report = await paperTradingService.getPnLReport(query.instrument);

        return {
          success: true,
          data: report,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to generate P&L report',
        };
      }
    },
    {
      query: t.Object({
        instrument: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Generate P&L report',
        description: 'Generate profit/loss reports, optionally filtered by instrument',
      },
    }
  )
  .put(
    '/positions/update-prices',
    async ({ body, paperTradingService }: any) => {
      try {
        await paperTradingService.updatePositionPrices(body.instrument, body.current_price);

        return {
          success: true,
          message: 'Position prices updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to update position prices',
        };
      }
    },
    {
      body: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
        current_price: t.Number({ minimum: 0.00001 }),
      }),
      detail: {
        tags: ['Paper Trading'],
        summary: 'Update position prices',
        description: 'Update unrealized P&L for open positions based on current market price',
      },
    }
  );
