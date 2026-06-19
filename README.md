# SaiFit — Enterprise AI-Powered Fitness & Nutrition Platform

> **Version:** 2.0.0 · **Last Updated:** June 19, 2026  
> **Stack:** React Native (Expo 54) · Node.js/Express · SQLite · Google Gemini AI  
> **License:** Private · **Maintainer:** [@SAIEE12](https://github.com/SAIEE12)

SaiFit is a production-grade, context-aware mobile fitness and nutrition platform. It combines a unified design system, multi-model AI coaching with real-time Server-Sent Event (SSE) streaming, and a role-based governance portal to deliver personalized health intelligence across workouts, nutrition, hydration, sleep recovery, and lifestyle progression.

---

## 📐 System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT — React Native / Expo 54               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ AuthContext │  │ProfileContext│  │ ThemeContext (Dark/Light) │ │
│  └─────┬──────┘  └──────┬───────┘  └──────────┬───────────────┘ │
│        └────────────┬───┘                      │                 │
│              ┌──────▼──────┐          ┌────────▼────────┐       │
│              │  apiClient  │          │  Design System   │       │
│              │ (Axios+JWT) │          │  (theme.js)      │       │
│              └──────┬──────┘          └─────────────────┘       │
├─────────────────────┼───────────────────────────────────────────┤
│               HTTPS │ + SSE Stream                               │
├─────────────────────┼───────────────────────────────────────────┤
│                    SERVER — Node.js / Express 4.19               │
│  ┌─────────────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │  Auth Middleware │ │Usage Limiter │ │  Upload Middleware    │  │
│  └────────┬────────┘ └──────┬───────┘ └──────────┬───────────┘  │
│           └─────────┬───────┘                    │              │
│              ┌──────▼──────────────────────────────┐            │
│              │         Route Controllers           │            │
│              │  Auth · Nutrition · Workout · Chat  │            │
│              │  Recommendation · Hydration · Admin │            │
│              └──────┬──────────────────────────────┘            │
│           ┌─────────┼──────────┐                                │
│    ┌──────▼───┐ ┌───▼────┐ ┌──▼──────────────┐                 │
│    │ SQLite   │ │ Gemini │ │ Notification    │                 │
│    │ (DB)     │ │ AI     │ │ Service         │                 │
│    └──────────┘ └────────┘ └─────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

### AI Coaching Engine
- **Multi-Persona Conversational AI Chat** — Distinct coach identities (Workout Coach, Hydration Coach, Sleep Advisor, Progression Coach) with persistent SQL-backed conversation memory and context-aware lifestyle injection
- **Real-Time SSE Response Streaming** — Progressive token-by-token UI rendering via Server-Sent Events, eliminating blocking waits for AI responses
- **Resilient Multi-Model Fallback** — Automatic failover across Gemini model tiers (`gemini-2.0-flash` → `gemini-1.5-flash`) with graceful degradation on total failure
- **Smart Cache Invalidation** — Event-driven hooks that automatically clear stale AI caches when users log workouts, meals, hydration, or edit lifestyle tracks

### Health & Fitness
- **Daily Companion Coach** — Adaptive dashboard insights analyzing prior-day logs to generate recovery status, training adjustments, and motivational metrics
- **Meal Scan & Nutrition Tracker** — Text and photo-based food analysis powered by Gemini AI with MD5 image-hash deduplication caching
- **Concept Search Recipe Finder** — AI Nutrition Chef suggesting macro-balanced recipes against remaining daily targets
- **Workout Suggestion Engine** — Streak-aware personal trainer compiling consistency metrics and fatigue data for tomorrow's training split
- **Calendar Journey Analyst** — 14-day trailing log evaluation computing consistency scores, overtraining alerts, and milestone achievements

### Platform & Governance
- **System-Wide Dark/Light Mode** — Reactive theming with "Day Workout" / "Night Run" toggle via `ThemeContext` and styles factory pattern
- **Unified Design System** — 14+ reusable UI components, cohesive "Surface-Action-Semantic" color palette, Inter typography scale
- **Admin Governance Portal** — User management, invite code quotas, AI key configuration, usage analytics, and inactive user detection
- **Token Quota Middleware** — Per-user daily AI request limits enforced via invite code allocations with audit logging
- **Real-Time Notification Engine** — Backend-generated contextual notifications with focus-based polling and Toast alerts

---

## 📂 Project Structure

```text
Fit_app_m/
├── backend/                          # Node.js + Express REST API
│   ├── src/
│   │   ├── config/                   # Database, Gemini AI, Prompts, System config
│   │   ├── controllers/              # 11 route controllers (Auth → Chat)
│   │   ├── middlewares/              # Auth JWT, File Upload, AI Usage Limiter
│   │   ├── models/schema.sql         # Full database schema (21 tables)
│   │   ├── routes/                   # 11 route modules
│   │   ├── services/                 # NotificationService (event-driven)
│   │   ├── utils/                    # lifestyleContext, streaks helpers
│   │   └── server.js                 # Express entry + auto-migration
│   ├── .env.example
│   └── package.json
├── frontend/                         # React Native + Expo 54
│   ├── src/
│   │   ├── api/client.js             # Axios instance + JWT interceptor
│   │   ├── components/
│   │   │   ├── chat/                 # ChatBubble, ChatInput, QuickChips
│   │   │   ├── notifications/        # NotificationModal, ContextMenu, Toast
│   │   │   ├── ui/                   # 14 reusable UI components
│   │   │   └── workouts/            # GymLoggerModal, ActivityLoggerModal
│   │   ├── context/                  # AuthContext, ProfileContext, ThemeContext
│   │   ├── hooks/                    # useDialog, useAnimations
│   │   ├── screens/                  # 9 application screens
│   │   └── theme.js                  # Design tokens (colors, typography, spacing)
│   ├── App.js                        # Root: providers + navigation (Tab + Stack)
│   └── package.json
├── PROJECT_ANALYSIS.md               # Technical reference document
├── 2026-06-19.md                     # Task tracking log
└── README.md
```

---

## 🛠 Running the Application

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ 
- [Expo Go](https://expo.dev/expo-go) app on iOS/Android device (for device testing)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env    # Then edit with your credentials
npm run dev             # Hot-reload development server (port 5000)
```

**Environment Variables** (`backend/.env`):
| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes* | Google Gemini API key (*fallback if not set in Admin Portal) |
| `JWT_SECRET` | Yes | JWT token signing secret |
| `PORT` | No | Server port (default: `5000`) |

### Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
```
> **Note:** Use your machine's LAN IP (e.g. `192.168.1.167`) for physical device testing via Expo Go. Use `localhost` for emulators only.

```bash
npx expo start
```
Scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS Simulator).

---

## 🔒 Security & Resource Control

| Layer | Mechanism | Description |
|---|---|---|
| **Authentication** | JWT Bearer Token | Stored in AsyncStorage, attached via Axios interceptor |
| **Authorization** | Role-based (`user` / `admin`) | Admin routes gated by role check |
| **AI Rate Limiting** | `checkAiUsageLimit` middleware | Per-user daily cap tied to invite code quota |
| **AI Audit Trail** | `logAiUsage` middleware | Every AI request logged with type, timestamp, user |
| **Response Caching** | MD5 hash + `ai_cache` table | Image/text deduplication prevents redundant Gemini calls |
| **API Key Management** | DB-first, env fallback | Admin Portal configures keys; `.env` as fallback only |

---

## 🏗️ Architecture Patterns

| Pattern | Implementation |
|---|---|
| **Context-Driven State** | `AuthContext`, `ProfileContext`, `ThemeContext` eliminate prop-drilling |
| **Custom Hook Extraction** | `useDialog`, `useAnimations` decouple reusable logic from views |
| **Styles Factory** | `useThemedStyles(createStyles)` recalculates styles on theme change |
| **Resilient AI Engine** | Multi-model sequential fallback with graceful error objects |
| **SSE Streaming** | `XHR` + manual `data:` chunk parser for progressive AI rendering |
| **Event-Driven Cache** | Controller-level hooks invalidate stale AI data on user actions |
| **Notification Service** | Centralized `notificationService.js` generates context-aware alerts |
| **Lifestyle Context Injection** | Shared `lifestyleContext.js` utility enriches all AI prompts |

---

## 📊 Codebase Metrics

| Category | Count |
|---|---|
| Backend Controllers | 11 |
| Backend Routes | 11 |
| Frontend Screens | 9 |
| Reusable UI Components | 14 |
| Database Tables | 21 |
| AI Prompt Templates | 9+ |
| Total Backend LoC | ~3,500 |
| Total Frontend LoC | ~11,200 |
| **Total Project LoC** | **~14,700** |
