import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

function encryptionKey() {
  const key = Buffer.from(process.env.FINGERPRINT_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32) {
    throw new Error("FINGERPRINT_ENCRYPTION_KEY debe contener una clave base64 de 32 bytes");
  }
  return key;
}

export function protectFingerprintTemplate(template) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encryptedTemplate = Buffer.concat([cipher.update(template), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const digestKey = hkdfSync("sha256", key, Buffer.alloc(0), "fingerprint-template-digest", 32);
  const digest = createHmac("sha256", digestKey).update(template).digest();
  return { encryptedTemplate, iv, authTag, digest };
}

export function revealFingerprintTemplate(encryptedTemplate, iv, authTag) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedTemplate), decipher.final()]);
}
