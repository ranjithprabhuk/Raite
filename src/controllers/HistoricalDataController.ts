import { Elysia, t } from 'elysia';
import { HistoricalDataService } from '@/services/HistoricalDataService';
import type { CandleData } from '@/types';

export const historicalDataController = new Elysia({ prefix: '/candles' })
  .decorate('historicalDataService', new HistoricalDataService())
  .post(
    '/:instrument',
    async ({ params, body, historicalDataService }) => {
      try {
        const { instrument } = params;
        const { timeframe, candles } = body as { timeframe: string; candles: CandleData[] };

        await historicalDataService.storeCandles(instrument, timeframe, candles);

        return {
          success: true,
          message: `Successfully stored ${candles.length} candles for ${instrument}`,
          data: {
            instrument,
            timeframe,
            count: candles.length,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to store candles',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      body: t.Object({
        timeframe: t.String({
          pattern: '^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$',
          description: 'Valid timeframes: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M',
        }),
        candles: t.Array(
          t.Tuple([
            t.Number({ minimum: 1 }), // epoch_time
            t.Number({ minimum: 0 }), // open
            t.Number({ minimum: 0 }), // high
            t.Number({ minimum: 0 }), // low
            t.Number({ minimum: 0 }), // close
            t.Number({ minimum: 0 }), // volume
            t.Number({ minimum: 0 }), // open_interest
          ]),
          { minItems: 1, maxItems: 50000 }
        ),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Store historical candle data',
        description: 'Store bulk historical candle data for a given instrument and timeframe',
      },
    }
  )
  .get(
    '/:instrument',
    async ({ params, query, historicalDataService }) => {
      try {
        const { instrument } = params;
        const candles = await historicalDataService.getCandles(instrument, query);

        return {
          success: true,
          data: candles,
          count: candles.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve candles',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      query: t.Object({
        from: t.Optional(t.Numeric({ minimum: 1 })),
        to: t.Optional(t.Numeric({ minimum: 1 })),
        timeframe: t.Optional(
          t.String({
            pattern: '^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$',
          })
        ),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Retrieve candle data',
        description: 'Retrieve candle data for a given instrument with optional filtering',
      },
    }
  )
  .get(
    '/:instrument/latest',
    async ({ params, query, historicalDataService }) => {
      try {
        const { instrument } = params;
        const { timeframe } = query;

        if (!timeframe) {
          return {
            success: false,
            error: 'Timeframe is required',
            message: 'Please specify a timeframe',
          };
        }

        const candle = await historicalDataService.getLatestCandle(instrument, timeframe);

        return {
          success: true,
          data: candle,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve latest candle',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      query: t.Object({
        timeframe: t.String({
          pattern: '^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$',
        }),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Get latest candle',
        description: 'Get the most recent candle for an instrument and timeframe',
      },
    }
  )
  .get(
    '/:instrument/stats',
    async ({ params, query, historicalDataService }) => {
      try {
        const { instrument } = params;
        const { timeframe } = query;

        if (!timeframe) {
          return {
            success: false,
            error: 'Timeframe is required',
            message: 'Please specify a timeframe',
          };
        }

        const stats = await historicalDataService.getCandleStats(instrument, timeframe);

        return {
          success: true,
          data: stats,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve candle statistics',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      query: t.Object({
        timeframe: t.String({
          pattern: '^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$',
        }),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Get candle statistics',
        description: 'Get statistical information about candle data for an instrument',
      },
    }
  )
  .get(
    '/instruments',
    async ({ historicalDataService }) => {
      try {
        const instruments = await historicalDataService.getAvailableInstruments();

        return {
          success: true,
          data: instruments,
          count: instruments.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve instruments',
        };
      }
    },
    {
      detail: {
        tags: ['Historical Data'],
        summary: 'Get available instruments',
        description: 'Get list of all instruments with historical data',
      },
    }
  )
  .get(
    '/timeframes',
    async ({ query, historicalDataService }) => {
      try {
        const timeframes = await historicalDataService.getAvailableTimeframes(query.instrument);

        return {
          success: true,
          data: timeframes,
          count: timeframes.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve timeframes',
        };
      }
    },
    {
      query: t.Object({
        instrument: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Get available timeframes',
        description: 'Get list of all available timeframes, optionally filtered by instrument',
      },
    }
  )
  .delete(
    '/:instrument',
    async ({ params, query, historicalDataService }) => {
      try {
        const { instrument } = params;
        const deletedCount = await historicalDataService.deleteCandles(instrument, query.timeframe);

        return {
          success: true,
          message: `Successfully deleted ${deletedCount} candles`,
          data: {
            instrument,
            timeframe: query.timeframe,
            deleted_count: deletedCount,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to delete candles',
        };
      }
    },
    {
      params: t.Object({
        instrument: t.String({ minLength: 1, maxLength: 50 }),
      }),
      query: t.Object({
        timeframe: t.Optional(
          t.String({
            pattern: '^(1m|3m|5m|15m|30m|1h|2h|4h|6h|8h|12h|1d|3d|1w|1M)$',
          })
        ),
      }),
      detail: {
        tags: ['Historical Data'],
        summary: 'Delete candle data',
        description: 'Delete candle data for an instrument, optionally filtered by timeframe',
      },
    }
  );
