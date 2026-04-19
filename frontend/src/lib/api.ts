import { fetchAuthSession } from 'aws-amplify/auth';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function getToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Not authenticated');
  return token;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export const getProfile = () => request<UserProfile | null>('GET', '/profile');
export const saveProfile = (data: Partial<UserProfile>) => request<UserProfile>('PUT', '/profile', data);

// ─── AI Settings ──────────────────────────────────────────────────────────────
export const getAiSettings = () => request<AiSettings | null>('GET', '/settings/ai');
export const saveAiSettings = (data: AiSettingsPayload) => request<AiSettings>('PUT', '/settings/ai', data);

// ─── Admin ────────────────────────────────────────────────────────────────────
export const getAdminUsers = () => request<AdminUser[]>('GET', '/admin/users');
export const deleteAdminUser = (userId: string) => request<{ success: boolean }>('DELETE', `/admin/users/${userId}`);
export const setAdminUserRole = (userId: string, isAdmin: boolean) =>
  request<{ success: boolean }>('PUT', `/admin/users/${userId}/role`, { isAdmin });
export const setAdminUserAi = (userId: string, payload: AiSettingsPayload) =>
  request<AiSettings>('PUT', `/admin/users/${userId}/ai`, payload);

// ─── Entries ──────────────────────────────────────────────────────────────────
export const getEntry = (date: string) => request<DailyEntry | null>('GET', `/entries/${date}`);
export const postEntry = (date: string, rawText: string) => request<DailyEntry>('POST', '/entries', { date, rawText });
export const getEntries = (from: string, to: string) =>
  request<DailyEntry[]>('GET', `/entries?from=${from}&to=${to}`);

// ─── Types (shared between frontend and API) ──────────────────────────────────
export interface UserProfile {
  userId: string;
  email?: string;
  isAdmin?: boolean;
  fullName: string;
  dob: string;
  sex: 'male' | 'female' | 'other';
  weightKg: number;
  heightCm: number;
  fitnessLevel: 'low' | 'medium' | 'high';
  targetCalories?: number;
  targetProtein?: number;
  targetFiber?: number;
  targetCarbs?: number;
  passiveCalories?: number;
  activeCalories?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser extends UserProfile {
  entryCount: number;
  hasAiKey: boolean;
  aiProvider?: string;
  aiModel?: string;
  aiKeyHint?: string;
  protected?: boolean;
}

export interface AiSettings {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  baseUrl?: string;
  keyHint?: string;
}

export interface AiSettingsPayload extends AiSettings {
  apiKey?: string;
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
}

export interface DailyEntry {
  userId: string;
  date: string;
  rawText: string;
  totalCalories: number;
  totalProtein: number;
  totalFiber: number;
  totalCarbs: number;
  items: FoodItem[];
  calculatedAt: string;
  updatedAt: string;
}
