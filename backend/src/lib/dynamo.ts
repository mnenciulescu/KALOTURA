import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { UserProfile, AiSettingsStored, DailyEntry } from '../types';

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME!;

const pk = (userId: string) => `USER#${userId}`;
const PROFILE_SK = 'PROFILE';
const AI_SK = 'AI_SETTINGS';
const entrySK = (date: string) => `ENTRY#${date}`;

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk(userId), SK: PROFILE_SK } }));
  return (res.Item as UserProfile) ?? null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await doc.send(new PutCommand({ TableName: TABLE, Item: { PK: pk(profile.userId), SK: PROFILE_SK, ...profile } }));
}

export async function getAiSettings(userId: string): Promise<AiSettingsStored | null> {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk(userId), SK: AI_SK } }));
  return (res.Item as AiSettingsStored) ?? null;
}

export async function saveAiSettings(userId: string, settings: AiSettingsStored): Promise<void> {
  await doc.send(new PutCommand({ TableName: TABLE, Item: { PK: pk(userId), SK: AI_SK, ...settings } }));
}

export async function getEntry(userId: string, date: string): Promise<DailyEntry | null> {
  const res = await doc.send(new GetCommand({ TableName: TABLE, Key: { PK: pk(userId), SK: entrySK(date) } }));
  return (res.Item as DailyEntry) ?? null;
}

export async function saveEntry(entry: DailyEntry): Promise<void> {
  await doc.send(new PutCommand({ TableName: TABLE, Item: { PK: pk(entry.userId), SK: entrySK(entry.date), ...entry } }));
}

export async function getEntries(userId: string, from: string, to: string): Promise<DailyEntry[]> {
  const res = await doc.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :from AND :to',
    ExpressionAttributeValues: {
      ':pk': pk(userId),
      ':from': entrySK(from),
      ':to': entrySK(to),
    },
  }));
  return (res.Items as DailyEntry[]) ?? [];
}

export async function scanAllProfiles(): Promise<UserProfile[]> {
  const res = await doc.send(new ScanCommand({
    TableName: TABLE,
    FilterExpression: 'SK = :sk',
    ExpressionAttributeValues: { ':sk': PROFILE_SK },
  }));
  return (res.Items as UserProfile[]) ?? [];
}

export async function countUserEntries(userId: string): Promise<number> {
  const res = await doc.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': pk(userId), ':prefix': 'ENTRY#' },
    Select: 'COUNT',
  }));
  return res.Count ?? 0;
}

export async function deleteAllUserData(userId: string): Promise<void> {
  const res = await doc.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': pk(userId) },
    ProjectionExpression: 'PK, SK',
  }));
  const items = res.Items ?? [];
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await doc.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: chunk.map((item) => ({ DeleteRequest: { Key: { PK: item['PK'], SK: item['SK'] } } })),
      },
    }));
  }
}
