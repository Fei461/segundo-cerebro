import { migrateStateToCurrentSchema } from "../domain/migrate.js";
import { validateImportedPayload } from "../domain/validate.js";
import { createSalt, decryptJson, deriveEncryptionKey, encryptJson } from "./crypto.js";

export async function createEncryptedBackup(state, passphrase) {
  const salt = createSalt();
  const key = await deriveEncryptionKey(passphrase, salt);
  const normalized = migrateStateToCurrentSchema(validateImportedPayload(state));
  const encrypted = await encryptJson(key, normalized);

  return {
    kind: "encrypted-backup-v1",
    createdAt: new Date().toISOString(),
    schemaVersion: normalized.schemaVersion,
    salt,
    encrypted
  };
}

export async function importEncryptedBackup(rawText, passphrase) {
  const parsed = JSON.parse(rawText);

  if (parsed.kind !== "encrypted-backup-v1") {
    throw new Error("El archivo no es un backup cifrado compatible.");
  }

  const key = await deriveEncryptionKey(passphrase, parsed.salt);
  const decrypted = await decryptJson(key, parsed.encrypted);
  return migrateStateToCurrentSchema(validateImportedPayload(decrypted));
}
