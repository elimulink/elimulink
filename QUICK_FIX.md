# Quick Fix Guide: "Error: Failed to Fetch" on Vercel

**Problem:** Chat shows "Error: Failed to fetch" in production  
**Time to fix:** 5 minutes  
**No code changes needed** — Just environment variables!

---

## 🚨 The Issue

Frontend can't find your backend. Two possibilities:

1. **`VITE_API_BASE` not set on Vercel** → Falls back to `http://127.0.0.1:8000` which doesn't exist
2. **Render backend is sleeping** → Free tier shuts down after 15 min inactivity

---

## ✅ Fix in 5 Minutes

### Step 1: Check Console (1 min)
1. Open your Vercel app
2. Press F12 (DevTools)
3. Go to Console tab
4. Look for lines starting with `[ENV]`

You should see:
```
[ENV] VITE_API_BASE: https://elimulink-api.onrender.com
[API] Will call: { chat: "https://...", ... }
```

**If you see:** `[ENV] VITE_API_BASE: (empty - using direct Firestore)`
→ Jump to Step 3 below

### Step 2: Send Test Message (1 min)
Type a message in chat. Watch console.

**Success looks like:**
```
[API] Fetching: https://elimulink-api.onrender.com/api/ai/student
(response appears, chat shows answer)
```

**Error looks like:**
```
[API] Fetching: https://elimulink-api.onrender.com/api/ai/student
[API] Error 500: ... {"error": "..."}
```

### Step 3: Set VITE_API_BASE (3 min)
If missing, fix it:

1. Go to **Vercel Dashboard**
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Name: `VITE_API_BASE`
5. Value: `https://your-render-url.onrender.com`
   - Find this in Render Dashboard → Your Service → URL
6. Click Save
7. Click **Redeploy** in Deployments tab
8. Wait 2-3 minutes for build

### Step 4: Wake Up Render (optional)
If backend is sleeping:

1. Copy your Render URL
2. Visit it in browser: `https://your-render-url.onrender.com`
3. You should see JSON status
4. Close tab and try chat again

---

## 🔧 If Still Not Working

### Check Render Logs
1. Go to Render Dashboard
2. Click your service
3. Click **Logs** tab
4. Look for `[SERVER]` or `[ERROR]` messages

**If you see:** `[CONFIG] Gemini API: NOT configured`
→ Add `GEMINI_API_KEY` to Render environment variables

**If you see:** `[CORS] Blocked: https://...`
→ CORS isn't working (contact dev team)

### Check Frontend Console Again
1. Press F12
2. Send message
3. Look for:
   - `[API] Fetching: ...` — Request sent
   - `[API] Error 500: ...` — Server error (check Render logs)
   - No `[API]` messages? → API base still not set

---

## 📋 Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `Error: Failed to fetch` | Network error or CORS blocked | Check [ENV] logs, verify VITE_API_BASE |
| `[API] Error 500: ...` | Server error | Check Render logs for details |
| `[ENV] VITE_API_BASE: (empty)` | Env var not set | Set VITE_API_BASE in Vercel, redeploy |
| `Network timeout` | Render is sleeping | Visit Render URL to wake it up |
| `[ERROR] GEMINI_API_KEY not set` | Missing on Render | Add to Render environment variables |

---

## 💾 Environment Variables Needed

**On Vercel:**
```
VITE_API_BASE = https://elimulink-api.onrender.com
```

**On Render:**
```
GEMINI_API_KEY = (from Google Cloud Console)
FIREBASE_ADMIN_SA = (from Firebase Console)
```

---

## 🎯 Success Criteria

After 2-3 minutes:

- ✅ Open app, no console errors
- ✅ DevTools shows `[ENV] VITE_API_BASE: https://...`
- ✅ Send message, see `[API] Fetching: ...` in console
- ✅ Get response without error

Done! 🎉

---

## 📚 Need More Help?

- **Detailed guide:** [FETCH_ERROR_FIX.md](FETCH_ERROR_FIX.md)
- **Full checklist:** [DIAGNOSTIC_CHECKLIST.md](DIAGNOSTIC_CHECKLIST.md)
- **Complete investigation:** [INVESTIGATION_REPORT.md](INVESTIGATION_REPORT.md)

---

## Key Console Logs to Watch For

**Good signs:**
```
[ENV] VITE_API_BASE: https://elimulink-api.onrender.com
[API] Will call: { chat: "https://...", ... }
[API] Fetching: https://elimulink-api.onrender.com/api/ai/student
```

**Bad signs:**
```
[ENV] VITE_API_BASE: (empty - using direct Firestore)
[API] Error 500: https://...
[API] Failed to fetch
```

**On Render Backend:**
```
[SERVER] ElimuLink API listening on 4000
[CONFIG] CORS origins: ... *.vercel.app
[CONFIG] Gemini API: set
[API] /api/ai/student - User: uid123, Region: Uganda
[API] Gemini responded successfully (245 chars)
```

