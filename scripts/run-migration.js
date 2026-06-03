const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { connect, query, disconnect } = require('../src/connectivity/postgres');

const run = async () => {
  const file = process.argv[2] || '002_client_tables.sql';
  const sqlPath = path.resolve(__dirname, '../src/migration', file);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await connect();
  await query(sql);
  await disconnect();
  console.log(`Migration applied: ${file}`);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
