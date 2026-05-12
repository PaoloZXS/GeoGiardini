import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const txt = await readFile(new URL('./Codici.txt', import.meta.url), 'utf8');
const lines = txt.split(/\r?\n/).map((line) => line.trim());
const config = {};
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  const match = line.match(/^([^:]+):\s*$/);
  if (match) {
    const key = match[1].trim();
    const next = lines[i + 1];
    if (next) {
      config[key] = next.trim();
      i++;
    }
  }
}

const db = createClient({ url: config['TURSO_DATABASE_URL'], authToken: config['TURSO_AUTH_TOKEN'] });
try {
  const result = await db.execute('PRAGMA table_info(giardinieri);', []);
  console.log(result.rows);
} catch (error) {
  console.error('Error querying giardinieri schema:', error);
} finally {
  await db.close();
}
