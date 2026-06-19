# SaiFit - AI-Powered Fitness and Nutrition Tracker

SaiFit is a premium, context-aware mobile fitness and nutrition tracking application. It utilizes a modern tech stack, a unified custom design system, and integrations with Google's Gemini AI to provide daily health insights, image-based meal scanners, conceptual search recommendations, and personalized coaching logs.

---

## 🚀 Key Features

* **Unified Premium Design System**: Crafted with a cohesive "Surface-Action-Semantic" color palette, custom typography scales, unified buttons, responsive headers, state-aware modals, and reusable cards based on modern iOS/Android guidelines.
* **Daily Companion Coach**: Adaptive AI dashboard insights that analyze yesterday's logs to generate customized motivational metrics, water targets, and training adjustments.
* **Meal Scan & Nutrition Tracker**: Text and photo-based meal scanner powered by Gemini AI, utilizing localized image hashing and text-query caching to optimize responses.
* **Concept Search Recipe Finder**: AI Nutrition Chef suggests high-density recipes and ingredient alternatives based on user searches, dynamically balanced against remaining daily macro targets.
* **Workout Suggestion Engine**: Personalized personal trainer that compiles streaks, consistency metrics, and missed session fatigue data to suggest tomorrow's training split.
* **Calendar Journey Analyst**: Evaluates a 14-day trailing log to compute consistency scores, workout predictions, chronotype timing optimization, and milestones.
* **System Governance Portal**: Administrative dashboard to monitor registrations, audit token codes, configure AI models/keys, adjust prompt templates, and toggle individual feature suites dynamically.
* **Token Quota Middleware**: Integrated usage limits checking and database logging middleware to prevent AI api abuse.

---

## 📂 Project Structure

```text
Fit_app_m/
├── backend/                  # Node.js + Express.js REST API
│   ├── src/
│   │   ├── config/           # Database, Gemini, and System configurations
│   │   ├── controllers/      # Route controllers (Auth, Nutrition, Recommendation, etc.)
│   │   ├── middlewares/      # Authentication, File Uploads, and AI Usage Rate-Limiter
│   │   ├── models/           # SQLite schema configuration
│   │   ├── routes/           # REST endpoints mapping
│   │   └── server.js         # Backend entry point
│   ├── .env.example          # Template for backend credentials
│   └── package.json
├── frontend/                 # React Native + Expo App
│   ├── src/
│   │   ├── api/              # Axios instance setup
│   │   ├── components/       # Custom CalendarStrip and Dialogs
│   │   │   └── ui/           # Unified Component Library (Card, Button, ScreenContainer, etc.)
│   │   ├── context/          # Global Contexts (AuthContext, ProfileContext)
│   │   ├── hooks/            # Reusable React Hooks (useDialog, useAnimations)
│   │   ├── screens/          # App screens (Auth, Dashboard, Scanner, Profile, Admin, etc.)
│   │   └── theme.js          # Spacing, colors, typography, and visual tokens
│   ├── App.js                # App entry point, wraps providers and sets up routing
│   ├── .env                  # Frontend environment variables configuration
│   └── package.json
└── README.md
```

---

## 🛠 Running the Application

Follow these steps to run both the backend and frontend services locally.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [Expo Go](https://expo.dev/expo-go) app installed on your physical iOS or Android device (optional, for device testing)

---

### 2. Backend Setup
1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure environment variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and insert your credentials. The local SQLite database (`saifit.db`) is automatically generated and migrated when starting up.
   * `GEMINI_API_KEY`: Your Google Gemini API Key.
   * `PORT`: Default is `5000`.

4. **Start the backend server**:
   * For production build: `npm start`
   * For hot-reloaded development: `npm run dev`

---

### 3. Frontend Setup
1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the `frontend` root:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:5000/api
   ```
   * *Note: If testing on a physical device using Expo Go, replace `<YOUR_LOCAL_IP>` with your computer's local network IP address (e.g., `http://192.168.1.167:5000/api`). If testing strictly on an emulator/simulator, you can use `http://localhost:5000/api`.*

4. **Start the Expo server**:
   ```bash
   npx expo start
   ```
5. **Launch the app**:
   * Scan the terminal QR code with your phone's camera (iOS) or the Expo Go app (Android).
   * Or press `a` for Android Emulator or `i` for iOS Simulator.

---

## 🔒 Resource Control & AI Middleware

To protect external API consumption:
1. **`checkAiUsageLimit` Middleware**: Checks the user's daily request count. If they exceed their assigned invite quota limit (configurable in the Governance Portal), the backend returns a `429 Too Many Requests` status, stopping execution before querying Gemini.
2. **`logAiUsage` Middleware**: Logs successful AI requests (e.g., scanning a new food description, requesting a workout plan, or using smart search) in the `ai_usage_logs` table and increments the user's daily count.
3. **Caching**: Image hashing (MD5) and text query normalizing acts as a first-line cache filter to return previously completed analyses instantly without consuming AI credits.

---

## 🏗️ Clean Architecture Frontend refactor

The application frontend follows modern React Native / React design patterns:
1. **Global Context Providers**: State management is abstracted using lightweight React Context.
   - `AuthContext`: Manages auth state, tokens, user roles, and onboarding navigation.
   - `ProfileContext`: Caches and handles profile data, dietary preferences, and track configuration, eliminating duplicate fetches across Dashboard, Calendar, and Profile screens.
2. **Reusable Custom Hooks**: Common UI and utility logic is moved out of components to prevent screen code bloat.
   - `useDialog`: Centralized state management for custom warning, error, and success alert dialogs.
   - `useAnimations`: Decouples standard skeleton loader loops and visual effects from views.
3. **Typography Hierarchy**: Font styles and weights are standardized in `theme.js` to ensure visual hierarchy.
4. **System-Wide Dark/Light Mode**: Fully reactive theming is implemented globally using `ThemeContext`, a customized toggle ("Day Workout" vs. "Night Run" modes), and a styles factory pattern (`useThemedStyles(stylesFactory)`) that recalculates component and screen styles dynamically upon theme changes.
