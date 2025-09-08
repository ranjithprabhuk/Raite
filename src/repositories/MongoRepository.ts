import { mongoConnection } from '@/database/mongoConnection';
import { ObjectId } from 'mongodb';
import type { WithId, Document } from 'mongodb';

export class MongoRepository {
  private async ensureConnection(): Promise<void> {
    if (!mongoConnection.isDbConnected()) {
      await mongoConnection.connect();
    }
  }

  async insertDocument(collectionName: string, document: any): Promise<string> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    // Add timestamp if not present
    const documentWithTimestamp = {
      ...document,
      createdAt: document.createdAt || new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection(collectionName).insertOne(documentWithTimestamp);
    return result.insertedId.toString();
  }

  async insertManyDocuments(collectionName: string, documents: any[]): Promise<string[]> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    // Add timestamps if not present
    const documentsWithTimestamp = documents.map(doc => ({
      ...doc,
      createdAt: doc.createdAt || new Date(),
      updatedAt: new Date()
    }));

    const result = await db.collection(collectionName).insertMany(documentsWithTimestamp);
    return Object.values(result.insertedIds).map(id => id.toString());
  }

  async findDocuments(
    collectionName: string,
    filter: any = {},
    options: {
      limit?: number;
      skip?: number;
      sort?: any;
      projection?: any;
    } = {}
  ): Promise<WithId<Document>[]> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    const cursor = db.collection(collectionName).find(filter, options.projection);
    
    if (options.sort) {
      cursor.sort(options.sort);
    }
    
    if (options.skip) {
      cursor.skip(options.skip);
    }
    
    if (options.limit) {
      cursor.limit(options.limit);
    }

    return await cursor.toArray();
  }

  async findDocumentById(collectionName: string, id: string): Promise<WithId<Document> | null> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    try {
      const objectId = new ObjectId(id);
      return await db.collection(collectionName).findOne({ _id: objectId });
    } catch (error) {
      // If invalid ObjectId format, return null
      return null;
    }
  }

  async updateDocument(collectionName: string, id: string, update: any): Promise<boolean> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    try {
      const objectId = new ObjectId(id);
      const updateWithTimestamp = {
        ...update,
        updatedAt: new Date()
      };
      
      const result = await db.collection(collectionName).updateOne(
        { _id: objectId },
        { $set: updateWithTimestamp }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    try {
      const objectId = new ObjectId(id);
      const result = await db.collection(collectionName).deleteOne({ _id: objectId });
      return result.deletedCount > 0;
    } catch (error) {
      return false;
    }
  }

  async countDocuments(collectionName: string, filter: any = {}): Promise<number> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    return await db.collection(collectionName).countDocuments(filter);
  }

  async getCollections(): Promise<string[]> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    const collections = await db.listCollections().toArray();
    return collections.map(col => col.name);
  }

  async dropCollection(collectionName: string): Promise<boolean> {
    await this.ensureConnection();
    const db = mongoConnection.getDb();
    
    try {
      await db.collection(collectionName).drop();
      return true;
    } catch (error) {
      // Collection might not exist
      return false;
    }
  }
}
