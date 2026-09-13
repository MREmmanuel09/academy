const Database = require('better-sqlite3');
const path = process.argv[2] || require('path').resolve(__dirname, '../apps/web/data/dev.db');
const db = new Database(path);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(tables.map(t => t.name).join('\n'));
db.close();
