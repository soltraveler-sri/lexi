import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Self-describing prefix lets us tell encrypted values apart from legacy
// plaintext rows during the migration window without a schema change.
const ENCRYPTED_PREFIX = "lxenc:v1:";
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

class CredentialEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialEncryptionError";
  }
}

function decodeKey(raw: string | undefined): Buffer {
  const trimmed = raw?.trim();

  if (!trimmed) {
    throw new CredentialEncryptionError(
      "LEXI_CREDENTIALS_KEY is not set. Generate one with `node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"` and add it to your environment.",
    );
  }

  let buffer: Buffer | null = null;

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
    throw new CredentialEncryptionError(
      `LEXI_CREDENTIALS_KEY must decode to ${KEY_LENGTH_BYTES} bytes (base64 or hex). Generate one with \`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))\"\`.`,
    );
  }

  return buffer;
}

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  cachedKey = decodeKey(process.env.LEXI_CREDENTIALS_KEY);
  return cachedKey;
}

export function isEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function isEncryptedValue(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

export function encryptCredential(plaintext: string): string {
  if (!plaintext) {
    throw new CredentialEncryptionError("Cannot encrypt an empty credential.");
  }

  if (isEncryptedValue(plaintext)) {
    return plaintext;
  }

  const key = getKey();
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

export function decryptCredential(value: string): string {
  if (!isEncryptedValue(value)) {
    return value;
  }

  const key = getKey();
  const payload = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), "base64");

  if (payload.length < IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES + 1) {
    throw new CredentialEncryptionError("Encrypted credential payload is malformed.");
  }

  const iv = payload.subarray(0, IV_LENGTH_BYTES);
  const authTag = payload.subarray(
    IV_LENGTH_BYTES,
    IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES,
  );
  const ciphertext = payload.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}

export function resetCachedKeyForTests(): void {
  cachedKey = null;
}

export { CredentialEncryptionError };
