# KALOTURA — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-18  
**Status:** Draft

---

## 1. Overview

KALOTURA is a mobile-first web application for tracking daily caloric and nutritional intake. It leverages AI to parse natural-language food entries and calculate nutritional data, helping users understand and maintain their daily dietary balance.

---

## 2. Goals

- Allow users to log food and drinks in natural language with minimal friction.
- Use AI to automatically calculate calories, proteins, fibers, and carbs.
- Give users personalized daily nutritional targets based on their physical profile.
- Provide historical statistics and trend graphs for nutritional data.
- Store all data securely per-user in the cloud.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Animations | Framer Motion |
| State Management | Zustand |
| Data Fetching | TanStack Query v5 |
| Charts | Recharts |
| Authentication | AWS Cognito (via Amplify v6) |
| Backend API | AWS Lambda (Node.js 22) + API Gateway (HTTP API) |
| Database | AWS DynamoDB (single-table design, per-user partition) |
| AI Integration | User-supplied API key, configurable model provider |
| Hosting | AWS Amplify Hosting or S3 + CloudFront |
| IaC | AWS CDK v2 (TypeScript) |

> **Mobile-first constraint:** The UI is designed exclusively for mobile viewport (max-width 430px). When accessed on desktop, the app is rendered centered in a phone-shell frame — the rest of the viewport stays neutral/dark.

---

## 4. Authentication

### 4.1 Provider
AWS Cognito User Pool, integrated via AWS Amplify JS v6.

### 4.2 Flows
- **Sign Up** — email + password. Email verification code required.
- **Sign In** — email + password.
- **Forgot Password** — email-based reset code.
- **Sign Out** — clears Amplify session tokens.

### 4.3 Session Management
- Access and refresh tokens stored in `localStorage` by Amplify.
- All API requests include the Cognito `Authorization: Bearer <id_token>` header.
- Lambda authorizer validates the Cognito JWT on every request.

---

## 5. User Profile Setup

Triggered on first login (profile not yet created) or accessible from settings.

### 5.1 Required Fields

| Field | Type | Constraints |
|---|---|---|
| Full Name | String | 2–80 chars |
| Date of Birth | Date | Past date, age 10–120 |
| Sex | Enum | Male / Female / Other |
| Weight | Number | kg, 20–300 |
| Height | Number | cm, 50–250 |
| Fitness Level | Enum | Low / Medium / High |

### 5.2 Fitness Level Definitions
- **Low** — sedentary, little or no exercise.
- **Medium** — light exercise 1–3 days/week.
- **High** — moderate to intense exercise 4+ days/week.

### 5.3 Computed Targets (AI-generated on profile save)
After profile is saved, the app calls the AI model to compute and persist:

| Metric | Description |
|---|---|
| Daily Calorie Target | Total calories needed to maintain current weight |
| Passive Calories Burned (BMR) | Calories burned at rest (Mifflin–St Jeor as fallback) |
| Active Calories to Burn | Additional calories to burn through activity |
| Daily Protein Target | grams/day |
| Daily Fiber Target | grams/day |
| Daily Carbohydrates Target | grams/day |

Targets are stored in DynamoDB under the user's profile record and re-calculated whenever the profile is updated.

---

## 6. Settings Page

Accessible via a gear icon in the top-right of every screen.

### 6.1 AI Configuration

| Setting | Description |
|---|---|
| AI Provider | Dropdown: OpenAI / Anthropic / Custom |
| API Key | Encrypted at rest; masked in the UI (show last 4 chars) |
| Model Name | Text field (e.g. `gpt-4o`, `claude-sonnet-4-6`) |
| Base URL (optional) | For custom/self-hosted providers |

The API key is stored encrypted in DynamoDB and never returned to the frontend after initial save — only a masked version is shown.

### 6.2 Profile Settings
Link to the profile edit form (same as onboarding form, pre-filled).

### 6.3 Account
- Change password.
- Delete account (soft-delete with 30-day grace period, hard-delete via scheduled Lambda).

---

## 7. Main Page — Daily Food Log

### 7.1 Layout (top to bottom)

