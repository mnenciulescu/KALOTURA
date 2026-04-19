# KALOTURA

AI-powered daily nutrition tracker. Mobile-first web app built on AWS.

## Architecture

```
KALOTURA/
├── infrastructure/   AWS CDK v2 — Cognito, DynamoDB, KMS, Lambda, API Gateway
├── backend/          Lambda handlers (TypeScript, Node.js 22)
└── frontend/         Next.js 15, React 19, Tailwind v4
```

## Quick Start

### 1. Deploy Infrastructure

```bash
cd infrastructure
npm install
# Bootstrap CDK once per account/region
npx cdk bootstrap
# Deploy (outputs values needed for the frontend)
npm run deploy
```

After deploy, `infrastructure/cdk-outputs.json` will contain the values you need.

### 2. Configure Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in values from cdk-outputs.json
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the mobile shell is centered automatically on desktop.

---

## Feature Flow

1. **Sign up / Sign in** via AWS Cognito
2. **Onboarding** — enter name, DOB, sex, weight, height, fitness level
3. **Settings → AI Configuration** — add your OpenAI / Anthropic / custom API key
4. Once AI is configured, **daily nutrition targets** are calculated and saved to your profile
5. **Home page** — enter food consumed in natural language, tap **Update**
6. Watch the status banner (`Connecting…` → `Waiting…` → `Processing…` → `Saving…`)
7. Expandable per-food cards show calories, protein, fiber, carbs
8. **Stats page** — bar charts for any metric, 7/30-day windows, timeline navigation

## Tech Stack

| Layer | Tech |
|---|---|
| Auth | AWS Cognito + Amplify v6 |
| API | AWS API Gateway HTTP API (JWT authorizer) |
| Compute | AWS Lambda (Node.js 22, esbuild via CDK NodejsFunction) |
| Database | AWS DynamoDB (single-table, PAY_PER_REQUEST) |
| Encryption | AWS KMS (AI API key encrypted at rest) |
| Frontend | Next.js 15, React 19, Tailwind CSS v4, Framer Motion, Recharts |
| State | Zustand + TanStack Query v5 |
| IaC | AWS CDK v2 (TypeScript) |

## Environment Variables (frontend/.env.local)

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | CDK output `UserPoolId` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | CDK output `UserPoolClientId` |
| `NEXT_PUBLIC_API_URL` | CDK output `ApiUrl` (no trailing slash) |
| `NEXT_PUBLIC_AWS_REGION` | AWS region (e.g. `eu-west-1`) |
