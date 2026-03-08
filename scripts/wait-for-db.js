#!/usr/bin/env node
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const host = process.env.DB_HOST || '127.0.0.1';
const port = process.env.DB_PORT || 5432;
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'todo_db';

const timeoutSec = Number(process.env.WAIT_DB_TIMEOUT_SEC || 60);
const retryIntervalMs = Number(process.env.WAIT_DB_RETRY_MS || 2000);

async function tryConnect() {
  const config = DATABASE_URL
    ? { connectionString: DATABASE_URL }
    : { host, port, user, password, database };

  const client = new Client(config);
  try {
    await client.connect();
    await client.end();
    return true;
  } catch (err) {
    return false;
  }
}

(async function waitForDb() {
  const start = Date.now();
  process.stdout.write('Waiting for database to be ready...');
  while ((Date.now() - start) / 1000 < timeoutSec) {
    const ok = await tryConnect();
    if (ok) {
      console.log('\nDatabase is available');
      process.exit(0);
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, retryIntervalMs));
  }
  console.error('\nTimed out waiting for the database');
  process.exit(1);
})();
