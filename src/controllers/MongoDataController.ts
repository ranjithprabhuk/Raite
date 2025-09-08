import { Elysia, t } from 'elysia';
import { MongoDataService } from '@/services/MongoDataService';

export const mongoDataController = new Elysia({ prefix: '/socket-data' })
  .decorate('mongoDataService', new MongoDataService())
  .post(
    '/:collectionName',
    async ({ params, body, mongoDataService }) => {
      try {
        const collectionName = decodeURIComponent(params.collectionName);
        const result = await mongoDataService.storeData(collectionName, body);

        return {
          success: true,
          message: `Document stored successfully in ${collectionName}`,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to store document',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
      }),
      body: t.Any(),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Store document in collection',
        description: 'Store a document in the specified MongoDB collection. The document data is passed as-is in the request body.',
      },
    }
  )
  .post(
    '/:collectionName/bulk',
    async ({ params, body, mongoDataService }) => {
      try {
        const { collectionName } = params;
        const result = await mongoDataService.storeMultipleData(collectionName, body as any[]);

        return {
          success: true,
          message: `${result.count} documents stored successfully in ${collectionName}`,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to store documents',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
      }),
      body: t.Array(t.Any()),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Store multiple documents in collection',
        description: 'Store multiple documents in the specified MongoDB collection. The documents are passed as an array in the request body.',
      },
    }
  )
  .get(
    '/:collectionName',
    async ({ params, query, mongoDataService }) => {
      try {
        const { collectionName } = params;
        const { limit, skip, sort, filter, projection } = query;

        // Parse JSON strings if provided
        let parsedFilter = {};
        let parsedSort = {};
        let parsedProjection = {};

        if (filter) {
          try {
            parsedFilter = JSON.parse(filter);
          } catch (error) {
            return {
              success: false,
              error: 'Invalid filter JSON format',
              message: 'Filter must be valid JSON',
            };
          }
        }

        if (sort) {
          try {
            parsedSort = JSON.parse(sort);
          } catch (error) {
            return {
              success: false,
              error: 'Invalid sort JSON format',
              message: 'Sort must be valid JSON',
            };
          }
        }

        if (projection) {
          try {
            parsedProjection = JSON.parse(projection);
          } catch (error) {
            return {
              success: false,
              error: 'Invalid projection JSON format',
              message: 'Projection must be valid JSON',
            };
          }
        }

        const result = await mongoDataService.getData(collectionName, {
          filter: parsedFilter,
          limit,
          skip,
          sort: Object.keys(parsedSort).length > 0 ? parsedSort : undefined,
          projection: Object.keys(parsedProjection).length > 0 ? parsedProjection : undefined,
        });

        return {
          success: true,
          data: result.data,
          pagination: {
            total: result.total,
            limit: limit || result.total,
            skip: skip || 0,
            count: result.data.length,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve documents',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
      }),
      query: t.Object({
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 10000 })),
        skip: t.Optional(t.Numeric({ minimum: 0 })),
        filter: t.Optional(t.String({ description: 'JSON string for MongoDB filter query' })),
        sort: t.Optional(t.String({ description: 'JSON string for MongoDB sort specification' })),
        projection: t.Optional(t.String({ description: 'JSON string for MongoDB field projection' })),
      }),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Retrieve documents from collection',
        description: 'Retrieve documents from the specified MongoDB collection with optional filtering, sorting, and pagination.',
      },
    }
  )
  .get(
    '/:collectionName/:id',
    async ({ params, mongoDataService }) => {
      try {
        const { collectionName, id } = params;
        const document = await mongoDataService.getDataById(collectionName, id);

        if (!document) {
          return {
            success: false,
            error: 'Document not found',
            message: `Document with ID ${id} not found in ${collectionName}`,
          };
        }

        return {
          success: true,
          data: document,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve document',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
        id: t.String({ minLength: 24, maxLength: 24, pattern: '^[0-9a-fA-F]{24}$' }),
      }),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Retrieve document by ID',
        description: 'Retrieve a specific document from the collection by its MongoDB ObjectId.',
      },
    }
  )
  .put(
    '/:collectionName/:id',
    async ({ params, body, mongoDataService }) => {
      try {
        const { collectionName, id } = params;
        const result = await mongoDataService.updateData(collectionName, id, body);

        if (!result.success) {
          return {
            success: false,
            error: 'Document not found or not modified',
            message: `Document with ID ${id} not found or no changes applied`,
          };
        }

        return {
          success: true,
          message: `Document updated successfully in ${collectionName}`,
          data: { id, modified: true },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to update document',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
        id: t.String({ minLength: 24, maxLength: 24, pattern: '^[0-9a-fA-F]{24}$' }),
      }),
      body: t.Any(),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Update document by ID',
        description: 'Update a specific document in the collection by its MongoDB ObjectId.',
      },
    }
  )
  .delete(
    '/:collectionName/:id',
    async ({ params, mongoDataService }) => {
      try {
        const { collectionName, id } = params;
        const result = await mongoDataService.deleteData(collectionName, id);

        if (!result.success) {
          return {
            success: false,
            error: 'Document not found',
            message: `Document with ID ${id} not found in ${collectionName}`,
          };
        }

        return {
          success: true,
          message: `Document deleted successfully from ${collectionName}`,
          data: { id, deleted: true },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to delete document',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
        id: t.String({ minLength: 24, maxLength: 24, pattern: '^[0-9a-fA-F]{24}$' }),
      }),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Delete document by ID',
        description: 'Delete a specific document from the collection by its MongoDB ObjectId.',
      },
    }
  )
  .get(
    '/collections',
    async ({ mongoDataService }) => {
      try {
        const result = await mongoDataService.getCollections();

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve collections',
        };
      }
    },
    {
      detail: {
        tags: ['MongoDB Data'],
        summary: 'List all collections',
        description: 'Get a list of all collections in the socket-data database.',
      },
    }
  )
  .get(
    '/:collectionName/stats',
    async ({ params, mongoDataService }) => {
      try {
        const { collectionName } = params;
        const result = await mongoDataService.getCollectionStats(collectionName);

        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve collection stats',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
      }),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Get collection statistics',
        description: 'Get statistics about a specific collection including document count and existence status.',
      },
    }
  )
  .delete(
    '/:collectionName',
    async ({ params, mongoDataService }) => {
      try {
        const { collectionName } = params;
        const result = await mongoDataService.dropCollection(collectionName);

        return {
          success: true,
          message: `Collection ${collectionName} ${result.success ? 'dropped successfully' : 'was not found or already empty'}`,
          data: { collectionName, dropped: result.success },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to drop collection',
        };
      }
    },
    {
      params: t.Object({
        collectionName: t.String({ minLength: 1, maxLength: 120 }),
      }),
      detail: {
        tags: ['MongoDB Data'],
        summary: 'Drop collection',
        description: 'Drop (delete) an entire collection and all its documents. Use with caution!',
      },
    }
  );
