import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { getProfile, saveProfile, getAiSettings } from '../lib/dynamo';
import { decryptString } from '../lib/kms';
import { calculateTargets } from '../lib/ai';
import { UserProfile } from '../types';

const ok = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const notFound = (): APIGatewayProxyResultV2 => ({
  statusCode: 404,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'Profile not found' }),
});

export async function handleGetProfile(userId: string): Promise<APIGatewayProxyResultV2> {
  const profile = await getProfile(userId);
  return profile ? ok(profile) : notFound();
}

export async function handlePutProfile(userId: string, body: Partial<UserProfile>, email?: string): Promise<APIGatewayProxyResultV2> {
  const now = new Date().toISOString();
  const existing = await getProfile(userId);

  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  const isAdminByEmail = email ? adminEmails.includes(email) : false;

  const profile: UserProfile = {
    userId,
    email: email || existing?.email,
    isAdmin: existing?.isAdmin || isAdminByEmail,
    fullName: body.fullName ?? existing?.fullName ?? '',
    dob: body.dob ?? existing?.dob ?? '',
    sex: body.sex ?? existing?.sex ?? 'other',
    weightKg: body.weightKg ?? existing?.weightKg ?? 0,
    heightCm: body.heightCm ?? existing?.heightCm ?? 0,
    fitnessLevel: body.fitnessLevel ?? existing?.fitnessLevel ?? 'medium',
    targetCalories: existing?.targetCalories,
    targetProtein: existing?.targetProtein,
    targetFiber: existing?.targetFiber,
    targetCarbs: existing?.targetCarbs,
    passiveCalories: existing?.passiveCalories,
    activeCalories: existing?.activeCalories,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const aiSettings = await getAiSettings(userId);
  if (aiSettings?.keyEncrypted) {
    try {
      const apiKey = await decryptString(aiSettings.keyEncrypted);
      const targets = await calculateTargets({ ...aiSettings, apiKey }, profile);
      Object.assign(profile, targets);
    } catch (e) {
      console.warn('AI target calculation failed, skipping:', e);
    }
  }

  await saveProfile(profile);
  return ok(profile);
}
