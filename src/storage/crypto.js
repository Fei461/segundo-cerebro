const ITERATIONS = 250000;
const KEY_LENGTH = 256;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function toBase64(bytes) {
  const binary = String.fromCharCode(...bytes);
  return window.btoa(binary);
}

function fromBase64(value) {
  const binary = window.atob(value);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function randomBytes(length = 16) {
  return window.crypto.getRandomValues(new Uint8Array(length));
}

export function createSalt() {
  return toBase64(randomBytes(16));
}

async function importPassphrase(passphrase) {
  return window.crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
}

export async function deriveEncryptionKey(passphrase, saltBase64) {
  const keyMaterial = await importPassphrase(passphrase);

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltBase64),
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: KEY_LENGTH
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptJson(key, payload) {
  const iv = randomBytes(12);
  const encoded = TEXT_ENCODER.encode(JSON.stringify(payload));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    iv: toBase64(iv),
    payload: toBase64(new Uint8Array(encrypted))
  };
}

export async function decryptJson(key, encryptedRecord) {
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(encryptedRecord.iv)
    },
    key,
    fromBase64(encryptedRecord.payload)
  );

  return JSON.parse(TEXT_DECODER.decode(decrypted));
}
