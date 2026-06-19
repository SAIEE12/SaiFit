# SaiFit — Engineering Roadmap & Next Steps
> **Created:** June 19, 2026  
> **Purpose:** Personal reference for future development — refactoring, new features, production readiness, and scaling strategy.

---

## 1. Immediate Refactoring (Phase 4 — Backend Hardening)

### 1.1 Extract AI Service Layer
**Why:** `recommendationController.js` (685 lines) mixes HTTP handling with AI business logic. This makes it untestable and hard to extend.

**How:**
```
backend/src/services/
├── notificationService.js    ← already exists
├── aiService.js              ← NEW: extract from recommendationController
├── chatService.js            ← NEW: extract from chatController
└── cacheService.js           ← NEW: centralize cache invalidation
```

**Pattern:**
```javascript
// services/aiService.js
class AIService {
  async getDailyInsight(userId) { /* prompt + generate + cache */ }
  async getWorkoutPlan(userId)  { /* prompt + generate + cache */ }
  async streamChatResponse(userId, coachType, message, onChunk) { /* SSE logic */ }
}
```

Controllers become thin HTTP adapters:
```javascript
// controllers/recommendationController.js
exports.getInsight = async (req, res) => {
  const result = await aiService.getDailyInsight(req.user.id);
  res.json(result);
};
```

### 1.2 Request Validation Middleware
**Why:** No input validation exists. Any malformed request hits the DB directly.

**How:** Create a lightweight schema validator (no heavy libraries needed for SQLite scale):
```
backend/src/middlewares/validate.js
backend/src/schemas/
├── auth.schema.js
├── workout.schema.js
├── nutrition.schema.js
└── chat.schema.js
```

**Pattern:**
```javascript
// middlewares/validate.js
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  next();
};
```

### 1.3 Standardize Error Responses
**Why:** Some endpoints return `{ error: "msg" }`, others return `{ message: "msg" }`, some return raw strings.

**How:** Create a unified error handler:
```javascript
// middlewares/errorHandler.js
module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: { code: err.code || 'INTERNAL_ERROR', message: err.message }
  });
};
```

### 1.4 Aggregated Dashboard Endpoint
**Why:** DashboardScreen makes 6+ parallel API calls on mount. A single endpoint reduces latency and network chatter.

**How:**
```
GET /api/dashboard?date=2026-06-19
Response: { calories, macros, hydration, workouts, recommendation, notifications }
```

This is a backend-for-frontend (BFF) pattern — aggregate multiple data sources into one response.

---

## 2. Production Readiness (Phase 5)

### 2.1 Authentication Hardening
| Task | Details |
|---|---|
| **Password Auth** | Currently username + invite code only. Add bcrypt password hashing (bcryptjs already installed) |
| **JWT Expiry** | Tokens never expire. Add `expiresIn: '7d'` to `jwt.sign()` |
| **Refresh Tokens** | Store refresh token in DB, rotate on each use, revoke on logout |
| **Rate Limiting** | Add `express-rate-limit` to `/api/auth/login` (5 attempts/15min) |

### 2.2 Database Migration System
**Why:** Schema changes are applied via raw SQL on startup. No versioning, no rollback.

**How:** Create a simple migration runner:
```
backend/src/migrations/
├── 001_initial_schema.sql
├── 002_add_notifications.sql
├── 003_add_ai_conversations.sql
└── runner.js  ← tracks applied migrations in a `_migrations` table
```

### 2.3 Environment Configuration
**Why:** Hardcoded values scattered across codebase.

**How:** Centralize into a config module:
```javascript
// config/env.js
module.exports = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  geminiKey: process.env.GEMINI_API_KEY,
  dbPath: process.env.DB_PATH || './saifit.db',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
};
```

### 2.4 Logging & Observability
**Why:** No structured logging. `console.log` only. No way to trace issues in production.

**Options (pick one):**
| Library | Why |
|---|---|
| **pino** | Fastest JSON logger for Node.js, minimal overhead |
| **winston** | More features, transport system (file, cloud) |

