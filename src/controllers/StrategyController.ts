import { Elysia, t } from 'elysia';
import { StrategyService } from '@/services/StrategyService';

export const strategyController = new Elysia({ prefix: '/strategies' })
  .decorate('strategyService', new StrategyService())
  .post(
    '/',
    async ({ body, strategyService }: any) => {
      try {
        const strategy = await strategyService.createStrategy(body);

        return {
          success: true,
          data: strategy,
          message: 'Strategy created successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to create strategy',
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String({ maxLength: 1000 })),
        parameters: t.Record(t.String(), t.Any()),
        instruments: t.Array(t.String({ minLength: 1, maxLength: 50 }), { minItems: 1 }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Create a new strategy',
        description: 'Create a new trading strategy with parameters and target instruments',
      },
    }
  )
  .get(
    '/',
    async ({ query, strategyService }: any) => {
      try {
        const limit = parseInt(query.limit || '100');
        const offset = parseInt(query.offset || '0');

        const result = await strategyService.getAllStrategies(query.status, limit, offset);

        return {
          success: true,
          data: result.strategies,
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
          message: 'Failed to retrieve strategies',
        };
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.Union([t.Literal('ACTIVE'), t.Literal('INACTIVE'), t.Literal('TESTING')])),
        limit: t.Optional(t.String({ pattern: '^[1-9][0-9]*$' })),
        offset: t.Optional(t.String({ pattern: '^[0-9]+$' })),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Get all strategies',
        description: 'Retrieve all strategies with optional status filtering and pagination',
      },
    }
  )
  .get(
    '/:id',
    async ({ params, strategyService }: any) => {
      try {
        const strategy = await strategyService.getStrategy(params.id);

        return {
          success: true,
          data: strategy,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve strategy',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Get strategy by ID',
        description: 'Retrieve a specific strategy by its ID',
      },
    }
  )
  .put(
    '/:id',
    async ({ params, body, strategyService }: any) => {
      try {
        const strategy = await strategyService.updateStrategy(params.id, body);

        return {
          success: true,
          data: strategy,
          message: 'Strategy updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to update strategy',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String({ maxLength: 1000 })),
        parameters: t.Optional(t.Record(t.String(), t.Any())),
        instruments: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 50 }), { minItems: 1 })),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Update strategy',
        description: "Update an existing strategy's properties",
      },
    }
  )
  .delete(
    '/:id',
    async ({ params, strategyService }: any) => {
      try {
        await strategyService.deleteStrategy(params.id);

        return {
          success: true,
          message: 'Strategy deleted successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to delete strategy',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Delete strategy',
        description: 'Delete a strategy (only if no open positions exist)',
      },
    }
  )
  .put(
    '/:id/activate',
    async ({ params, strategyService }: any) => {
      try {
        const strategy = await strategyService.activateStrategy(params.id);

        return {
          success: true,
          data: strategy,
          message: 'Strategy activated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to activate strategy',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Activate strategy',
        description: 'Set strategy status to ACTIVE',
      },
    }
  )
  .put(
    '/:id/deactivate',
    async ({ params, strategyService }: any) => {
      try {
        const strategy = await strategyService.deactivateStrategy(params.id);

        return {
          success: true,
          data: strategy,
          message: 'Strategy deactivated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to deactivate strategy',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Deactivate strategy',
        description: 'Set strategy status to INACTIVE',
      },
    }
  )
  .post(
    '/deploy',
    async ({ body, strategyService }: any) => {
      try {
        const results = await strategyService.deployStrategies(body);

        return {
          success: true,
          data: results,
          message: 'Strategies deployed successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to deploy strategies',
        };
      }
    },
    {
      body: t.Object({
        strategy_ids: t.Array(t.String({ format: 'uuid' }), { minItems: 1 }),
        instruments: t.Array(t.String({ minLength: 1, maxLength: 50 }), { minItems: 1 }),
        start_date: t.Optional(t.String({ format: 'date-time' })),
        end_date: t.Optional(t.String({ format: 'date-time' })),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Deploy strategies',
        description: 'Deploy one or more strategies on instruments for backtesting and analysis',
      },
    }
  )
  .get(
    '/:id/results',
    async ({ params, strategyService }: any) => {
      try {
        const results = await strategyService.getStrategyResults(params.id);

        return {
          success: true,
          data: results,
          count: results.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve strategy results',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Get strategy results',
        description: 'Get backtest results and performance metrics for a strategy',
      },
    }
  )
  .get(
    '/instruments/:instrument',
    async ({ params, strategyService }: any) => {
      try {
        const strategies = await strategyService.getStrategiesByInstrument(params.instrument);

        return {
          success: true,
          data: strategies,
          count: strategies.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve strategies for instrument',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      detail: {
        tags: ['Strategy Management'],
        summary: 'Get strategies by instrument',
        description: 'Get all strategies that target a specific instrument',
      },
    }
  );
