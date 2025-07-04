import { db, initializeDatabase } from "./connection";

export interface MigrationResult {
  success: boolean;
  migrationsRun: number;
  error?: string;
}

export async function runMigrations(): Promise<MigrationResult> {
  try {
    console.log("🔄 Running MySQL database initialization...");
    
    // Initialize database and create tables
    await initializeDatabase();
    
    console.log("✅ Database initialization completed successfully");
    return { success: true, migrationsRun: 1 };
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    return { 
      success: false, 
      migrationsRun: 0, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function createSampleData(): Promise<void> {
  try {
    console.log("🔄 Creating sample data...");
    
    // Check if sample user already exists
    const [existingUser] = await db.execute('SELECT id FROM users WHERE username = ? LIMIT 1', ['demo_user']);
    
    if (!existingUser) {
      // Create sample user
      await db.execute(
        'INSERT INTO users (username, created_at) VALUES (?, NOW())',
        ['demo_user']
      );
      
      // Get the created user ID
      const [userResult] = await db.execute('SELECT LAST_INSERT_ID() as id');
      const userId = userResult[0].id;
      
      // Create sample mood entries
      const sampleMoods = [
        [userId, 8, JSON.stringify(['happy', 'energetic']), 'Great day at work!'],
        [userId, 6, JSON.stringify(['calm', 'peaceful']), 'Relaxing evening'],
        [userId, 7, JSON.stringify(['happy']), null]
      ];
      
      for (const mood of sampleMoods) {
        await db.execute(
          'INSERT INTO mood_entries (user_id, mood_score, emotions, notes, created_at) VALUES (?, ?, ?, ?, NOW())',
          mood
        );
      }
      
      console.log("✅ Sample data created successfully");
    } else {
      console.log("ℹ️ Sample data already exists");
    }
  } catch (error) {
    console.error("❌ Failed to create sample data:", error);
  }
}