Add request-level logging middleware:
```javascript
app.use((req, res, next) => {
  logger.info({ method: req.method, path: req.path, userId: req.user?.id });
  next();
});
```

### 2.5 Health Check Endpoint
```javascript
app.get('/api/health', (req, res) => {
  const dbOk = db.prepare('SELECT 1').get();
  res.json({ status: 'ok', uptime: process.uptime(), db: !!dbOk });
});
```

---

## 3. New Features — Ideas & Integration Strategy

### 3.1 Progress Photos & Body Transformation Timeline
**What:** Users capture weekly progress photos. AI compares over time.

**Integration:**
- New table: `progress_photos (id, user_id, image_path, notes, created_at)`
- New route: `POST /api/progress/upload` (use existing Multer middleware)
- New screen: `ProgressScreen.js` — photo grid with date overlay
- AI feature: Monthly comparison prompt using Gemini vision model
- Navigation: Add as a new tab or as a section within ProfileScreen

### 3.2 Social & Accountability Features
**What:** Workout buddy system, shared challenges, leaderboards.

**Integration:**
- New tables: `friendships`, `challenges`, `challenge_participants`
- New routes: `/api/social/friends`, `/api/challenges`
- New screen: `CommunityScreen.js` — replace one tab or add to ProfileStack
- Leaderboard: Weekly aggregation query on `workout_logs` + `hydration_logs`

### 3.3 Wearable Device Integration
**What:** Sync heart rate, steps, sleep data from Apple Health / Google Fit.

**Integration:**
- Install: `react-native-health` (iOS) or `react-native-google-fit` (Android)
- New table: `wearable_sync (id, user_id, source, data_type, value, synced_at)`
- Inject wearable data into `lifestyleContext.js` for richer AI prompts
- Dashboard: New "Heart Rate" and "Steps" metric cards

### 3.4 Workout Timer & Rest Tracker
**What:** Built-in timer for sets with configurable rest periods and auto-progression.

**Integration:**
- New component: `WorkoutTimer.js` in `components/workouts/`
- Integrate into `GymLoggerModal.js` — start timer after logging a set
- Store rest durations in `workout_sets` table (add `rest_seconds` column)
- AI uses rest data to fine-tune recovery recommendations

### 3.5 Meal Plan Generator
**What:** AI generates a full weekly meal plan based on goals, preferences, and remaining macros.

**Integration:**
- New prompt: `PROMPT_MEAL_PLAN` in `prompts.js`
- New endpoint: `POST /api/nutrition/meal-plan`
- New screen section: Expandable card in MealsScreen showing today's suggested meals
- Cache weekly plans in `recommendations` table with `type = 'meal_plan'`

### 3.6 Export & Data Portability
**What:** Export all user data as PDF report or CSV for coaches/doctors.

**Integration:**
- Backend: `GET /api/export/report?range=30d` — generates JSON summary
- Frontend: Use `expo-print` + `expo-sharing` to create and share PDF
- Include: macros chart, workout history, AI insights, progress timeline

### 3.7 Push Notifications (Native)
**What:** Real native push notifications instead of in-app polling.

**Integration:**
- Install: `expo-notifications`
- Store push tokens: Add `push_token` column to `users` table
- Backend: Replace polling with `expo-server-sdk` push delivery
- Triggers: Hydration reminders, workout time, streak warnings, AI insights ready

---

## 4. Scaling Strategy — When Traffic Grows

### 4.1 Database Migration Path
```
Current: SQLite (single file, ~50 concurrent users max)
   ↓
Step 1: PostgreSQL (thousands of users, proper indexing, JSONB)
   ↓
Step 2: Read replicas + connection pooling (pg-pool)
   ↓
Step 3: Redis cache layer for hot data (sessions, AI cache)
```

**Migration approach:** The `db.js` wrapper already mimics pg-pool API. Switching to PostgreSQL requires:
1. Replace `better-sqlite3` with `pg` in `package.json`
2. Update `db.js` connection config
3. Convert `schema.sql` syntax (AUTOINCREMENT → SERIAL, etc.)
4. Controllers stay unchanged (same `db.query()` interface)

