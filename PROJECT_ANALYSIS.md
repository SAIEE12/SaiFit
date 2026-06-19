# SaiFit — Enterprise Project Analysis
> **Last Updated:** June 19, 2026  
> **Purpose:** Definitive technical reference for the entire platform. Eliminates redundant analysis across sessions.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT — React Native / Expo 54               │
│  React Native 0.81.5 · Expo SDK 54 · React 19.1                │
│  Navigation: Bottom Tabs (5) + RootStack (AIChatScreen)         │
│  State: AuthContext + ProfileContext + ThemeContext              │
├─────────────────────────────────────────────────────────────────┤
│              Axios apiClient.js → Bearer JWT (AsyncStorage)     │
│              SSE: XHR stream with manual chunk parser            │
│              BASE_URL = EXPO_PUBLIC_API_URL                      │
├─────────────────────────────────────────────────────────────────┤
│                    SERVER — Node.js / Express 4.19               │
│  better-sqlite3 9.4 · JWT Auth · Multer uploads                │
│  Gemini AI 0.24.1 (multi-model fallback + SSE streaming)        │
│  Port: 5000 · DB: ./saifit.db (auto-migrated)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Stack
| Package | Version | Purpose |
|---|---|---|
| express | 4.19.2 | HTTP server and routing |
| better-sqlite3 | 9.4.3 | SQLite DB (pg-pool compatible API via db.js) |
| @google/generative-ai | 0.24.1 | Gemini AI content generation + streaming |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 2.4.3 | Password hashing |
| multer | 1.4.5 | File upload handling |
| dotenv | 16.4.5 | Environment variable loading |

