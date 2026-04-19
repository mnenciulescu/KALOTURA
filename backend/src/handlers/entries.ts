import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getEntry, saveEntry, getEntries, getAiSettings } from '../lib/dynamo';
import { decryptString } from '../lib/kms';
import { calculateNutrition } from '../lib/ai';
import { DailyEntry } from '../types';

const ok = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const err = (statusCode: number, message: string): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: message }),
});

export async function handleGetEntry(userId: string, date: string): Promise<APIGatewayProxyResultV2> {
  const entry = await getEntry(userId, date);
  return ok(entry ?? null);
}

export async function handleGetEntries(
  userId: string,
  params: Record<string, string | undefined>,
): Promise<APIGatewayProxyResultV2> {
  const { from, to } = params;
  if (!from || !to) return err(400, 'from and to query parameters are required');
  const entries = await getEntries(userId, from, to);
  return ok(entries);
}

export async function handlePostEntry(
  userId: string,
  body: { date: string; rawText: string },
): Promise<APIGatewayProxyResultV2> {
  if (!body?.date || !body?.rawText?.trim()) {
    return err(400, 'date and rawText are required');
  }

  const aiSettings = await getAiSettings(userId);
  if (!aiSettings?.keyEncrypted) {
    return err(422, 'AI settings are not configured. Please add your API key in Settings.');
  }

  const apiKey = await decryptString(aiSettings.keyEncrypted);
  const nutrition = await calculateNutrition({ ...aiSettings, apiKey }, body.rawText);

  const now = new Date().toISOString();
  const entry: DailyEntry = {
    userId,
    date: body.date,
    rawText: body.rawText,
    totalCalories: nutrition.totals.calories,
    totalProtein: nutrition.totals.protein,
    totalFiber: nutrition.totals.fiber,
    totalCarbs: nutrition.totals.carbs,
    totalHealthyFats: nutrition.totals.healthyFats,
    totalUnhealthyFats: nutrition.totals.unhealthyFats,
    items: nutrition.items,
    calculatedAt: now,
    updatedAt: now,
  };

  await saveEntry(entry);
  return ok(entry);
}
