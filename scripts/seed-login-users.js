/**
 * Set known passwords for client_login_master test users.
 * Run: node scripts/seed-login-users.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const USERS = [
  {
    username: 'client1',
    email: 'c1@test.com',
    password: 'password',
    role: 'client',
  },
  {
    username: 'kaushal',
    email: 'kaushal@gmail.com',
    password: 'password',
    role: 'client',
  },
];

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await client.connect();

  for (const user of USERS) {
    const hash = await bcrypt.hash(user.password, 10);
    const existing = await client.query(
      'SELECT id FROM client_login_master WHERE email = $1 OR username = $2',
      [user.email, user.username]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE client_login_master
         SET username = $1, email = $2, password = $3, role = $4, status = 'active', updated_at = NOW()
         WHERE id = $5`,
        [
          user.username,
          user.email,
          hash,
          user.role,
          existing.rows[0].id,
        ]
      );
      console.log(`Updated: ${user.email} / ${user.username} → password: ${user.password}`);
    } else {
      await client.query(
        `INSERT INTO client_login_master (username, email, password, role, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [user.username, user.email, hash, user.role]
      );
      console.log(`Created: ${user.email} / ${user.username} → password: ${user.password}`);
    }
  }

  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