### Frontend Stack
| Package | Version | Purpose |
|---|---|---|
| expo | ~54.0.0 | App framework |
| react-native | 0.81.5 | UI runtime |
| react | 19.1.0 | Component model |
| @react-navigation/* | ^6.x | Navigation (bottom-tabs + native-stack) |
| axios | 1.6.8 | HTTP client |
| expo-camera | ~17.0.10 | Camera access for food scanning |
| expo-image-picker | ~17.0.11 | Gallery image picker |
| expo-font | ^56.0.7 | Custom font loading (Inter) |
| @expo-google-fonts/inter | ^0.4.2 | Inter typeface |

---

## 2. Navigation Map

```
App.js
├── LoginScreen (unauthenticated)
├── ChoosePathScreen (onboarding — shown if no tracks selected)
└── RootStack (authenticated)
    ├── MainTabs
    │   ├── Tab: "My Space"  → DashboardScreen
    │   ├── Tab: "Workouts"  → WorkoutsScreen
    │   ├── Tab: "Meals"     → MealsScreen
    │   ├── Tab: "Calendar"  → CalendarScreen
    │   └── Tab: "Profile"   → ProfileStack
    │       ├── ProfileMain      → ProfileScreen
    │       ├── Admin            → AdminScreen
    │       └── ChoosePathEdit   → ChoosePathScreen (isEdit=true)
    └── AIChat → AIChatScreen (modal, receives coachType param)
```

---

## 3. Database Schema (SQLite — 21 Tables)

**File:** `backend/src/models/schema.sql` (233 lines)

| Table | Purpose |
|---|---|
| `users` | Auth accounts (username, password_hash, role, invite_code_id, daily_usage_count) |
| `user_profiles` | Body metrics (age, gender, height, weight, target_weight, dietary_philosophy) |
| `invite_codes` | Governance tokens (code, max_daily_requests, is_used, assigned_user_id) |
| `workout_logs` | Gym sessions (user_id, date, notes, duration_minutes) |
| `workout_sets` | Set-level detail per exercise (sets, reps, weight) |
| `exercises` | Master exercise catalog (name, category, muscle_group) |
| `meals` | Nutrition entries (meal_type, food_name, calories, protein, carbs, fats) |
| `food_logs` | Meal image/text analysis logs |
| `hydration_logs` | Daily water intake (amount_ml) |
| `activity_logs` | Custom activities — yoga, dance, meditation (category, duration, intensity) |
| `lifestyle_tracks` | Training paths (key, display_name, description) |
| `user_tracks` | User-to-track assignments (is_primary flag) |
| `user_goals` | Fitness goals (goal_type, target_value) |
| `recommendations` | Cached AI recommendations (type, content JSON, date) |
| `ai_cache` | MD5-keyed AI response cache for deduplication |
| `ai_usage_logs` | Per-request AI usage audit trail (request_type, timestamp) |
| `ai_conversations` | Chat history (user_id, coach_type, role, message, timestamp) |
| `notifications` | System-generated contextual notifications |
| `notification_preferences` | Per-user coach tone and category muting |
| `system_settings` | App-wide config key/value (stores gemini_api_key) |

---

## 4. API Routes

| Route File | Prefix | Key Endpoints |
|---|---|---|
| authRoutes.js | /api/auth | POST /login, POST /register, GET /me |
| profileRoutes.js | /api/profile | GET /, PUT / |
| nutritionRoutes.js | /api/nutrition | POST /analyze (image), POST /analyze-text, POST /log, GET /meals, smart-search |
| workoutRoutes.js | /api/workouts | GET /, POST /log, GET /exercises, DELETE /:id |
| activityRoutes.js | /api/activities | GET /, POST /log, DELETE /:id |
| hydrationRoutes.js | /api/hydration | GET /, POST /log |
| lifestyleRoutes.js | /api/lifestyle | GET /tracks, GET/PUT /my-tracks |
| recommendationRoutes.js | /api/recommendations | GET / (general), /insight, /workout-coach, /calendar-coach, /profile-coach, /achievements, /hydration-coach, /sleep-advisor |
| chatRoutes.js | /api/chat | POST /send (SSE stream), GET /history, DELETE /history |
| notificationRoutes.js | /api/notifications | GET /, POST /read, PUT /preferences, GET /preferences |
| adminRoutes.js | /api/admin | Users CRUD, invites CRUD, AI usage stats, settings, user-activity, quota |

---

## 5. AI Engine Architecture

**File:** `backend/src/config/gemini.js` (109 lines)

### Resilient Model Fallback
```
Request → safeGenerateContent() or safeGenerateContentStream()
       → Model 1: gemini-2.0-flash 
       → Model 2: gemini-1.5-flash [fallback on error]
       → Error response object [graceful degradation]
```

### Core Capabilities
- **Dynamic API Key:** Fetches from `system_settings` table first, falls back to `GEMINI_API_KEY` env var
- **Sequential Fallback:** Tries multiple model IDs before failing
- **Streaming Support:** `safeGenerateContentStream()` enables SSE-based progressive text rendering
- **AI Caching:** MD5 hash of image files / normalized text → `ai_cache` table
- **Usage Governance:** `usageMiddleware.js` checks `daily_usage_count` vs `invite_codes.max_daily_requests`
- **Lifestyle Context Injection:** All prompts augmented with user training tracks + dietary philosophy via `lifestyleContext.js`
- **Smart Cache Invalidation:** Controller-level hooks in workout, nutrition, hydration, and lifestyle controllers clear stale caches on data changes

### Prompt Templates (config/prompts.js — 206 lines)
| Prompt | Used By | Status |
|---|---|---|
| PROMPT_GLOBAL_INSIGHT | Dashboard daily insight | ✅ Active |
| PROMPT_WORKOUT_SUGGESTION | Workout coach recommendation | ✅ Active |
| PROMPT_MEAL_ANALYSIS | Food image/text scanning | ✅ Active |
| PROMPT_SMART_SEARCH | Recipe/ingredient search | ✅ Active |
| PROMPT_CALENDAR_COACH | Calendar journey intelligence | ✅ Active |
| PROMPT_PROFILE_COACH | Profile progression analysis | ✅ Active |
| PROMPT_HYDRATION_COACH | Hourly water schedule | ✅ Active |
| PROMPT_SLEEP_ADVISOR | Sleep/recovery advice | ✅ Active |
| PROMPT_SMART_NOTIFICATIONS | Push notification copy | ✅ Active |

### Conversational AI Chat (chatController.js — 176 lines)
- **SSE Streaming:** Uses `res.write()` with `text/event-stream` content type for progressive token delivery
- **Conversation Memory:** Last 20 messages loaded from `ai_conversations` table per coach type
- **Coach Personas:** System prompt dynamically built per `coachType` param (workout_coach, hydration_coach, sleep_advisor, progression_coach)
- **Frontend Parser:** `XHR` with `onreadystatechange` manually splits `data:` JSON chunks for live UI updates

---

## 6. Design System

**File:** `frontend/src/theme.js` (150 lines) — Single Source of Truth

### Color Palette (Light Mode)
| Token | Value | Usage |
|---|---|---|
| Primary | #FF2D55 (Velvet Crimson) | CTAs, AI accents, active states |
| Success | #10B981 (Emerald Green) | Goals met, positive indicators |
| Warning | #F59E0B (Amber) | Streaks, caution states |
| Danger | #FF3B30 | Delete, errors, destructive |
| Info | #007AFF (Sapphire Blue) | Hydration, links, informational |
| Background | #FAFBFC | Off-white canvas |
| Surface | #FFFFFF | Card surfaces |
| Text Primary | #1C1C1E | Dark charcoal body text |

### Dark Mode
Full dark palette with `#0A0A0A` background, `#1C1C1E` surfaces, and adjusted semantic colors. Toggled via "Day Workout" / "Night Run" switch in `ThemeContext`.

### Typography Scale
`h1 (32px) → h2 (28px) → h3 (22px) → h4 (18px) → h5 (16px) → body (15px) → bodySmall (13px) → label (11px) → labelSmall (9px) → caption (12px)`

Custom font: **Inter** loaded via `expo-font` + `@expo-google-fonts/inter`.

### Reusable UI Components (frontend/src/components/ui/)
| Component | Lines | Purpose |
|---|---|---|
| AICoachCard | 357 | Expandable AI insight card with segments, milestones, actions slot |
| AnimatedTextField | 160 | Login input with floating label animation |
| Badge | 77 | Status/category pill labels |
| Button | 116 | Primary/secondary/ghost variants with loading state |
| Card | 58 | Base surface card with `variant="ai"` support |
| ExpandableSection | 95 | Generic collapsible section |
| Header / SectionHeader | 69 | Screen and section title bars |
| ListItem | 97 | Standardized list row |
| ModalView | 79 | Full-screen modal wrapper |
| ScreenContainer | 63 | Safe-area scroll/keyboard wrapper |
| SettingsToggle | 57 | Toggle switch row |
| StateViews | 124 | LoadingState, EmptyState, ErrorState |
| TextField | 95 | Standard text input |
| Toast | 141 | Slide-in notification toast |
| CustomDialog | 172 | Modal dialog (success/error/warning/confirm types) |

### Chat Components (frontend/src/components/chat/)
| Component | Lines | Purpose |
|---|---|---|
| ChatBubble | 85 | User/AI message bubble with typing indicator |
| ChatInput | 80 | Text input with send button |
| QuickChips | 82 | Contextual suggestion chip strip |

### Notification Components (frontend/src/components/notifications/)
| Component | Lines | Purpose |
|---|---|---|
| NotificationModal | 170 | Full notification center panel |
| NotificationItem | 217 | Individual notification card with actions |
| ContextMenuSheet | 181 | Pin/mute/delete context menu |
| ToneSelector | 65 | Coach tone preference picker |
| UndoSnackbar | 47 | Undo-delete snackbar |

### Workout Components (frontend/src/components/workouts/)
| Component | Lines | Purpose |
|---|---|---|
| GymLoggerModal | 395 | Exercise picker with sets/reps/weight |
| ActivityLoggerModal | 201 | Custom activity logger (yoga/meditation/dance) |

---

## 7. Screen-by-Screen Feature Map

### DashboardScreen (1,684 lines)
- Greeting header with notification bell (unread badge + real-time polling)
- Calendar strip date selector with historical data support
- Calorie progress bar (consumed vs target from user_goals)
- Macro breakdown cards (Protein/Carbs/Fats) with animated progress
- Hydration tracker with +/- 250ml buttons and AI coach schedule
- Workout summary card with exercise pills
- AI Coach Daily Insight card (expandable, with "Chat with Coach" CTA)
- Hydration Coach chat integration
- Notification modal: tone selector, context menu (pin/mute/delete), undo snackbar
- Pull-to-refresh, skeleton loading, staggered entrance animations
- Smart cache refetch after hydration logging

### WorkoutsScreen (1,149 lines)
- Category filter ribbon (Chest/Back/Legs/Cardio/Shoulders/Arms)
- Gym workout logger (exercise picker, sets/reps/weight) via GymLoggerModal
- Custom activity logger via ActivityLoggerModal
- AI workout coach recommendation card with "View Plan" + "Chat" dual CTAs
- Interactive exercise checklist in AI plan modal
- Workout deletion with Toast confirmation
- Historical recommendation viewing per date

### MealsScreen (649 lines)
- Text-based food analysis, image-based food scanning (camera/gallery)
- Smart Search (AI recipe/ingredient recommendations)
- Meal logging (breakfast/lunch/dinner/snack)
- Daily meal list with delete capability

### CalendarScreen (379 lines)
- Monthly calendar grid with achievement indicators per day
- Achievement criteria: workouts > 0, hydration >= 3000ml, calories >= 1200
- Day detail panel (workout + meal logs)
- AI Journey Intelligence card (streak analysis, overtraining alerts, milestones)

### ProfileScreen (937 lines)
- Avatar, name, username display, stats row (Weight/Height/Age)
- AI Progression Intelligence card (fitness index, strengths/weaknesses) with "Chat with Progression Coach" CTA
- AI Sleep & Recovery Advisor card with "Chat with Sleep Advisor" CTA
- Fitness goal banner, account details menu
- Training path and diet link to ChoosePathScreen
- Admin privileges link (role-gated), edit profile modal, logout
- Pull-to-refresh support

### AIChatScreen (294 lines)
- Full-screen conversational AI chat interface
- SSE streaming with progressive text rendering
- QuickChips contextual suggestions per coach type
- Persistent chat history (load, clear, delete)
- Auto-scroll to latest message
- Coach-specific system prompt injection

### AdminScreen (936 lines)
- System Settings: Gemini API key management (secure masked entry)
- Invite Codes: Generate with quota, list, delete
- Registered Users: List with inline quota editing, delete
- AI Usage Dashboard: Period selector, per-user breakdown, near-limit warnings
- User Activity: Last login, streak tracking, inactive detection (3+ days)

### LoginScreen (449 lines)
- Username + invite code fields, staggered entrance animations
- Shake animation on error, button pulse animation, auto-registers

### ChoosePathScreen (706 lines)
- Training track selection grid (multi-select with primary star)
- Dietary philosophy chips (7 options + notes), onboarding + edit modes

---

## 8. Bugs and Issues Tracker

### CRITICAL / FUNCTIONAL BUGS

| # | Bug | Status |
|---|---|---|
| B1 | FoodScannerScreen orphaned — not in navigation | **RESOLVED** (Deleted file) |
| B2 | "Log Meal" button has no onPress handler | **RESOLVED** (Deleted file) |
| B3 | Notification data hardcoded/static | **RESOLVED** (Dynamic backend + polling + Toast) |
| B4 | getUserLifestyleContext duplicated across controllers | **RESOLVED** (Extracted to utility) |
| B5 | firebase-admin unused dependency | **RESOLVED** (Pruned) |
| B6 | Hydration can go below 0 | **RESOLVED** (Floor guard + disable) |

### UI/UX ISSUES

| # | Issue | Status |
|---|---|---|
| U1 | FoodScannerScreen doesn't use design system | **RESOLVED** (Deleted file) |
| U2 | Calendar selected-day highlight too subtle | **RESOLVED** (High-contrast crimson) |
| U3 | No dark mode support | **RESOLVED** (ThemeContext + system-wide Dark Mode) |
| U4 | ProfileScreen uses Alert.alert() not CustomDialog | **RESOLVED** (Migrated) |
| U5 | No visual feedback on workout/meal deletion | **RESOLVED** (Toast notifications) |
| U6 | Workout logs lack delete button | **RESOLVED** (Delete button + endpoint) |
| U7 | Tab bar may clip on small devices | **RESOLVED** (Safe-area-aware height) |
| U8 | AICoachCard animation runs off-screen | **RESOLVED** (Pause when collapsed) |
| U9 | Empty state pulse runs indefinitely | **RESOLVED** (Pause when off-focus) |
| U10 | No loading indicator when deleting activity | **RESOLVED** (ActivityIndicator) |
| U11 | Picker inconsistent iOS vs Android | **RESOLVED** (Custom ModalView picker) |
| U12 | Calendar date mutation in-place | **RESOLVED** (Cloned Date instance) |

### MINOR / POLISH ITEMS

| # | Issue | Status |
|---|---|---|
| P1 | No haptic feedback on press interactions | Pending (Phase 5) |
| P2 | No pull-to-refresh on Calendar/Profile | **RESOLVED** |
| P3 | Notification quick-actions hardcoded | **RESOLVED** (Dynamic action_type) |
| P4 | secondaryLight color token missing | **RESOLVED** (Added to theme) |
| P5 | Smart Search status checked in CalendarScreen | **RESOLVED** (Removed) |
| P6 | No password field in login | Pending (Phase 5 — Task 5.1) |

---

## 9. Environment Variables

### Backend (backend/.env)
```
GEMINI_API_KEY=<key>       # Fallback if not in system_settings DB
JWT_SECRET=<secret>        # Token signing
PORT=5000                  # Server port
```

### Frontend (frontend/.env)
```
EXPO_PUBLIC_API_URL=http://<YOUR_IP>:5000/api
```

---

## 10. Key File Reference

| File | Lines | Purpose |
|---|---|---|
| frontend/App.js | 159 | Entry point, auth flow, Tab + Stack navigation |
| frontend/src/theme.js | 150 | Design system tokens |
| frontend/src/api/client.js | 38 | Axios instance + JWT interceptor |
| frontend/src/context/AuthContext.js | 82 | Auth state management |
| frontend/src/context/ProfileContext.js | 83 | Profile/track state management |
| frontend/src/context/ThemeContext.js | 128 | Dark/Light mode state |
| frontend/src/screens/DashboardScreen.js | 1,684 | Main dashboard |
| frontend/src/screens/WorkoutsScreen.js | 1,149 | Workout logging + AI coach |
| frontend/src/screens/ProfileScreen.js | 937 | Profile + AI progression/sleep |
| frontend/src/screens/AdminScreen.js | 936 | Admin governance portal |
| frontend/src/screens/ChoosePathScreen.js | 706 | Onboarding/path editor |
| frontend/src/screens/MealsScreen.js | 649 | Food scanning + smart search |
| frontend/src/screens/LoginScreen.js | 449 | Auth screen |
| frontend/src/screens/CalendarScreen.js | 379 | Calendar + achievements |
| frontend/src/screens/AIChatScreen.js | 294 | Conversational AI chat |
| frontend/src/components/ui/AICoachCard.js | 357 | Reusable AI coach card |
| frontend/src/components/CustomDialog.js | 172 | Modal dialog |
| backend/src/server.js | 72 | Express entry + schema migration |
| backend/src/controllers/recommendationController.js | 685 | AI recommendation logic |
| backend/src/controllers/nutritionController.js | 416 | Food analysis + smart search |
| backend/src/controllers/notificationController.js | 225 | Notification CRUD |
| backend/src/controllers/chatController.js | 176 | SSE chat streaming |
| backend/src/controllers/workoutController.js | 160 | Workout CRUD |
| backend/src/services/notificationService.js | 217 | Event-driven notifications |
| backend/src/config/gemini.js | 109 | AI engine with fallback + streaming |
| backend/src/config/prompts.js | 206 | All AI prompt templates |
| backend/src/models/schema.sql | 233 | Full DB schema (21 tables) |
| backend/src/middlewares/usageMiddleware.js | 40 | AI usage rate limiting |

---

## 11. Roadmap — Remaining Tasks

### Phase 4: Backend Hardening (Pending)
| ID | Task | Priority |
|---|---|---|
| 4.1 | Extract AI Service Layer from recommendation controllers | High |
| 4.2 | Create Aggregated Dashboard Endpoint (`GET /api/dashboard`) | Medium |
| 4.3 | Request validation middleware using schemas | High |
| 4.4 | Standardize error responses globally | Medium |
| 4.5 | Add offset/cursor pagination to feeds | Low |

### Phase 5: Production Readiness (Pending)
| ID | Task | Priority |
|---|---|---|
| 5.1 | Add password authentication & Bcrypt hashing | Critical |
| 5.2 | Add Express login rate limiter | High |
| 5.3 | JWT expiry & refresh token rotation mechanism | High |
| 5.4 | Optimistic UI updates for instant feedback | Medium |
| 5.5 | Offline caching layer with AsyncStorage fallback | Medium |

### Previously Completed
- ~~Phase 1 (Foundation):~~ 7/7 tasks — hooks, contexts, theme cleanup
- ~~Phase 2 (UI/UX):~~ 8/8 tasks — calendar, dark mode, empty states, font loading
- ~~Phase 3 (AI Features):~~ 6/6 tasks — prompts, coaching, streaming, cache invalidation, chat
