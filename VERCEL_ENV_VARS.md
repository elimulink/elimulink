# Vercel Environment Variables Guide

This document specifies the exact environment variables required for ElimuLink to run on Vercel.

## How to Set Variables on Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable below with its corresponding value
4. Redeploy the project after adding variables

---

## Required Variables

### Firebase Configuration (Critical)

These variables are **REQUIRED** for the app to run. Without them, you'll see a red "Configuration Error" panel.

```
VITE_FIREBASE_API_KEY
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `AIzaSyDx5V8...` (36-40 characters)
- **Purpose:** Authenticates requests to Firebase backend

```
VITE_FIREBASE_PROJECT_ID
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `elimulink-pro-v2` (matches your Firebase project)
- **Purpose:** Identifies which Firebase project to use

### Firebase Configuration (Recommended)

These complete the Firebase initialization and enable full functionality:

```
VITE_FIREBASE_AUTH_DOMAIN
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `elimulink-pro-v2.firebaseapp.com`
- **Purpose:** Domain for Firebase authentication

```
VITE_FIREBASE_STORAGE_BUCKET
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `elimulink-pro-v2.appspot.com`
- **Purpose:** Storage bucket for file uploads

```
VITE_FIREBASE_MESSAGING_SENDER_ID
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `1234567890`
- **Purpose:** Firebase Cloud Messaging sender ID (for push notifications)

```
VITE_FIREBASE_APP_ID
```
- **Source:** Firebase Console → Project Settings → General tab
- **Value example:** `1:1234567890:web:abc123...`
- **Purpose:** Unique app identifier

```
VITE_FIREBASE_MEASUREMENT_ID
```
- **Source:** Firebase Console → Project Settings → General tab (Analytics section)
- **Value example:** `G-ABC123...` (optional, can be empty if Analytics not used)
- **Purpose:** Google Analytics measurement ID

### API Configuration (Optional)

```
VITE_API_BASE
```
- **Source:** Your backend service (e.g., Render, Heroku)
- **Value example:** `https://elimulink-api.onrender.com`
- **Purpose:** Base URL for backend API calls
- **Default:** Falls back to direct Firestore access if not set (recommended for MVP)
- **Important:** This MUST NOT default to `http://127.0.0.1:8000` in production (already prevented in code)

### AI/Gemini Configuration (Optional)

```
VITE_GEMINI_API_KEY
```
- **Source:** Google Cloud Console → APIs & Services → Credentials
- **Value example:** `AIza...` (Google Gemini API key)
- **Purpose:** Powers AI chat and image generation features
- **Default:** Empty string (features gracefully disabled if not set)

### App Configuration (Optional)

```
VITE_APP_ID
```
- **Source:** Custom identifier for your app deployment
- **Value example:** `elimulink-pro-v2`
- **Purpose:** Firestore namespace for storing user data
- **Default:** `elimulink-pro-v2`

---

## Environment Variable Priority

1. **Add these FIRST (critical):**
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_PROJECT_ID`

2. **Then add these (for full functionality):**
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`

3. **Optionally add (for backend/AI):**
   - `VITE_API_BASE` (if you have a backend service)
   - `VITE_GEMINI_API_KEY` (if you want AI features)
   - `VITE_APP_ID` (if you need custom namespacing)

---

## Debugging

### Error Panel Shows

If you see a red **Configuration Error** panel after deployment:

1. **Check Vercel logs:**
   - Vercel Dashboard → Deployments → Click latest → View Deployment Logs
   - Look for `[ENV]` prefixed messages showing which vars are empty

2. **Verify variables are set:**
   - Settings → Environment Variables
   - Copy-paste values from Firebase Console carefully (no spaces, exact match)

3. **Redeploy after adding variables:**
   - Changes to environment variables require a fresh build/deploy
   - Click **Redeploy** in Vercel Dashboard or push to trigger new deploy

### App Loads but Features Missing

If the app loads but some features don't work:

1. Check browser console for errors (DevTools → Console)
2. Ensure all 7 Firebase variables are set correctly
3. If using Gemini AI, verify `VITE_GEMINI_API_KEY` is set
4. If using backend API, verify `VITE_API_BASE` points to running service

---

## Copy-Paste Template

For quick setup, here's a template to fill in:

```
VITE_FIREBASE_API_KEY = [copy from Firebase Console]
VITE_FIREBASE_AUTH_DOMAIN = [copy from Firebase Console]
VITE_FIREBASE_PROJECT_ID = [copy from Firebase Console]
VITE_FIREBASE_STORAGE_BUCKET = [copy from Firebase Console]
VITE_FIREBASE_MESSAGING_SENDER_ID = [copy from Firebase Console]
VITE_FIREBASE_APP_ID = [copy from Firebase Console]
VITE_FIREBASE_MEASUREMENT_ID = [copy from Firebase Console or leave empty]
VITE_API_BASE = [optional: your backend URL, or leave empty]
VITE_GEMINI_API_KEY = [optional: Google Gemini API key, or leave empty]
VITE_APP_ID = [optional: defaults to elimulink-pro-v2]
```

---

## Firebase Console Location

To find all Firebase configuration:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click your project
3. Click **Project Settings** (gear icon, top-right)
4. Go to **General** tab
5. Scroll down to **Your apps** section
6. Find your Web app and click the **Config** button
7. All values are there in the format:
   ```javascript
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
     measurementId: "..."
   };
   ```

Copy each value to the corresponding `VITE_*` variable in Vercel.

---

## Testing

After setting env vars and redeploying:

1. Open Vercel deployment URL
2. Open DevTools (F12) → Console tab
3. Look for `[ENV]` prefixed log lines showing all vars
4. If all show values (not empty), configuration is correct
5. App should load and render normally (not red error panel)

---

## Support

If you're still seeing issues:

1. Check that all variable names match exactly (case-sensitive, with `VITE_` prefix)
2. Ensure no trailing spaces in values
3. Verify values match Firebase project (copy directly from Firebase Console)
4. Wait 1-2 minutes after adding vars and redeploy
5. Clear browser cache if needed (Ctrl+Shift+Delete, empty cache)


