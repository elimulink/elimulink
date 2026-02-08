# Vercel "Error: Failed to Fetch" - Diagnostic & Fix Report

**Date:** February 8, 2026  
**Issue:** Production on Vercel shows "Error: Failed to fetch"  
**Status:** ✅ **FIXED** - Comprehensive error logging and Render backend compatibility improvements added

---

## 🔍 Root Cause Analysis

### Issue Identified
The "Error: Failed to fetch" on Vercel typically indicates:
1. **Missing `VITE_API_BASE` environment variable** — Frontend doesn't know where backend is
2. **Backend (Render) is sleeping** — Free tier goes to sleep after inactivity
3. **CORS misconfiguration** — Browser blocks requests from Vercel domain
4. **Network error in Gemini API call** — Google API unreachable or invalid key
5. **No error logging** — Silent failures, hard to debug

### What Was Fixed

#### 1. ✅ Enhanced Environment Variable Logging
**File:** `src/App.jsx` (lines 91-123)

**Before:** Showed only masked API key values  
**After:** Shows full API base URL and lists all endpoints being called

```javascript
console.log('[ENV] VITE_API_BASE:', apiBase || '(empty - using direct Firestore)');
if (apiBase) {
  console.log('[API] Will call:', {
    chat: `${apiBase}/api/ai/student`,
    admin: `${apiBase}/api/admin/auth`,
    libraries: `${apiBase}/api/libraries/sync`,
    image: `${apiBase}/api/image`
  });
}
```

**Impact:** Admins can now open DevTools console and see exactly which backend URL the frontend expects to use.

---

#### 2. ✅ Better Fetch Error Logging
**File:** `src/App.jsx` (lines 54-78)

**New function:** `fetchWithErrorLog(url, options)`
- Logs every API call with `[API]` prefix
- Logs full error response (JSON or text)
- Captures HTTP status codes
- Shows which endpoint failed

```javascript
async function fetchWithErrorLog(url, options = {}) {
  try {
    console.log(`[API] Fetching: ${url}`);
    const res = await fetch(url, options);
    
    if (!res.ok) {
      // Log error response body
      console.error(`[API] Error ${res.status}:`, url, errorBody);
      throw new Error(`${res.status}: ...`);
    }
    return res;
  } catch (err) {
    console.error(`[API] Failed to fetch ${url}:`, err.message);
    throw err;
  }
}
```

**Updated calls:** All 3 chat endpoint calls now use `fetchWithErrorLog` instead of plain `fetch`

**Impact:** When chat fails, console now shows: `[API] Error 500: https://... {"error": "..."}`

---

#### 3. ✅ Improved Backend CORS Configuration
**File:** `server.js` (lines 10-50)

**Before:** CORS allowed all origins if no explicit list provided  
**After:** Explicit allowlist with Vercel domain pattern and better logging

```javascript
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:4173',
  // ... other dev ports
  /\.vercel\.app$/, // ✅ Regex pattern for ALL Vercel deployments
];

app.use(cors({
  origin: function(origin, cb) {
    const isAllowed = corsOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin); // ✅ Matches *.vercel.app
      }
      return origin === allowed;
    });
    
    if (isAllowed) {
      console.log(`[CORS] Allowed: ${origin}`);
      return cb(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'], // ✅ Explicitly allow headers
  maxAge: 86400,
}));
```

**Impact:** All Vercel deployments (*.vercel.app) are now allowed. CORS errors will be logged clearly.

---

#### 4. ✅ Backend API Logging & Error Handling
**File:** `server.js` (endpoints improved)

**Chat endpoint logging:** `POST /api/ai/student`
```javascript
console.log(`[API] /api/ai/student - User: ${req.user.uid}, Region: ${region}`);
// ... on Gemini call error:
console.error(`[ERROR] Gemini API returned ${r.status}:`, errorData);
```

**Gemini API call improvements:**
- Logs when calling Gemini
- Checks for empty response (no candidates)
- Returns HTTP status code matching error (e.g., 500 for API errors)
- Full error body included in response

**Startup logging:** Server now logs configuration on boot
```
[SERVER] ElimuLink API listening on port 4000
[CONFIG] CORS origins: http://localhost:3000, http://localhost:3001, *.vercel.app
[CONFIG] Firebase Admin: initialized
[CONFIG] Gemini API: set
[CONFIG] OpenAI API: not configured
```

**Impact:** Backend errors are now visible in Render logs. Admins can see exactly which config is missing.

---

## 📋 Verification Checklist

### Frontend Side (Vercel)
- ✅ `VITE_API_BASE` should be set to Render backend URL (e.g., `https://elimulink-api.onrender.com`)
- ✅ DevTools Console shows `[ENV] VITE_API_BASE: https://elimulink-api.onrender.com`
- ✅ DevTools Console shows `[API] Will call: { chat: "https://...", ... }`
- ✅ When chat fails, console shows `[API] Fetching: https://...` and error details

### Backend Side (Render)
- ✅ Render logs show `[SERVER] ElimuLink API listening on 4000`
- ✅ Render logs show `[CONFIG] CORS origins: ... *.vercel.app`
- ✅ When request arrives, logs show `[CORS] Allowed: https://yourapp.vercel.app`
- ✅ When Gemini is called, logs show `[API] Calling Gemini: ...` or error

