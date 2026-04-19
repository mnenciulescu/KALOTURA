import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getAiSettings, saveAiSettings } from '../lib/dynamo';
import { encryptString } from '../lib/kms';
import { AiSettings } from '../types';

const ok = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export async function handleGetAiSettings(userId: string): Promise<APIGatewayProxyResultV2> {
  const settings = await getAiSettings(userId);
  if (!settings) return ok(null);
  const { keyEncrypted: _, ...safe } = settings;
  return ok(safe);
}

export async function handlePutAiSettings(
  userId: string,
  body: AiSettings & { apiKey?: string },
): Promise<APIGatewayProxyResultV2> {
  const existing = await getAiSettings(userId);

  let keyEncrypted = existing?.keyEncrypted;
  let keyHint = existing?.keyHint;

  if (body.apiKey && body.apiKey.trim()) {
    keyEncrypted = await encryptString(body.apiKey.trim());
    keyHint = body.apiKey.trim().slice(-4);
  }

  const stored = {
    provider: body.provider,
    model: body.model,
    ...(body.baseUrl ? { baseUrl: body.baseUrl } : {}),
    keyHint,
    keyEncrypted,
  };

  await saveAiSettings(userId, stored);
  const { keyEncrypted: _, ...safe } = stored;
  return ok(safe);
}
