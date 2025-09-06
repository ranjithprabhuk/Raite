import { db } from '../connection';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');

    // Test connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations();
}
