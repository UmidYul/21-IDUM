import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path
const dbFile = join(__dirname, 'db.json');

// Configure lowdb to use JSON file for storage
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, {});

// Initialize database
await db.read();

// Set default data if db is empty
db.data ||= { news: [] };

// Don't write here - only set defaults in memory
// Writing will happen when routes modify data

export default db;
