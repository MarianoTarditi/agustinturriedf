import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const invalidPayload = () => new Error("Invalid outbox payload");
export type EncryptionKey = { id: string; value: string };
type DecryptionKeys = EncryptionKey | Record<string, string>;
const keyIdPattern = /^[A-Za-z0-9_-]+$/;
const base64urlPattern = /^[A-Za-z0-9_-]+$/;

const decodeKey = (key: EncryptionKey) => {
  if (!keyIdPattern.test(key.id) || !base64urlPattern.test(key.value)) throw invalidPayload();
  const decoded = Buffer.from(key.value, "base64url");
  if (decoded.length !== 32 || decoded.toString("base64url") !== key.value) throw invalidPayload();
  return decoded;
};

const selectKey = (keys: DecryptionKeys, keyId: string): EncryptionKey => {
  if ("id" in keys && "value" in keys) {
    const key = keys as EncryptionKey;
    if (key.id !== keyId) throw invalidPayload();
    return key;
  }
  if (!keys[keyId]) throw invalidPayload();
  return { id: keyId, value: keys[keyId] };
};

const decodeSegment = (segment: string, length?: number) => {
  if (!base64urlPattern.test(segment)) throw invalidPayload();
  const decoded = Buffer.from(segment, "base64url");
  if ((length !== undefined && decoded.length !== length) || decoded.toString("base64url") !== segment) throw invalidPayload();
  return decoded;
};

export const encryptPayload = (payload: unknown, key: EncryptionKey) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", decodeKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return ["v1", key.id, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
};

export const decryptPayload = <T>(envelope: string, keys: DecryptionKeys): T => {
  try {
    const [version, keyId, iv, tag, ciphertext, ...extra] = envelope.split(".");
    if (version !== "v1" || !keyIdPattern.test(keyId) || !iv || !tag || !ciphertext || extra.length) throw invalidPayload();
    const decodedIv = decodeSegment(iv, 12);
    const decodedTag = decodeSegment(tag, 16);
    const decodedCiphertext = decodeSegment(ciphertext);
    const decipher = createDecipheriv("aes-256-gcm", decodeKey(selectKey(keys, keyId)), decodedIv);
    decipher.setAuthTag(decodedTag);
    return JSON.parse(Buffer.concat([decipher.update(decodedCiphertext), decipher.final()]).toString("utf8")) as T;
  } catch {
    throw invalidPayload();
  }
};
