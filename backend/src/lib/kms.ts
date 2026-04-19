import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

const kms = new KMSClient({});
const KEY_ID = process.env.KMS_KEY_ID!;

export async function encryptString(plaintext: string): Promise<string> {
  const res = await kms.send(new EncryptCommand({
    KeyId: KEY_ID,
    Plaintext: Buffer.from(plaintext, 'utf-8'),
  }));
  return Buffer.from(res.CiphertextBlob!).toString('base64');
}

export async function decryptString(ciphertext: string): Promise<string> {
  const res = await kms.send(new DecryptCommand({
    CiphertextBlob: Buffer.from(ciphertext, 'base64'),
  }));
  return Buffer.from(res.Plaintext!).toString('utf-8');
}
