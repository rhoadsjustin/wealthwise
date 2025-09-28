import * as SQLite from 'expo-sqlite';
import { Transaction, Category, User, Insight, BankAccount } from './schema/schema';

class LocalStorage {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'BudgetApp.db';

  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = SQLite.openDatabaseSync(this.dbName);
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create transactions table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          amount TEXT NOT NULL,
          type TEXT NOT NULL,
          categoryId INTEGER,
          userId INTEGER NOT NULL,
          date TEXT NOT NULL,
          aiCategorized INTEGER DEFAULT 0,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create categories table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          budget TEXT NOT NULL,
          userId INTEGER NOT NULL
        );
      `);

      // Create users table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS user (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          avatar TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create insights table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT,
          severity TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create bank accounts table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS bankAccounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          institutionId TEXT NOT NULL,
          institutionName TEXT NOT NULL,
          accountId TEXT NOT NULL,
          accountName TEXT NOT NULL,
          accountType TEXT NOT NULL,
          accountSubtype TEXT,
          mask TEXT,
          isActive INTEGER DEFAULT 1,
          lastSyncAt TEXT,
          accessToken TEXT NOT NULL,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create savings goals table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS savingsGoals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          targetAmount TEXT NOT NULL,
          currentAmount TEXT NOT NULL DEFAULT '0',
          monthlyContribution TEXT,
          startDate TEXT,
          targetDate TEXT,
          autoDeduct INTEGER DEFAULT 0,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create savings contributions table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS savingsContributions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          savingsGoalId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          amount TEXT NOT NULL,
          contributedOn TEXT NOT NULL,
          sourceTransactionId INTEGER,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (savingsGoalId) REFERENCES savingsGoals(id)
        );
      `);

      // Create settings table for app configuration
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

      // Create bills table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          categoryId INTEGER,
          name TEXT NOT NULL,
          amount TEXT NOT NULL,
          dueDay INTEGER,
          autoPay INTEGER DEFAULT 0,
          notes TEXT,
          lastPaidOn TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create bill payments table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS billPayments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          billId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          amount TEXT NOT NULL,
          paidOn TEXT NOT NULL,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (billId) REFERENCES bills(id)
        );
      `);

      // Create debts table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS debts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          totalAmount TEXT NOT NULL,
          currentBalance TEXT NOT NULL,
          interestRate TEXT,
          minimumPayment TEXT,
          dueDay INTEGER,
          categoryId INTEGER,
          notes TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create debt payments table
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS debtPayments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          debtId INTEGER NOT NULL,
          userId INTEGER NOT NULL,
          amount TEXT NOT NULL,
          paidOn TEXT NOT NULL,
          notes TEXT,
          categoryId INTEGER,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (debtId) REFERENCES debts(id)
        );
      `);

      console.log('✅ All database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  // Generic methods for CRUD operations
  async saveItem<T>(table: string, item: T & { id?: number }): Promise<T & { id: number }> {
    if (!this.db) throw new Error('Database not initialized');

    const keys = Object.keys(item as object).filter((key) => key !== 'id');
    const values = keys.map((key) => (item as any)[key]);
    const placeholders = keys.map(() => '?').join(', ');

    console.log(`💾 Saving to ${table}:`, { keys, values });

    if (item.id) {
      // Update existing item
      const setClause = keys.map((key) => `${key} = ?`).join(', ');
      try {
        this.db.runSync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, item.id]);
        console.log(`✅ Updated ${table} item with ID:`, item.id);
        return item as T & { id: number };
      } catch (error) {
        console.error(`❌ Error updating ${table}:`, error);
        throw error;
      }
    } else {
      // Insert new item
      try {
        const result = this.db.runSync(
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
          values
        );
        console.log(`✅ Inserted into ${table} with ID:`, result.lastInsertRowId);
        return { ...item, id: result.lastInsertRowId } as T & { id: number };
      } catch (error) {
        console.error(`❌ Error inserting into ${table}:`, error);
        console.error(
          `❌ SQL:`,
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
        );
        console.error(`❌ Values:`, values);
        throw error;
      }
    }
  }

  async getItem<T>(table: string, id: number): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.getFirstSync(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return result as T | null;
  }

  async getItems<T>(table: string, userId: number): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    console.log(`🔍 Querying ${table} for userId:`, userId);
    try {
      const results = this.db.getAllSync(`SELECT * FROM ${table} WHERE userId = ?`, [userId]);
      console.log(`📋 Query results from ${table}:`, results.length, 'items');
      if (results.length > 0) {
        console.log('🔍 First item:', results[0]);
      }
      return results as T[];
    } catch (error) {
      console.error(`❌ Error querying ${table}:`, error);
      throw error;
    }
  }

  async getAllItems<T>(table: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = this.db.getAllSync(`SELECT * FROM ${table}`);
    return results as T[];
  }

  async deleteItem(table: string, id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.runSync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  async clearStore(table: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.runSync(`DELETE FROM ${table}`);
  }

  async bulkSaveItems<T>(table: string, items: (T & { id?: number })[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const item of items) {
      await this.saveItem(table, item);
    }
  }

  // Settings helpers
  async getSetting(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.getFirstSync('SELECT value FROM settings WHERE key = ?', [key]);
    if (!result) return null;

    try {
      return JSON.parse((result as any).value);
    } catch {
      return (result as any).value;
    }
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      key,
      stringValue,
    ]);
  }

  // Custom query method
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.getAllSync(sql, params);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.closeSync();
      this.db = null;
    }
  }
}

export const localStorage = new LocalStorage();
