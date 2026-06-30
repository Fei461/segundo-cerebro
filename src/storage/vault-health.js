export function assessVaultHealth(meta, encryptedRecord) {
  const hasMeta = Boolean(meta && typeof meta === "object");
  const hasEncryptedPayload = Boolean(
    encryptedRecord &&
      typeof encryptedRecord === "object" &&
      typeof encryptedRecord.iv === "string" &&
      typeof encryptedRecord.payload === "string"
  );

  if (hasMeta && hasEncryptedPayload) {
    return {
      status: "ready",
      hasMeta,
      hasEncryptedPayload,
      canUnlock: true,
      needsRepair: false
    };
  }

  if (hasMeta || hasEncryptedPayload) {
    return {
      status: "incomplete",
      hasMeta,
      hasEncryptedPayload,
      canUnlock: false,
      needsRepair: true
    };
  }

  return {
    status: "empty",
    hasMeta,
    hasEncryptedPayload,
    canUnlock: false,
    needsRepair: false
  };
}
