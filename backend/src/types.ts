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
  targetHealthyFats?: number;
  targetUnhealthyFats?: number;
  passiveCalories?: number;
  activeCalories?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettings {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  baseUrl?: string;
  keyHint?: string;
}

export interface AiSettingsStored extends AiSettings {
  keyEncrypted?: string;
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs: number;
  healthyFats: number;
  unhealthyFats: number;
}

export interface DailyEntry {
  userId: string;
  date: string;
  rawText: string;
  totalCalories: number;
  totalProtein: number;
  totalFiber: number;
  totalCarbs: number;
  totalHealthyFats: number;
  totalUnhealthyFats: number;
  items: FoodItem[];
  calculatedAt: string;
  updatedAt: string;
}

export interface DailyTargets {
  targetCalories: number;
  targetProtein: number;
  targetFiber: number;
  targetCarbs: number;
  targetHealthyFats: number;
  targetUnhealthyFats: number;
  passiveCalories: number;
  activeCalories: number;
}

export interface AiNutritionResponse {
  items: FoodItem[];
  totals: {
    calories: number;
    protein: number;
    fiber: number;
    carbs: number;
    healthyFats: number;
    unhealthyFats: number;
  };
}
