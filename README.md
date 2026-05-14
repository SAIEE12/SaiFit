# SaiFit - AI-Powered Fitness and Nutrition Tracker

SaiFit is a simple, clean, and beginner-friendly mobile fitness and nutrition tracking application. It utilizes a modern tech stack and integrates with Google's Gemini AI to provide intelligent food tracking and personalized workout recommendations.

## 🚀 Architecture

- **Frontend:** React Native (Expo) - Chosen for simplicity, cross-platform support, and beginner-friendly ecosystem.
- **Backend:** Node.js with Express.js - Lightweight, modular, and easy to scale.
- **Database:** SQLite (Local Dev) / PostgreSQL (Production) - Currently configured to use SQLite locally for a plug-and-play development experience without requiring external services or Docker. Easily migrates to PostgreSQL later.
- **AI Integration:** Google Gemini API - Used for analyzing food images to estimate macros and generating workout recommendations.
- **Storage:** Cloudinary - Used for storing uploaded food and profile images securely.
- **Notifications:** Firebase Cloud Messaging (FCM) - For mobile push notifications.

## 📂 Project Structure

```
Fit_app_m/
├── backend/                  # Express.js REST API
│   ├── src/
│   │   ├── config/           # DB, Cloudinary, Gemini, Firebase setups
│   │   ├── controllers/      # Route logic (Auth, Nutrition, Workout, etc.)
│   │   ├── middlewares/      # JWT Auth, Multer Cloudinary uploads
│   │   ├── models/           # SQL Schema definitions
│   │   ├── routes/           # Express routes
│   │   └── server.js         # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/                 # React Native Expo App
│   ├── src/
│   │   ├── api/              # Axios API client setup
│   │   ├── components/       # Reusable UI components
│   │   ├── navigation/       # React Navigation setup
│   │   ├── screens/          # App screens (Auth, Dashboard, Scanner, etc.)
│   │   └── theme/            # Colors, typography, global styles
│   ├── App.js                # App entry point
│   └── package.json
└── README.md
```

## 🛠 Backend Setup (Local SQLite)

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`: `cp .env.example .env`
4. Provide your API keys in the `.env` file (`GEMINI_API_KEY`, etc.).
5. Start the server: `npm run dev`
   * *Note: The local SQLite database (`saifit.db`) and its schema are automatically initialized when the server starts. You do not need to install or run PostgreSQL locally!*

## 📱 Frontend Setup (Expo)

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Update API endpoints in `src/api/client.js` to point to your local backend (e.g., `http://YOUR_LOCAL_IP:5000/api`).
4. Start the app: `npx expo start`
5. Use the Expo Go app on your phone or an emulator to run the application.

## 🚀 Deployment Guide & Future PostgreSQL Migration

### Migrating back to PostgreSQL
The current `db.js` wraps SQLite to have the exact same API surface as `pg`. 
When you are ready for production, you simply:
1. `npm install pg` and `npm uninstall better-sqlite3`.
2. Swap the `db.js` contents back to using a generic PostgreSQL connection pool.
3. Your controllers won't need to change, as they still use the PostgreSQL querying conventions (`await db.query(...)` and parameterized queries like `$1`).

### Render / Railway (Production)
1. **Database:** Create a PostgreSQL instance on Render/Railway.
2. **Environment Variables:** Set all variables from `.env.example`.
3. **Deploy:** Connect your GitHub repository and let Render/Railway build and deploy the backend. Run `schema.sql` on the provisioned DB.

## 🤖 AI Features Implementation

- **Food Scanner:** In `nutritionController.js`, we use Gemini API to accept an image (base64) and a prompt to return a JSON containing `calories`, `protein`, `carbs`, and `fats`.
- **Recommendations:** In `recommendationController.js`, Gemini receives the user's goals and recent workouts to generate a structured workout plan.
