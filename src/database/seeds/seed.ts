import { db } from '../connection';
import type { CandleData } from '@/types';

// Sample candle data for seeding
const sampleCandles: Record<string, CandleData[]> = {
  BTCUSDT: [
    [1704067200, 42000, 42500, 41800, 42200, 1500.5, 0], // 2024-01-01 00:00:00
    [1704067260, 42200, 42300, 42000, 42100, 1200.3, 0], // 2024-01-01 00:01:00
    [1704067320, 42100, 42400, 42050, 42350, 1800.7, 0], // 2024-01-01 00:02:00
    [1704067380, 42350, 42600, 42300, 42500, 2100.2, 0], // 2024-01-01 00:03:00
    [1704067440, 42500, 42550, 42250, 42300, 1600.8, 0], // 2024-01-01 00:04:00
  ],
  ETHUSDT: [
    [1704067200, 2400, 2420, 2380, 2410, 850.5, 0],
    [1704067260, 2410, 2430, 2405, 2415, 720.3, 0],
    [1704067320, 2415, 2440, 2410, 2435, 960.7, 0],
    [1704067380, 2435, 2450, 2430, 2445, 1100.2, 0],
    [1704067440, 2445, 2455, 2425, 2430, 890.8, 0],
  ],
};

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Test connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }

    // Insert sample candle data
    for (const [instrument, candles] of Object.entries(sampleCandles)) {
      const values = candles
        .map(
          (candle) =>
            `('${instrument}', '1m', ${candle[0]}, ${candle[1]}, ${candle[2]}, ${candle[3]}, ${candle[4]}, ${candle[5]}, ${candle[6]})`
        )
        .join(',');

      const query = `
        INSERT INTO candles (instrument, timeframe, epoch_time, open_price, high_price, low_price, close_price, volume, open_interest)
        VALUES ${values}
        ON CONFLICT (instrument, timeframe, epoch_time) DO NOTHING
      `;

      await db.query(query);
      console.log(`✅ Seeded ${candles.length} candles for ${instrument}`);
    }

    console.log('🌱 Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
