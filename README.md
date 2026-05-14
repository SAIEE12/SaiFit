# SaiFit - AI-Powered Fitness and Nutrition Tracker

SaiFit is a simple, clean, and beginner-friendly mobile fitness and nutrition tracking application. It utilizes a modern tech stack and integrates with Google's Gemini AI to provide intelligent food tracking and personalized workout recommendations.

## 🚀 Architecture

- **Frontend:** React Native (Expo) - Chosen for simplicity, cross-platform support, and beginner-friendly ecosystem.
- **Backend:** Node.js with Express.js - Lightweight, modular, and easy to scale.
- **Database:** PostgreSQL - Robust relational database for structured health data.
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

## 🛠 Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`: `cp .env.example .env`
4. Create a PostgreSQL database and update the `DATABASE_URL` in `.env`.
5. Run the schema file to create tables: `psql -U your_user -d saifit -f src/models/schema.sql`
6. Start the server: `npm run dev`

## 📱 Frontend Setup (Expo)

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Update API endpoints in `src/api/client.js` to point to your local backend (e.g., `http://YOUR_LOCAL_IP:5000/api`).
4. Start the app: `npx expo start`
5. Use the Expo Go app on your phone or an emulator to run the application.

## 🚀 Deployment Guide

### Render / Railway (Backend + DB)

1. **Database:** Create a PostgreSQL instance on Render/Railway.
2. **Environment Variables:** Set all variables from `.env.example` in your Render/Railway project settings.
3. **Build & Start Command:** 
   - Build Command: `npm install`
   - Start Command: `node src/server.js`
4. **Deploy:** Connect your GitHub repository and let Render/Railway build and deploy the backend. Run the `schema.sql` on the provisioned database.

### Frontend (Expo)

- Since this is a personal/small-scale app, you can share it via **Expo Go** or build a standalone APK for Android using **EAS Build**:
  ```bash
  npm install -g eas-cli
  eas login
  eas build -p android --profile preview
  ```

## 🤖 AI Features Implementation

- **Food Scanner:** In `nutritionController.js`, we use Gemini API to accept an image (base64) and a prompt to return a JSON containing `calories`, `protein`, `carbs`, and `fats`.
- **Recommendations:** In `recommendationController.js`, Gemini receives the user's goals and recent workouts to generate a structured workout plan.

## 📅 API Endpoints Summary

- `POST /api/auth/register` - Create user
- `POST /api/auth/login` - Authenticate and get JWT
- `POST /api/nutrition/analyze` - Send food image to Gemini
- `POST /api/nutrition/log` - Save food item to DB
- `POST /api/workouts/log` - Save a workout session
- `GET /api/recommendations` - Get AI workout suggestions
