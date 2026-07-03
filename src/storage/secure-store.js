import { createSalt, decryptJson, deriveEncryptionKey, encryptJson, exportEncryptionKey, importEncryptionKey } from "./crypto.js";
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

  async exportSessionResumeToken() {
    if (!this.sessionKey) return null;
    const meta = await this.getVaultMeta();
    if (!meta?.salt) return null;
    return {
      salt: meta.salt,
      key: await exportEncryptionKey(this.sessionKey),
      savedAt: new Date().toISOString()
    };
  }

  async resumeFromToken(token) {
    if (!token?.salt || !token?.key) {
      throw new Error("Token de sesión no válido.");
    }

    const vaultStatus = await this.getVaultStatus();
    if (!vaultStatus.canUnlock || !vaultStatus.meta?.salt || vaultStatus.meta.salt !== token.salt) {
      throw new Error("La sesión recordada ya no corresponde con este vault.");
    }

    const key = await importEncryptionKey(token.key);
    const state = migrateStateToCurrentSchema(validateImportedPayload(await decryptJson(key, vaultStatus.encryptedRecord)));

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

  async changePassphrase(nextPassphrase) {
    if (!this.sessionKey || !this.sessionState) {
      throw new Error("La sesión está bloqueada.");
    }
    if (typeof nextPassphrase !== "string" || nextPassphrase.trim().length < 8) {
      throw new Error("La nueva passphrase debe tener al menos 8 caracteres.");
    }

    const salt = createSalt();
    const key = await deriveEncryptionKey(nextPassphrase, salt);
    const nextState = mergeState({
      ...this.sessionState,
      appMeta: {
        ...this.sessionState.appMeta,
        lastPassphraseChangeAt: new Date().toISOString(),
        lastUnlockedAt: new Date().toISOString()
      }
    });
    const encrypted = await encryptJson(key, nextState);

    await setRecord(DATA_KEY, encrypted);
    await setMeta(META_KEY, {
      schemaVersion: SCHEMA_VERSION,
      salt,
      createdAt: (await this.getVaultMeta())?.createdAt || new Date().toISOString()
    });

    this.sessionKey = key;
    this.sessionState = nextState;
    return this.sessionState;
  }
}
