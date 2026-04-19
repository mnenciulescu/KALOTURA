import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleGetProfile, handlePutProfile } from './handlers/profile';
import { handleGetAiSettings, handlePutAiSettings } from './handlers/settings';
import { handleGetEntry, handleGetEntries, handlePostEntry } from './handlers/entries';
import { handleGetAdminUsers, handleDeleteUser, handleSetUserRole, handleAdminSetUserAi } from './handlers/admin';
import { getProfile } from './lib/dynamo';

const errResponse = (statusCode: number, message: string): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ error: message }),
});

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);

async function checkAdmin(userId: string, email: string): Promise<boolean> {
  if (ADMIN_EMAILS.includes(email)) return true;
  const profile = await getProfile(userId);
  return profile?.isAdmin === true;
}

type Claims = { sub?: string; email?: string };

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const claims = (event.requestContext as unknown as { authorizer?: { jwt?: { claims?: Claims } } })
    ?.authorizer?.jwt?.claims ?? {};

  const userId = claims.sub;
  const email = claims.email ?? '';

  if (!userId) return errResponse(401, 'Unauthorized');

  let body: Record<string, unknown> = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return errResponse(400, 'Invalid JSON body');
    }
  }

  try {
    switch (event.routeKey) {
      case 'GET /profile':
        return handleGetProfile(userId);
      case 'PUT /profile':
        return handlePutProfile(userId, body, email);
      case 'GET /settings/ai':
        return handleGetAiSettings(userId);
      case 'PUT /settings/ai':
        return handlePutAiSettings(userId, body as unknown as Parameters<typeof handlePutAiSettings>[1]);
      case 'GET /entries/{date}':
        return handleGetEntry(userId, event.pathParameters?.date ?? '');
      case 'POST /entries':
        return handlePostEntry(userId, body as { date: string; rawText: string });
      case 'GET /entries':
        return handleGetEntries(userId, event.queryStringParameters ?? {});

      // Admin routes
      case 'GET /admin/users': {
        if (!await checkAdmin(userId, email)) return errResponse(403, 'Forbidden');
        return handleGetAdminUsers();
      }
      case 'DELETE /admin/users/{userId}': {
        if (!await checkAdmin(userId, email)) return errResponse(403, 'Forbidden');
        const targetId = event.pathParameters?.userId ?? '';
        if (targetId === userId) return errResponse(400, 'Cannot delete your own account');
        return handleDeleteUser(targetId);
      }
      case 'PUT /admin/users/{userId}/role': {
        if (!await checkAdmin(userId, email)) return errResponse(403, 'Forbidden');
        const targetId = event.pathParameters?.userId ?? '';
        if (targetId === userId) return errResponse(400, 'Cannot change your own role');
        return handleSetUserRole(targetId, body as { isAdmin: boolean });
      }
      case 'PUT /admin/users/{userId}/ai': {
        if (!await checkAdmin(userId, email)) return errResponse(403, 'Forbidden');
        const targetId = event.pathParameters?.userId ?? '';
        return handleAdminSetUserAi(targetId, body as unknown as Parameters<typeof handleAdminSetUserAi>[1]);
      }

      default:
        return errResponse(404, 'Route not found');
    }
  } catch (e) {
    console.error('Unhandled error:', e);
    return errResponse(500, 'Internal server error');
  }
};
