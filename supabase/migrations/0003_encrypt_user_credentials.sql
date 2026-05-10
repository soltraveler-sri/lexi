-- v1 security baseline: BYOK API keys are now encrypted at rest using
-- AES-256-GCM with a key sourced from the LEXI_CREDENTIALS_KEY env var.
-- Encrypted values are stored in the same `api_key text` column with a
-- self-describing prefix (`lxenc:v1:<base64(iv||tag||ciphertext)>`).
--
-- The application's credentials repo encrypts on write and decrypts on read.
-- Existing plaintext rows are migrated by running:
--
--   pnpm migrate-credentials
--
-- The migration script (`scripts/migrate-credentials.mjs`) is idempotent;
-- rows already in the `lxenc:v1:` envelope are skipped.

comment on column user_credentials.api_key is
  'AES-256-GCM encrypted credential. Format: lxenc:v1:<base64(iv||authTag||ciphertext)>. See scripts/migrate-credentials.mjs and src/lib/security/credentialCipher.ts.';
