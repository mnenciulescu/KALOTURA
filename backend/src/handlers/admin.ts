import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { scanAllProfiles, getProfile, saveProfile, countUserEntries, deleteAllUserData, getAiSettings } from '../lib/dynamo';
import { handlePutAiSettings } from './settings';
import { AiSettings } from '../types';

const ok = (body: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const notFound = (): APIGatewayProxyResultV2 => ({
  statusCode: 404,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: 'User not found' }),
});

export async function handleGetAdminUsers(): Promise<APIGatewayProxyResultV2> {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  const profiles = await scanAllProfiles();
  const users = await Promise.all(
    profiles.map(async (profile) => {
      const [entryCount, aiSettings] = await Promise.all([
        countUserEntries(profile.userId),
        getAiSettings(profile.userId),
      ]);
      return {
        ...profile,
        entryCount,
        hasAiKey: !!aiSettings?.keyEncrypted,
        aiProvider: aiSettings?.provider,
        aiModel: aiSettings?.model,
        aiKeyHint: aiSettings?.keyHint,
        protected: profile.email ? adminEmails.includes(profile.email) : false,
      };
    }),
  );
  return ok(users);
}

export async function handleDeleteUser(targetUserId: string): Promise<APIGatewayProxyResultV2> {
  await deleteAllUserData(targetUserId);
  return ok({ success: true });
}

export async function handleSetUserRole(targetUserId: string, body: { isAdmin: boolean }): Promise<APIGatewayProxyResultV2> {
  const profile = await getProfile(targetUserId);
  if (!profile) return notFound();
  await saveProfile({ ...profile, isAdmin: body.isAdmin });
  return ok({ success: true });
}

export async function handleAdminSetUserAi(
  targetUserId: string,
  body: AiSettings & { apiKey?: string },
): Promise<APIGatewayProxyResultV2> {
  return handlePutAiSettings(targetUserId, body);
}