1. **Header bar** — app logo left, date selector center, settings icon right.
2. **Daily Summary Card** — progress rings or bars showing today's consumed vs. target for: Calories · Protein · Fiber · Carbs.
3. **Food Entry Textbox** — multiline text input, placeholder: *"e.g. 2 eggs, oatmeal with milk, black coffee, apple…"*
4. **Update Button** — primary CTA below the textbox.
5. **Status Banner** — inline, below the button, shown only during AI processing.
6. **Breakdown List** — per-food cards rendered after a successful calculation.
7. **Bottom Navigation Bar** — Home · Stats · Settings.

### 7.2 Food Entry & Calculation Flow

```
User types food list → taps "Update"
  → Status: "Connecting to AI model…"
  → API call to backend /entries POST
    → Lambda reads user profile + today's existing entry (if any)
    → Builds prompt with user profile + food text
    → Status: "Waiting for AI reply…"
    → Calls configured AI provider with API key
    → Status: "Processing nutritional data…"
    → Parses structured JSON response
    → Writes/updates DynamoDB entry for today
    → Returns structured response to frontend
  → Status banner disappears
  → Breakdown list renders
```

### 7.3 Status Messages (sequential, shown in order)
1. "Connecting to AI model…"
2. "Waiting for AI reply…"
3. "Processing nutritional data…"
4. "Saving your entry…"

Each message is shown with a subtle animated spinner. On error, show a red inline banner with the error description and a **Retry** button.

### 7.4 Breakdown List

Each food/drink item from the AI response renders as a collapsed card:

```
▶  2 scrambled eggs          180 kcal
```

Expanded card shows:

```
▼  2 scrambled eggs          180 kcal
   Protein  14 g
   Fiber     0 g
   Carbs     1 g
```

A **total row** at the bottom of the list shows the day's cumulative values.

### 7.5 Edit Mode

- The textbox remains editable at all times.
- Tapping **Update** again replaces the current day's entry.
- The previous entry is overwritten (no versioning required in v1).
- A confirmation dialog appears if a calculated entry already exists for the day: *"This will replace today's entry. Continue?"*

### 7.6 Date Navigation

The date selector in the header allows the user to navigate to any past day. Past-day entries load from DynamoDB and show in read-only mode with an **Edit** button to re-enable the textbox and allow re-calculation.

---

## 8. Statistics Page

Accessible via the **Stats** tab in the bottom navigation.

### 8.1 Metric Tabs
Four horizontal tabs at the top: **Calories · Protein · Fiber · Carbs**

### 8.2 Time Range Selector
Two toggle pills: **7 Days** | **30 Days**

### 8.3 Chart
- Bar chart (Recharts `BarChart`) showing daily consumed value.
- A horizontal reference line for the user's daily target for that metric.
- Bars exceeding the target are shown in a warning color (amber/red).
- Touch/tap a bar to show a tooltip with the exact value and date.

### 8.4 Timeline Navigation
- **← Prev** / **Next →** arrow buttons to shift the window back/forward by the selected range.
- The "Next" button is disabled when the window reaches today.

### 8.5 Summary Row (below chart)
Displays for the current window:
- Average daily value
- Days on target (consumed ≤ target)
- Days over target

---

## 9. Data Model (DynamoDB — Single Table)

**Table Name:** `kalotura-data`  
**Partition Key:** `PK` (String)  
**Sort Key:** `SK` (String)

### 9.1 User Profile Record
```
PK: USER#<cognitoSub>
SK: PROFILE
Attributes:
  fullName, dob, sex, weightKg, heightCm, fitnessLevel,
  targetCalories, targetProtein, targetFiber, targetCarbs,
  passiveCalories, activeCalories,
  aiProvider, aiModel, aiBaseUrl, aiKeyEncrypted, aiKeyHint,
  createdAt, updatedAt
```

### 9.2 Daily Entry Record
```
PK: USER#<cognitoSub>
SK: ENTRY#<YYYY-MM-DD>
Attributes:
  rawText,           // user's original natural-language input
  totalCalories,
  totalProtein,
  totalFiber,
  totalCarbs,
  items: [           // array of per-food objects
    {
      name,
      calories,
      protein,
      fiber,
      carbs
    }
  ],
  calculatedAt,
  updatedAt
```

