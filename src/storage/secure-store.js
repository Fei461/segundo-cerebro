import { createSalt, decryptJson, deriveEncryptionKey, encryptJson } from "./crypto.js";
import { migrateStateToCurrentSchema } from "../domain/migrate.js";
import { validateImportedPayload } from "../domain/validate.js";
import { getMeta, getRecord, setMeta, setRecord } from "./indexeddb.js";
import { createDefaultState, mergeState, SCHEMA_VERSION } from "../domain/schema.js";

const META_KEY = "vault-meta";
const DATA_KEY = "app-state";

export class SecureStore {
  constructor() {
    this.sessionKey = null;
    this.sessionState = null;
  }

  async getVaultMeta() {
    return getMeta(META_KEY);
  }

  async hasVault() {
    return Boolean(await this.getVaultMeta());
  }

  async initializeVault(passphrase, state = createDefaultState()) {
    if (typeof passphrase !== "string" || passphrase.trim().length < 8) {
      throw new Error("La passphrase debe tener al menos 8 caracteres.");
    }

    const salt = createSalt();
    const key = await deriveEncryptionKey(passphrase, salt);
    const normalized = migrateStateToCurrentSchema(validateImportedPayload(mergeState(state)));
    const encrypted = await encryptJson(key, normalized);

    await setMeta(META_KEY, {
      schemaVersion: SCHEMA_VERSION,
      salt,
      createdAt: new Date().toISOString()
    });
    await setRecord(DATA_KEY, encrypted);

    this.sessionKey = key;
    this.sessionState = mergeState({
      ...normalized,
      appMeta: {
        ...normalized.appMeta,
        lastUnlockedAt: new Date().toISOString()
      }
    });

    return this.sessionState;
  }

  async unlock(passphrase) {
    const meta = await this.getVaultMeta();

    if (!meta) {
      throw new Error("La caja fuerte todavía no existe.");
    }

    const key = await deriveEncryptionKey(passphrase, meta.salt);
    const encrypted = await getRecord(DATA_KEY);

    if (!encrypted) {
      throw new Error("No existe ningún estado guardado.");
    }

    const state = migrateStateToCurrentSchema(validateImportedPayload(await decryptJson(key, encrypted)));

    this.sessionKey = key;
    this.sessionState = mergeState({
      ...state,
      appMeta: {
        ...state.appMeta,
        lastUnlockedAt: new Date().toISOString()
      }
    });

    return this.sessionState;
  }

  lock() {
    this.sessionKey = null;
    this.sessionState = null;
  }

  isUnlocked() {
    return Boolean(this.sessionKey);
  }

  async saveState(nextState) {
    if (!this.sessionKey) {
      throw new Error("La sesión está bloqueada.");
    }

    const merged = migrateStateToCurrentSchema(validateImportedPayload(mergeState(nextState)));
    const encrypted = await encryptJson(this.sessionKey, merged);
    await setRecord(DATA_KEY, encrypted);
    this.sessionState = merged;
    return merged;
  }

  getSessionState() {
    return this.sessionState ? mergeState(this.sessionState) : null;
  }
}