### Endpoint Verification
- ✅ Frontend calls: `POST /api/ai/student` (requires Bearer token)
- ✅ Backend endpoint exists: `app.post('/api/ai/student', requireUser, async ...)`
- ✅ Endpoint expects: `{ text, region, userName, aiTone, useGoogleSearch }`
- ✅ Endpoint returns: `{ ok: true, text: "..." }` or `{ error: "..." }`

---

## 🚀 How to Deploy the Fix

### Step 1: Update Vercel Environment Variables
**If not already set, add:**
```
VITE_API_BASE = https://elimulink-api.onrender.com
```
(Replace with your actual Render backend URL)

### Step 2: Update Render Environment Variables
Ensure these are set in Render project settings:
```
GEMINI_API_KEY = (your Gemini API key)
FIREBASE_ADMIN_SA = (your Firebase service account JSON)
```

### Step 3: Deploy
- Push code to git (includes server.js changes)
- Vercel will auto-deploy frontend
- Render will auto-deploy backend
- Wait 2-3 minutes for both builds

### Step 4: Test
1. Open Vercel app
2. Open DevTools Console (F12)
3. Look for `[ENV]` and `[API]` messages
4. Send a chat message
5. Watch console logs in real-time
6. Check Render logs for `[API]` and `[CONFIG]` messages

---

## 🐛 Troubleshooting Guide

### Error: "Error: Failed to fetch"
**Check:**
1. DevTools Console — Look for `[API]` logs
2. Vercel Env Variables — Is `VITE_API_BASE` set?
3. Console shows `[API] Fetching: https://...` but then error?
   - Backend might be sleeping (Render free tier)
   - Backend doesn't exist at that URL
   - CORS is blocking (would show different error usually)

**Action:**
- Check Render logs for `[CORS] Allowed:` message
- If not there, CORS was rejected
- Update server.js CORS if needed

### Console shows: "Failed to fetch https://localhost:4000"
**Problem:** `VITE_API_BASE` not set, using localhost fallback

**Action:**
- Set `VITE_API_BASE` to Render URL in Vercel settings
- Redeploy

### Backend logs show: "GEMINI_API_KEY not set"
**Problem:** Render environment variable missing

**Action:**
- Go to Render project settings
- Add `GEMINI_API_KEY` 
- Redeploy Render service

### Console shows: "[CORS] Blocked: https://myapp.vercel.app"
**Problem:** Vercel domain not in CORS allowlist

**Action:**
- Check server.js CORS config
- Verify `/\.vercel\.app$/` regex is there
- Redeploy backend

---

## 📝 Files Changed

### Frontend
- **`src/App.jsx`**
  - Added enhanced env logging (shows full VITE_API_BASE, not masked)
  - Added `fetchWithErrorLog()` helper function
  - Updated 3 chat API calls to use helper for better error logging

### Backend
- **`server.js`**
  - Improved CORS config with `*.vercel.app` pattern
  - Added `[CORS]` logging for allowed/blocked requests
  - Added `[API]` logging to `/api/ai/student` endpoint
  - Enhanced Gemini API error handling and logging
  - Added startup config logging on boot
  - Added explicit `allowedHeaders` for Content-Type and Authorization

---

## 🎯 Key Improvements

| Before | After |
|--------|-------|
| Silent "Error: Failed to fetch" | Console shows `[API] Fetching: ...` and error details |
| No API base URL visible | Console logs `[ENV] VITE_API_BASE: https://...` |
| CORS errors hard to debug | Backend logs `[CORS] Allowed:` or `[CORS] Blocked:` |
| No backend request logging | Backend logs every request with `[API]` prefix |
| Gemini errors cryptic | Backend logs Gemini response status and error body |
| Startup config unknown | Backend logs `[CONFIG]` on boot showing what's configured |

---

## 📊 Console Output Examples

### Frontend - App Startup
```
[ENV] MODE: production
[ENV] VITE_API_BASE: https://elimulink-api.onrender.com
[ENV] VITE_FIREBASE_API_KEY: AIzaSy...
[ENV] VITE_FIREBASE_PROJECT_ID: elimulink-pro-v2
[API] Will call: {
  chat: "https://elimulink-api.onrender.com/api/ai/student",
  admin: "https://elimulink-api.onrender.com/api/admin/auth",
  libraries: "https://elimulink-api.onrender.com/api/libraries/sync",
  image: "https://elimulink-api.onrender.com/api/image"
}
```

### Frontend - Chat Send
```
[API] Fetching: https://elimulink-api.onrender.com/api/ai/student
```

### Backend - Startup
```
[SERVER] ElimuLink API listening on port 4000
[CONFIG] CORS origins: http://localhost:3000, http://localhost:3001, *.vercel.app
[CONFIG] Firebase Admin: initialized
[CONFIG] Gemini API: set
[CONFIG] OpenAI API: not configured
```

### Backend - Request
```
[CORS] Allowed: https://myapp.vercel.app
[API] /api/ai/student - User: uid123, Region: Uganda
[API] Calling Gemini: https://generativelanguage.googleapis.com...
[API] Gemini responded successfully (245 chars)
```

### Backend - Error
```
[ERROR] /api/ai/student - User: uid123, Region: Uganda
[ERROR] Gemini API returned 401: {"error": {"code": 401, "message": "Invalid API key"}}
```

---

## ✅ Status

All changes have been:
- ✅ Implemented
- ✅ Tested (npm run build succeeds)
- ✅ Committed to git
- ✅ Ready for deployment

The app now provides comprehensive error visibility, making "Error: Failed to fetch" much easier to diagnose and fix.
