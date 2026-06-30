import { createSalt, decryptJson, deriveEncryptionKey, encryptJson } from "./crypto.js";
import { migrateStateToCurrentSchema } from "../domain/migrate.js";
import { validateImportedPayload } from "../domain/validate.js";
import { deleteMeta, deleteRecord, getMeta, getRecord, setMeta, setRecord } from "./indexeddb.js";
import { createDefaultState, mergeState, SCHEMA_VERSION } from "../domain/schema.js";
import { assessVaultHealth } from "./vault-health.js";

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

  async getVaultStatus() {
    const [meta, encryptedRecord] = await Promise.all([
      getMeta(META_KEY),
      getRecord(DATA_KEY)
    ]);

    return {
      ...assessVaultHealth(meta, encryptedRecord),
      meta,
      encryptedRecord
    };
  }

  async hasVault() {
    const status = await this.getVaultStatus();
    return status.canUnlock;
  }

  async initializeVault(passphrase, state = createDefaultState()) {
    if (typeof passphrase !== "string" || passphrase.trim().length < 8) {
      throw new Error("La passphrase debe tener al menos 8 caracteres.");
    }

    const salt = createSalt();
    const key = await deriveEncryptionKey(passphrase, salt);
    const normalized = migrateStateToCurrentSchema(validateImportedPayload(mergeState(state)));
    const encrypted = await encryptJson(key, normalized);

    await setRecord(DATA_KEY, encrypted);
    try {
      await setMeta(META_KEY, {
        schemaVersion: SCHEMA_VERSION,
        salt,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      await deleteRecord(DATA_KEY).catch(() => {});
      throw error;
    }

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
    const vaultStatus = await this.getVaultStatus();

    if (!vaultStatus.canUnlock) {
      if (vaultStatus.needsRepair) {
        throw new Error("El vault local está incompleto en este contexto. Restablécelo o importa un backup.");
      }
      throw new Error("La caja fuerte todavía no existe.");
    }

    const { meta, encryptedRecord: encrypted } = vaultStatus;
    const key = await deriveEncryptionKey(passphrase, meta.salt);
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

  async resetVault() {
    this.lock();
    await Promise.allSettled([
      deleteMeta(META_KEY),
      deleteRecord(DATA_KEY)
    ]);
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
