import { readFile } from 'fs/promises';
import { resolve } from 'path';

export async function readCodici() {
  const filePath = resolve(process.cwd(), 'Codici.txt');
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const config: Record<string, string> = {};
  let pendingKey: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      pendingKey = null;
      continue;
    }

    if (pendingKey) {
      const looksLikeKey = /^[A-Z0-9 _-]+\s*:\s*/.test(line);
      if (looksLikeKey) {
        config[pendingKey] = '';
        pendingKey = null;
      } else {
        config[pendingKey] = line;
        pendingKey = null;
        continue;
      }
    }

    const delimiterIndex = line.indexOf(':');
    if (delimiterIndex >= 0) {
      const key = line.slice(0, delimiterIndex).trim().toUpperCase();
      const value = line.slice(delimiterIndex + 1).trim();

      if (value) {
        config[key] = value;
        pendingKey = null;
      } else {
        pendingKey = key;
      }
      continue;
    }

    // If the line has no colon and there is no pending key, ignore it.
  }

  const databaseUrl = config['TURSO_DATABASE_URL'] || config['TURSO_DATABASE_URL '];
  const authToken = config['TURSO_AUTH_TOKEN'] || config['TURSO_AUTH_TOKEN '];

  if (!databaseUrl || !authToken) {
    const foundKeys = Object.keys(config).join(', ');
    throw new Error(
      `Turso database URL or auth token is missing in Codici.txt. Chiavi trovate: ${foundKeys}`
    );
  }

  return {
    databaseUrl,
    authToken,
  };
}
