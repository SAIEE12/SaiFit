const Database = require('better-sqlite3');
const path = require('path');

// Store the SQLite database file in the backend directory
const dbPath = path.resolve(__dirname, '../../saifit.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency when multiple devices connect
db.pragma('journal_mode = WAL');
// Enable foreign keys for SQLite
db.pragma('foreign_keys = ON');

console.log('Connected to local SQLite database');

module.exports = {
  // We mimic the pg pool.query API so we don't have to change the controllers.
  // This allows us to easily switch back to PostgreSQL later simply by replacing this file.
  query: async (text, params = []) => {
    // Convert PostgreSQL parameter binding syntax ($1, $2) to SQLite syntax (?)
    const sqliteText = text.replace(/\$\d+/g, '?');
    
    // Check if query is meant to return rows (SELECT or RETURNING)
    const isSelectOrReturning = sqliteText.trim().toUpperCase().startsWith('SELECT') || 
                                sqliteText.toUpperCase().includes('RETURNING');

    try {
      const stmt = db.prepare(sqliteText);
      
      if (isSelectOrReturning) {
        const rows = stmt.all(...params);
        return { rows };
      } else {
        const info = stmt.run(...params);
        // Map lastInsertRowid to id in case a driver expects it without RETURNING
        return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
      }
    } catch (err) {
      console.error('Database Query Error:', err);
      console.error('Query:', sqliteText);
      throw err;
    }
  },
  
  // Expose exec for running full schema files
  exec: (text) => db.exec(text)
};
