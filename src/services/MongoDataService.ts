import { MongoRepository } from '@/repositories/MongoRepository';
import { ValidationError } from '@/types';
import type { WithId, Document } from 'mongodb';

export class MongoDataService {
  private mongoRepository: MongoRepository;

  constructor() {
    this.mongoRepository = new MongoRepository();
  }

  async storeData(collectionName: string, data: any): Promise<{ id: string }> {
    this.validateCollectionName(collectionName);
    this.validateData(data);

    const id = await this.mongoRepository.insertDocument(collectionName, data);
    
    return { id };
  }

  async storeMultipleData(collectionName: string, data: any[]): Promise<{ ids: string[]; count: number }> {
    this.validateCollectionName(collectionName);
    
    if (!Array.isArray(data)) {
      throw new ValidationError('Data must be an array for bulk insert');
    }

    if (data.length === 0) {
      throw new ValidationError('Data array cannot be empty');
    }

    if (data.length > 10000) {
      throw new ValidationError('Cannot insert more than 10000 documents at once');
    }

    data.forEach((item, index) => {
      try {
        this.validateData(item);
      } catch (error: any) {
        throw new ValidationError(`Invalid data at index ${index}: ${error.message}`);
      }
    });

    const ids = await this.mongoRepository.insertManyDocuments(collectionName, data);
    
    return { ids, count: ids.length };
  }

  async getData(
    collectionName: string,
    options: {
      filter?: any;
      limit?: number;
      skip?: number;
      sort?: any;
      projection?: any;
    } = {}
  ): Promise<{ data: WithId<Document>[]; total: number }> {
    this.validateCollectionName(collectionName);

    // Validate pagination parameters
    if (options.limit && (options.limit <= 0 || options.limit > 10000)) {
      throw new ValidationError('Limit must be between 1 and 10000');
    }

    if (options.skip && options.skip < 0) {
      throw new ValidationError('Skip must be a positive number');
    }

    const data = await this.mongoRepository.findDocuments(collectionName, options.filter, {
      limit: options.limit,
      skip: options.skip,
      sort: options.sort,
      projection: options.projection
    });

    const total = await this.mongoRepository.countDocuments(collectionName, options.filter);

    return { data, total };
  }

  async getDataById(collectionName: string, id: string): Promise<WithId<Document> | null> {
    this.validateCollectionName(collectionName);
    this.validateId(id);

    return await this.mongoRepository.findDocumentById(collectionName, id);
  }

  async updateData(collectionName: string, id: string, data: any): Promise<{ success: boolean }> {
    this.validateCollectionName(collectionName);
    this.validateId(id);
    this.validateData(data);

    const success = await this.mongoRepository.updateDocument(collectionName, id, data);
    
    return { success };
  }

  async deleteData(collectionName: string, id: string): Promise<{ success: boolean }> {
    this.validateCollectionName(collectionName);
    this.validateId(id);

    const success = await this.mongoRepository.deleteDocument(collectionName, id);
    
    return { success };
  }

  async getCollections(): Promise<{ collections: string[] }> {
    const collections = await this.mongoRepository.getCollections();
    
    return { collections };
  }

  async getCollectionStats(collectionName: string): Promise<{ 
    name: string; 
    count: number; 
    exists: boolean;
  }> {
    this.validateCollectionName(collectionName);

    const collections = await this.mongoRepository.getCollections();
    const exists = collections.includes(collectionName);
    
    const count = exists ? await this.mongoRepository.countDocuments(collectionName) : 0;

    return {
      name: collectionName,
      count,
      exists
    };
  }

  async dropCollection(collectionName: string): Promise<{ success: boolean }> {
    this.validateCollectionName(collectionName);

    const success = await this.mongoRepository.dropCollection(collectionName);
    
    return { success };
  }

  private validateCollectionName(collectionName: string): void {
    if (!collectionName || typeof collectionName !== 'string') {
      throw new ValidationError('Collection name is required and must be a string');
    }

    if (collectionName.length < 1 || collectionName.length > 120) {
      throw new ValidationError('Collection name must be between 1 and 120 characters');
    }

    // MongoDB collection name validation
    if (/[\/\\. "$*<>:|?]/.test(collectionName)) {
      throw new ValidationError('Collection name contains invalid characters');
    }

    if (collectionName.startsWith('system.')) {
      throw new ValidationError('Collection name cannot start with "system."');
    }
  }

  private validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('ID is required and must be a string');
    }

    if (id.length !== 24) {
      throw new ValidationError('ID must be a valid 24-character MongoDB ObjectId');
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new ValidationError('ID must be a valid hexadecimal MongoDB ObjectId');
    }
  }

  private validateData(data: any): void {
    if (data === null || data === undefined) {
      throw new ValidationError('Data cannot be null or undefined');
    }

    if (typeof data !== 'object') {
      throw new ValidationError('Data must be an object');
    }

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      throw new ValidationError('Data contains circular references or is not serializable');
    }

    // Check data size (approximate, MongoDB has 16MB document limit)
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 15 * 1024 * 1024) { // 15MB limit to be safe
      throw new ValidationError('Document size exceeds maximum allowed size (15MB)');
    }
  }
}
