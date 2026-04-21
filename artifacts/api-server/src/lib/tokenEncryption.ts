import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set; cannot encrypt integration tokens");
  return scryptSync(secret, "adapt-integration-tokens", 32);
}

/**
 * Encrypts a plaintext OAuth token using AES-256-GCM.
 * Output format: hex(iv):hex(authTag):hex(ciphertext)
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 * Returns null if the input is null/undefined.
 */
export function decryptToken(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
    if (!ivHex || !authTagHex || !encryptedHex) return null;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const encryptedData = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}
