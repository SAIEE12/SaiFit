# SaiFit — Complete Project Analysis
> **Last Updated:** June 12, 2026  
> **Purpose:** Definitive technical reference to eliminate redundant analysis across sessions.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Expo/RN)                │
│  React Native 0.81.5 · Expo SDK 54 · React 19.1    │
│  Bottom Tab Nav (5 tabs) + Stack Nav (Profile→Admin)│
├─────────────────────────────────────────────────────┤
│              axios → apiClient.js                   │
│         BASE_URL = EXPO_PUBLIC_API_URL              │
│         Auth: Bearer JWT via AsyncStorage           │
├─────────────────────────────────────────────────────┤
│                   BACKEND (Node/Express)            │
│  Node.js · Express 4.19 · better-sqlite3 9.4       │
│  JWT Auth · Multer uploads · Gemini AI (0.24.1)    │
│  Port: 5000 · DB: ./database.sqlite                │
└─────────────────────────────────────────────────────┘
```

### Backend Stack
| Package | Version | Purpose |
|---|---|---|
| express | 4.19.2 | HTTP server and routing |
| better-sqlite3 | 9.4.3 | SQLite DB (mimics pg-pool API via db.js) |
| @google/generative-ai | 0.24.1 | Gemini AI content generation |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 2.4.3 | Password hashing |
| multer | 1.4.5 | File upload handling |
| firebase-admin | 12.0.0 | Listed but NOT actively used in core flows |

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
| @react-native-picker/picker | 2.11.1 | Dropdown pickers |

---

## 2. Navigation Map

```
App.js
├── LoginScreen (unauthenticated)
├── ChoosePathScreen (onboarding — shown if no tracks selected)
└── MainTabs (authenticated)
    ├── Tab: "My Space" → MySpaceScreen → DashboardScreen (wrapper)
    ├── Tab: "Workouts" → WorkoutsScreen
    ├── Tab: "Meals" → MealsScreen
    ├── Tab: "Calendar" → CalendarScreen
    └── Tab: "Profile" → ProfileStack
        ├── ProfileMain → ProfileScreen
        ├── Admin → AdminScreen
        └── ChoosePathEdit → ChoosePathScreen (isEdit=true)
```

**Note:** `FoodScannerScreen.js` exists but is NOT wired into the navigation tree.

---

## 3. Database Schema (SQLite)

**File:** `backend/src/models/schema.sql` (194 lines)

| Table | Purpose |
|---|---|
| `users` | Auth accounts (username, password_hash, role, invite_code_id, daily_usage_count) |
| `user_profiles` | Body metrics (age, gender, height, weight, target_weight, dietary_philosophy) |
| `invite_codes` | Governance tokens (code, max_daily_requests, is_used, assigned_user_id) |
| `workout_logs` | Gym sessions (user_id, date, notes, duration_minutes) |
| `workout_exercises` | Exercise details per session (sets, reps, weight) |
| `exercises` | Master exercise catalog (name, category, muscle_group) |
| `meal_logs` | Nutrition entries (meal_type, food_name, calories, protein, carbs, fats) |
| `hydration_logs` | Daily water intake (amount_ml) |
| `activity_logs` | Custom activities — yoga, dance, meditation (category, duration, intensity) |
| `lifestyle_tracks` | Training paths (key, display_name, description) |
| `user_tracks` | User-to-track assignments (is_primary flag) |
| `user_goals` | Fitness goals (goal_type, target_value) |
| `recommendations` | Cached AI recommendations (type, content JSON, date) |
| `ai_cache` | MD5-keyed AI response cache for deduplication |
| `ai_usage_logs` | Per-request AI usage audit trail (request_type, timestamp) |
| `system_settings` | App-wide config key/value (stores gemini_api_key) |

---

## 4. API Routes

| Route File | Prefix | Key Endpoints |
|---|---|---|
| authRoutes.js | /api/auth | POST /login, POST /register, GET /me |
| profileRoutes.js | /api/profile | GET /, PUT / |
| nutritionRoutes.js | /api/nutrition | POST /analyze (image), POST /analyze-text, POST /log, GET /meals, smart-search |
| workoutRoutes.js | /api/workouts | GET /, POST /log, GET /exercises |
| activityRoutes.js | /api/activities | GET /, POST /log, DELETE /:id |
| hydrationRoutes.js | /api/hydration | GET /, POST /log |
| lifestyleRoutes.js | /api/lifestyle | GET /tracks, GET/PUT /my-tracks |
| recommendationRoutes.js | /api/recommendations | GET / (general), /insight, /workout-coach, /calendar-coach, /profile-coach, /achievements |
| adminRoutes.js | /api/admin | Users CRUD, invites CRUD, AI usage stats, settings, user-activity, quota |

---

## 5. AI Engine Architecture

**File:** `backend/src/config/gemini.js`

### Resilient Model Fallback
```
Request → Model 1 (gemini-2.0-flash) 
       → Model 2 (gemini-1.5-flash) [fallback on error]
       → Error response object [graceful degradation]