### 4.2 AI Cost Optimization
| Strategy | Impact |
|---|---|
| **Aggressive caching** | Already implemented. Extend TTL for stable data |
| **Prompt compression** | Reduce token count in system prompts by 30-40% |
| **Tiered models** | Use `gemini-1.5-flash` for simple queries, `2.0-flash` for complex |
| **Batch requests** | Aggregate dashboard AI calls into single prompt |
| **User-level quotas** | Already implemented via invite codes |

### 4.3 API Gateway Pattern (If Adding Microservices)
```
Current: Monolith (everything in one Express server)
   ↓
Future: API Gateway + Service Split

  Client → API Gateway (auth + rate limit)
              ├── User Service (auth, profile)
              ├── Fitness Service (workouts, hydration, meals)
              ├── AI Service (recommendations, chat, analysis)
              └── Notification Service (push, in-app)
```

**When to split:** Only when single-server performance becomes a bottleneck (likely 10K+ daily active users). Until then, the monolith is simpler to maintain.

---

## 5. Code Quality & DevOps

### 5.1 Testing Strategy
| Layer | Tool | What to Test |
|---|---|---|
| **Unit** | Jest | Service layer functions, utility helpers, prompt builders |
| **Integration** | Supertest | API endpoints with test SQLite DB |
| **Component** | React Native Testing Library | UI components in isolation |
| **E2E** | Detox or Maestro | Critical user flows (login → log workout → see AI plan) |

Priority order: Integration tests (API) → Unit tests (services) → E2E (top flows).

### 5.2 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    - npm install (backend + frontend)
    - npm test (backend)
    - npx expo export --platform web (frontend build check)
  lint:
    - npx eslint src/
  deploy:
    - EAS Build (Expo Application Services) for production APK/IPA
```

### 5.3 Code Organization Rules
- **Max screen file size:** 500 lines. Extract components/hooks when exceeded
- **No inline styles** for repeated patterns — use `useThemedStyles` factory
- **No business logic in controllers** — delegate to service layer
- **All AI prompts in `prompts.js`** — never hardcode in controllers

---

## 6. Feature Integration Checklist

When adding ANY new feature, follow this checklist:

```
□ 1. Database     — Add table/columns to schema.sql + create migration
□ 2. Backend      — Create controller + route + register in server.js
□ 3. Middleware    — Add validation schema if accepting user input
□ 4. AI Prompts   — Add to prompts.js if feature uses Gemini
□ 5. Cache Hook   — Add invalidation hook if feature affects AI context
□ 6. Frontend     — Create screen/component using design system tokens
□ 7. Navigation   — Register in App.js (Tab or Stack)
□ 8. Context      — Update AuthContext/ProfileContext if sharing state
□ 9. Theme        — Use useThemedStyles, support both light/dark
□ 10. Docs        — Update PROJECT_ANALYSIS.md + README.md
```

---

## 7. Quick Reference — Priority Order

| Priority | What | Effort | Impact |
|---|---|---|---|
| 🔴 Critical | Password auth + JWT expiry (5.1, 5.3) | 2-3 hrs | Security |
| 🔴 Critical | Request validation middleware (4.3) | 2 hrs | Security |
| 🟡 High | AI Service Layer extraction (4.1) | 4 hrs | Maintainability |
| 🟡 High | Login rate limiter (5.2) | 30 min | Security |
| 🟡 High | Error response standardization (4.4) | 2 hrs | DX |
| 🟢 Medium | Dashboard aggregated endpoint (4.2) | 3 hrs | Performance |
| 🟢 Medium | Workout Timer component (3.4) | 3 hrs | UX |
| 🟢 Medium | Meal Plan Generator (3.5) | 4 hrs | Feature |
| 🔵 Low | Progress Photos (3.1) | 6 hrs | Feature |
| 🔵 Low | Social / Leaderboards (3.2) | 8+ hrs | Feature |
| 🔵 Low | Wearable integration (3.3) | 8+ hrs | Feature |
| 🔵 Low | Native push notifications (3.7) | 4 hrs | UX |
