import { AiSettings, UserProfile, DailyTargets, AiNutritionResponse } from '../types';

const NUTRITION_PROMPT = `You are a nutritionist AI. Given a list of foods and drinks, calculate the nutritional content.
Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "items": [{ "name": string, "calories": number, "protein": number, "fiber": number, "carbs": number, "healthyFats": number, "unhealthyFats": number }],
  "totals": { "calories": number, "protein": number, "fiber": number, "carbs": number, "healthyFats": number, "unhealthyFats": number }
}
Calories in kcal, all macros in grams. healthyFats = unsaturated fats (monounsaturated + polyunsaturated). unhealthyFats = saturated fats + trans fats. Be realistic based on typical portions described.`;

const TARGETS_PROMPT = `You are a nutritionist AI. Calculate daily nutritional targets to maintain current weight.
Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "targetCalories": number,
  "targetProtein": number,
  "targetFiber": number,
  "targetCarbs": number,
  "targetHealthyFats": number,
  "targetUnhealthyFats": number,
  "passiveCalories": number,
  "activeCalories": number
}
Calories in kcal, macros in grams. targetHealthyFats = recommended unsaturated fats. targetUnhealthyFats = maximum saturated + trans fats. Use Mifflin-St Jeor for BMR and apply appropriate activity multiplier.`;

type AiSettingsWithKey = AiSettings & { apiKey: string };

async function callOpenAI(settings: AiSettingsWithKey, system: string, user: string): Promise<string> {
  const url = settings.baseUrl
    ? `${settings.baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function callAnthropic(settings: AiSettingsWithKey, system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { content: Array<{ text: string }> };
  return data.content[0].text;
}

async function callAI(settings: AiSettingsWithKey, system: string, user: string): Promise<string> {
  if (settings.provider === 'anthropic') return callAnthropic(settings, system, user);
  return callOpenAI(settings, system, user);
}

function extractJson(raw: string): string {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

function parseAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export async function calculateNutrition(
  settings: AiSettingsWithKey,
  foodText: string,
): Promise<AiNutritionResponse> {
  const raw = await callAI(settings, NUTRITION_PROMPT, `Calculate nutrition for: ${foodText}`);
  return JSON.parse(extractJson(raw)) as AiNutritionResponse;
}

export async function calculateTargets(
  settings: AiSettingsWithKey,
  profile: UserProfile,
): Promise<DailyTargets> {
  const message = `User profile:
- Age: ${parseAge(profile.dob)} years
- Sex: ${profile.sex}
- Weight: ${profile.weightKg} kg
- Height: ${profile.heightCm} cm
- Fitness level: ${profile.fitnessLevel} (low=sedentary, medium=light exercise, high=moderate-intense)

Calculate daily nutritional targets to maintain current weight.`;

  const raw = await callAI(settings, TARGETS_PROMPT, message);
  return JSON.parse(extractJson(raw)) as DailyTargets;
}