```

### Key Features
- **Dynamic API Key:** Fetches from system_settings table first, falls back to GEMINI_API_KEY env var
- **Sequential Fallback:** Tries multiple model IDs before failing
- **AI Caching:** MD5 hash of image files / normalized text → ai_cache table
- **Usage Governance:** usageMiddleware.js checks daily_usage_count vs invite_codes.max_daily_requests
- **Lifestyle Context Injection:** All prompts augmented with user training tracks + dietary philosophy

### Prompt Templates (config/prompts.js)
| Prompt | Used By |
|---|---|
| PROMPT_GLOBAL_INSIGHT | Dashboard daily insight |
| PROMPT_WORKOUT_SUGGESTION | Workout coach recommendation |
| PROMPT_MEAL_ANALYSIS | Food image/text scanning |
| PROMPT_SMART_SEARCH | Recipe/ingredient search |
| PROMPT_CALENDAR_COACH | Calendar journey intelligence |
| PROMPT_PROFILE_COACH | Profile progression analysis |
| PROMPT_SMART_NOTIFICATIONS | Push notification copy (UNUSED in frontend) |
| PROMPT_HYDRATION_COACH | Hourly water schedule (UNUSED in frontend) |
| PROMPT_SLEEP_ADVISOR | Sleep/recovery (UNUSED in frontend) |

---

## 6. Design System

**File:** `frontend/src/theme.js` — Single Source of Truth

### Color Palette
- **Primary:** #FF2D55 (Velvet Crimson) — CTAs, AI accents
- **Success:** #10B981 (Emerald Green) — goals met
- **Warning:** #F59E0B (Amber) — streaks, warnings
- **Danger:** #FF3B30 — delete, errors
- **Info:** #007AFF (Sapphire Blue) — hydration, links
- **Background:** #FAFBFC — off-white canvas
- **Surface:** #FFFFFF — card surfaces
- **Text Primary:** #1C1C1E — dark charcoal

### Typography Scale
h1 (32px) → h2 (28px) → h3 (22px) → h4 (18px) → h5 (16px) → body (15px) → bodySmall (13px) → label (11px) → labelSmall (9px) → caption (12px)

### Reusable UI Components (frontend/src/components/ui/)
| Component | Purpose |
|---|---|
| AICoachCard | Expandable AI insight card with collapsible trigger, segments, milestones |
| AnimatedTextField | Login input with floating label animation |
| Badge | Status/category pill labels |
| Button | Primary/secondary/ghost variants with loading state |
| Card | Base surface card with variant="ai" support |
| ExpandableSection | Generic collapsible section |
| Header / SectionHeader | Screen and section title bars |
| ListItem | Standardized list row |
| ModalView | Full-screen modal wrapper |
| ScreenContainer | Safe-area scroll/keyboard wrapper |
| SettingsToggle | Toggle switch row |
| StateViews | LoadingState, EmptyState, ErrorState |
| TextField | Standard text input |
| CustomDialog | Modal dialog (success/error/warning/confirm types) |

---

## 7. Screen-by-Screen Feature Map

### DashboardScreen (1544 lines)
- Greeting header with notification bell (unread badge)
- Calorie progress bar (consumed vs target from user_goals)
- Macro breakdown cards (Protein/Carbs/Fats) with progress bars
- Hydration tracker with +/- 250ml buttons
- Workout summary card with exercise pills
- AI Coach insight card (expandable)
- Notification modal: tone selector, context menu (pin/mute/delete), undo snackbar
- Pull-to-refresh, skeleton loading, staggered entrance animations

### MealsScreen (651+ lines)
- Text-based food analysis, image-based food scanning (camera/gallery)
- Smart Search (AI recipe/ingredient recommendations)
- Meal logging (breakfast/lunch/dinner/snack)
- Daily meal list with delete capability

### WorkoutsScreen (1361 lines)
- Category filter ribbon (Chest/Back/Legs/Cardio/Shoulders/Arms)
- Gym workout logger (exercise picker, sets/reps/weight)
- Custom activity logger (yoga/meditation/dance/strength/cardio)
- AI workout coach recommendation card
- Interactive exercise checklist in AI plan modal

### CalendarScreen (356 lines)
- Monthly calendar grid with achievement indicators per day
- Achievement criteria: workouts > 0, hydration >= 3000ml, calories >= 1200
- Day detail panel (workout + meal logs)
- AI Journey Intelligence card (streak analysis, overtraining alerts, milestones)

### ProfileScreen (663 lines)
- Avatar, name, username display, stats row (Weight/Height/Age)
- AI Progression Intelligence card (fitness index, strengths/weaknesses)
- Fitness goal banner, account details menu
- Training path and diet link to ChoosePathScreen
- Admin privileges link (role-gated), edit profile modal, logout

### AdminScreen (935 lines)
- System Settings: Gemini API key management (secure entry)
- Invite Codes: Generate with quota, list, delete
- Registered Users: List with inline quota editing, delete
- AI Usage Dashboard: Period selector, per-user breakdown, near-limit warnings
- User Activity: Last login, streak tracking, inactive detection (3+ days)

### LoginScreen (448 lines)
- Username + invite code fields, staggered entrance animations
- Shake animation on error, button pulse animation, auto-registers

### ChoosePathScreen (481 lines)
- Training track selection grid (multi-select with primary star)
- Dietary philosophy chips (7 options + notes), onboarding + edit modes

---

## 8. Bugs and Issues

### CRITICAL / FUNCTIONAL BUGS

| # | Bug | Location | Impact | Status |
|---|---|---|---|---|
| B1 | FoodScannerScreen is orphaned — exists but not in navigation; uses old theme.borderRadius key | FoodScannerScreen.js | Dead code, style crashes possible | **RESOLVED** (Deleted file) |
| B2 | "Log Meal" button has no onPress handler in FoodScannerScreen | FoodScannerScreen.js:69 | Tapping does nothing | **RESOLVED** (Deleted file) |
| B3 | Notification data is hardcoded/static — not fetched from backend | DashboardScreen.js | Notifications are not real | **RESOLVED** (Wired to dynamic backend endpoints with focus-based polling and real-time Toast alerts) |
| B4 | getUserLifestyleContext duplicated across nutritionController and recommendationController | Backend controllers | Code duplication | **RESOLVED** (Extracted to utility) |
| B5 | firebase-admin is a dependency but unused in any controller or route | backend/package.json | Unnecessary bloat | **RESOLVED** (Pruned dependency) |
| B6 | Hydration +/- can go below 0 — no floor guard on decrement | DashboardScreen.js | Negative water values possible | **RESOLVED** (Guard & disable added) |

### UI/UX ISSUES

| # | Issue | Location | Impact | Status |
|---|---|---|---|---|
| U1 | FoodScannerScreen doesn't use the design system — raw hex, legacy keys, no ScreenContainer | FoodScannerScreen.js | Visual inconsistency | **RESOLVED** (Deleted file) |
| U2 | Calendar selected-day highlight too subtle — uses border color on similar bg | CalendarScreen.js:329 | Hard to see selection | **RESOLVED** (High-contrast crimson fill with white text) |
| U3 | No dark mode support — hardcoded #FFF in many components | theme.js + screens | Limits user preference | Pending |
| U4 | ProfileScreen uses Alert.alert() instead of CustomDialog | ProfileScreen.js:129,133 | Inconsistent dialog UX | **RESOLVED** (Migrated to CustomDialog) |
| U5 | No visual feedback on workout/meal log deletion | WorkoutsScreen.js | User unsure if action worked | **RESOLVED** (Toast notifications added on deletion) |
| U6 | Workout log cards lack delete button — only activities have delete | WorkoutsScreen.js:692-707 | Cannot remove incorrect logs | **RESOLVED** (Delete button + backend endpoint wired) |
| U7 | Tab bar height 80px with 25px bottom padding — may clip on small devices | App.js:63-65 | Layout issue on older phones | **RESOLVED** (Safe-area-aware height) |
| U8 | AICoachCard sparkle animation runs indefinitely even when off-screen | AICoachCard.js:27-34 | Wasted CPU cycles | **RESOLVED** (Pause when collapsed) |
| U9 | Empty state pulse animation runs indefinitely when list is empty | WorkoutsScreen.js:152-164 | Battery drain | **RESOLVED** (Pause when off-focus) |
| U10 | No loading indicator when deleting activity | WorkoutsScreen.js:279-295 | UX gap | **RESOLVED** (ActivityIndicator shown during delete actions) |
| U11 | Picker for exercise selection looks inconsistent iOS vs Android | WorkoutsScreen.js modal | Platform inconsistency | **RESOLVED** (Replaced with Custom ModalView picker) |
| U12 | Calendar month navigation mutates Date object in-place via setMonth() | CalendarScreen.js:205-206 | Potential state bugs | **RESOLVED** (Cloned Date instance before mutating) |

### MINOR / POLISH ITEMS

| # | Issue | Location | Status |
|---|---|---|---|
| P1 | No haptic feedback on any press interactions | All screens | Pending |
| P2 | No pull-to-refresh on CalendarScreen or ProfileScreen | Both screens | **RESOLVED** (Pull-to-refresh added on CalendarScreen and ProfileScreen) |
| P3 | Notification quick-actions hardcoded to specific IDs (1, 2) | DashboardScreen.js:921,934 | **RESOLVED** (Refactored to decode action_type and action_payload generic properties dynamically) |
| P4 | secondaryLight color token referenced but not defined in theme | ProfileScreen.js:246 | **RESOLVED** (Added to theme.js) |
| P5 | Smart Search status checked on CalendarScreen but feature lives in MealsScreen | CalendarScreen.js:91-98 | **RESOLVED** (Removed from CalendarScreen, MealsScreen handles it directly) |
| P6 | No password field in login — username + invite code only | LoginScreen.js | Pending |

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
| frontend/App.js | 159 | Entry point, auth flow, navigation |
| frontend/src/theme.js | 160 | Design system tokens |
| frontend/src/api/client.js | 39 | Axios instance + JWT |
| frontend/src/screens/DashboardScreen.js | 1544 | Main dashboard |
| frontend/src/screens/WorkoutsScreen.js | 1361 | Workout logging + AI coach |
| frontend/src/screens/MealsScreen.js | 651+ | Food scanning + smart search |
| frontend/src/screens/CalendarScreen.js | 356 | Calendar + achievements |
| frontend/src/screens/ProfileScreen.js | 663 | Profile + AI progression |
| frontend/src/screens/AdminScreen.js | 935 | Admin governance portal |
| frontend/src/screens/LoginScreen.js | 448 | Auth screen |
| frontend/src/screens/ChoosePathScreen.js | 481 | Onboarding/path editor |
| frontend/src/components/ui/AICoachCard.js | 344 | Reusable AI coach card |
| frontend/src/components/CustomDialog.js | 170 | Modal dialog |
| backend/src/server.js | 69 | Express entry + schema migration |
| backend/src/config/db.js | 47 | SQLite wrapper (pg-pool API) |
| backend/src/config/gemini.js | 86 | AI engine with fallback |
| backend/src/config/prompts.js | 55 | All AI prompt templates |
| backend/src/models/schema.sql | 194 | Full DB schema |
| backend/src/controllers/recommendationController.js | 503 | AI recommendation logic |
| backend/src/controllers/nutritionController.js | 344 | Food analysis + smart search |
| backend/src/middlewares/usageMiddleware.js | ~50 | AI usage rate limiting |

---

## 11. Pending Work / Roadmap

1. ~~Fix AICoachCard expansion — ensure inline layout flow (no overlay/overlap)~~ — **RESOLVED**
2. ~~Remove or integrate FoodScannerScreen~~ — **RESOLVED** (Deleted)
3. ~~Extract getUserLifestyleContext into shared utility~~ — **RESOLVED** (Extracted)
4. ~~Add gym workout deletion — missing from UI~~ — **RESOLVED** (Workout & activities deletion endpoints + UI implemented)
5. ~~Fix CalendarScreen date mutation — use new Date(currentDate) copy~~ — **RESOLVED** (Cloned Date in calendar navigation)
6. ~~Guard hydration floor — prevent negative values~~ — **RESOLVED** (Guard added)
7. ~~Standardize dialogs — replace Alert.alert() with CustomDialog in ProfileScreen~~ — **RESOLVED** (Standardized dialogs using CustomDialog)
8. ~~Remove firebase-admin dependency if unused~~ — **RESOLVED** (Removed)
9. Add dark mode theme variant
10. ~~Implement real push notifications — backend + frontend integration~~ — **RESOLVED** (Real-time notification engine & frontend sync fully integrated)
