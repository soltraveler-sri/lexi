#!/usr/bin/env node
/* eslint-disable no-console */
// One-shot script to encrypt existing plaintext rows in `user_credentials`
// once `LEXI_CREDENTIALS_KEY` is configured. Idempotent: rows already in the
// `lxenc:v1:` envelope are skipped.
//
// Usage:
//   DATABASE_URL=... LEXI_CREDENTIALS_KEY=... node scripts/migrate-credentials.mjs
//
// The encryption format must mirror src/lib/security/credentialCipher.ts.

import { createCipheriv, randomBytes } from "node:crypto";
import process from "node:process";

import postgres from "postgres";

const ENCRYPTED_PREFIX = "lxenc:v1:";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

function decodeKey(raw) {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error("LEXI_CREDENTIALS_KEY is not set.");
  }

  let buffer = null;
  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length === KEY_LENGTH_BYTES * 2) {
    buffer = Buffer.from(trimmed, "hex");
  } else {
    try {
      buffer = Buffer.from(trimmed, "base64");
    } catch {
      buffer = null;
    }
  }

  if (!buffer || buffer.length !== KEY_LENGTH_BYTES) {
    throw new Error(
      `LEXI_CREDENTIALS_KEY must decode to ${KEY_LENGTH_BYTES} bytes (base64 or hex).`,
    );
  }

  return buffer;
}

function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, ciphertext]).toString("base64");
  return `${ENCRYPTED_PREFIX}${payload}`;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const key = decodeKey(process.env.LEXI_CREDENTIALS_KEY);
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const rows = await sql`
      select id, api_key from user_credentials
      where api_key not like ${`${ENCRYPTED_PREFIX}%`}
    `;

    if (rows.length === 0) {
      console.log("No plaintext credentials to encrypt — nothing to do.");
      return;
    }

    console.log(`Encrypting ${rows.length} credential row(s)…`);
    let migrated = 0;

    for (const row of rows) {
      const encrypted = encrypt(row.api_key, key);
      await sql`
        update user_credentials
        set api_key = ${encrypted}, updated_at = now()
        where id = ${row.id}
      `;
      migrated += 1;
    }

    console.log(`Done. ${migrated} row(s) encrypted at rest.`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