### 9.3 Access Patterns

| Use Case | Key Expression |
|---|---|
| Get user profile | `PK = USER#<sub>, SK = PROFILE` |
| Get single day entry | `PK = USER#<sub>, SK = ENTRY#<date>` |
| Get last 30 days | `PK = USER#<sub>, SK BETWEEN ENTRY#<date-30> AND ENTRY#<today>` |

---

## 10. API Design (API Gateway + Lambda)

**Base URL:** `https://api.kalotura.app/v1`  
All endpoints require `Authorization: Bearer <cognitoIdToken>`.

### 10.1 Profile

| Method | Path | Description |
|---|---|---|
| GET | `/profile` | Fetch user profile + targets |
| PUT | `/profile` | Create or update profile; triggers AI target calculation |

### 10.2 AI Settings

| Method | Path | Description |
|---|---|---|
| PUT | `/settings/ai` | Save AI provider, model, API key (encrypted), base URL |
| GET | `/settings/ai` | Return masked AI settings (no raw key) |

### 10.3 Food Entries

| Method | Path | Description |
|---|---|---|
| POST | `/entries` | Create or replace entry for a given date; triggers AI calculation |
| GET | `/entries/:date` | Fetch entry for a specific date (`YYYY-MM-DD`) |
| GET | `/entries?from=&to=` | Fetch entries in a date range (max 90 days) |

### 10.4 AI Calculation (internal, not client-facing)
Lambda calls the user's configured AI provider synchronously during the POST `/entries` flow. The response must be a structured JSON object — the Lambda validates and maps it before writing to DynamoDB.

**AI prompt contract (system instruction excerpt):**
```
Return ONLY valid JSON with this shape:
{
  "items": [
    { "name": string, "calories": number, "protein": number, "fiber": number, "carbs": number }
  ],
  "totals": { "calories": number, "protein": number, "fiber": number, "carbs": number }
}
All numbers are per 100g equivalent portion as described in the user input.
```

---

## 11. Non-Functional Requirements

### 11.1 Performance
- AI calculation response end-to-end: < 10 seconds (p95).
- Page load (First Contentful Paint): < 2 seconds on 4G.
- DynamoDB reads: < 50 ms.

### 11.2 Security
- API keys stored encrypted (AWS KMS or application-layer AES-256 with a KMS-managed key).
- No PII logged in CloudWatch.
- HTTPS enforced everywhere.
- Cognito JWT validated on every Lambda invocation.
- CORS restricted to the app's domain.

### 11.3 Availability
- Target: 99.5% monthly uptime.
- Serverless architecture (Lambda + DynamoDB) provides auto-scaling by default.

### 11.4 Accessibility
- WCAG 2.1 AA compliance.
- Minimum touch target: 44×44 px.
- All interactive elements keyboard-accessible.

### 11.5 Browser Support
- iOS Safari 16+
- Android Chrome 110+
- Desktop Chrome/Firefox/Safari (rendered in mobile shell)

---

## 12. UI/UX Principles

- **Mobile shell on desktop:** A centered 390px-wide phone frame on a dark/neutral background. No responsive breakpoints needed beyond this shell.
- **Dark mode by default** with a toggle in Settings.
- **Minimal input friction:** One textbox, one button — the core interaction must be under 3 taps from home screen.
- **Immediate feedback:** Every async action shows status text or a skeleton loader. No silent loading states.
- **Color language:**
  - Green — on or under target.
  - Amber — 10–20% over target.
  - Red — > 20% over target.

---

## 13. Out of Scope (v1)

- Barcode / camera food scanning.
- Native iOS/Android apps.
- Social / sharing features.
- Meal planning or recipes.
- Integration with fitness trackers (Apple Health, Google Fit).
- Offline mode.
- Multi-language support.

---

## 14. Future Considerations (v2+)

- Push notifications for daily logging reminders.
- Export data as CSV/PDF.
- Barcode scanner via device camera.
- Fitness tracker API integration.
- Custom food database / frequently used items.
- Goal modes: weight loss, muscle gain.
