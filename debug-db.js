const { openDatabaseAsync } = require('expo-sqlite');

async function debugDatabase() {
  console.log('🔍 Starting database debug...');

  try {
    // Open database
    const db = await openDatabaseAsync('budget.db');
    console.log('✅ Database opened successfully');

    // Create tables first
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        budget TEXT DEFAULT '0',
        userId INTEGER NOT NULL,
        syncStatus TEXT DEFAULT 'synced',
        lastModified INTEGER NOT NULL
      );
    `);
    console.log('✅ Categories table created');

    // Test data insertion
    const testCategory = {
      id: Math.floor(Date.now() + Math.random() * 1000),
      name: 'Test Category',
      icon: '🧪',
      color: '#FF6B6B',
      budget: '100',
      userId: 1,
      syncStatus: 'synced',
      lastModified: Date.now()
    };

    console.log('🧪 Test category data:', testCategory);

    // Try inserting
    await db.runAsync(
      `INSERT INTO categories (id, name, icon, color, budget, userId, syncStatus, lastModified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testCategory.id,
        testCategory.name,
        testCategory.icon,
        testCategory.color,
        testCategory.budget,
        testCategory.userId,
        testCategory.syncStatus,
        testCategory.lastModified
      ]
    );

    console.log('✅ Test category inserted successfully');

    // Verify insertion
    const result = await db.getFirstAsync('SELECT * FROM categories WHERE id = ?', [testCategory.id]);
    console.log('📋 Retrieved category:', result);

    // Clean up
    await db.runAsync('DELETE FROM categories WHERE id = ?', [testCategory.id]);
    console.log('🧹 Test data cleaned up');

  } catch (error) {
    console.error('❌ Database debug error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
  }
}

// Run the debug
debugDatabase();
