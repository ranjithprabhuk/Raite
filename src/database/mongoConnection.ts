import { MongoClient, Db } from 'mongodb';

class MongoConnection {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnected = false;

  async connect(): Promise<void> {
    if (this.isConnected && this.client && this.db) {
      return;
    }

    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://admin:password@localhost:27017';
      const dbName = process.env.MONGO_DB_NAME || 'socket-data';

      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      
      this.db = this.client.db(dbName);
      this.isConnected = true;

      console.log('✅ Connected to MongoDB successfully');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.isConnected = false;
      console.log('✅ Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db || !this.isConnected) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  isDbConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const mongoConnection = new MongoConnection();
