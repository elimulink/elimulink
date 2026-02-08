# ElimuLink Vercel Deployment - Quick Reference Card

**Print this or bookmark it for quick reference**

---

## 🚀 5-Minute Vercel Setup

### What to Do:
1. Go to Vercel Project Dashboard → **Settings** → **Environment Variables**
2. Copy-paste these 7 values from Firebase Console:

```
VITE_FIREBASE_API_KEY = [from Firebase Console]
VITE_FIREBASE_AUTH_DOMAIN = [from Firebase Console]
VITE_FIREBASE_PROJECT_ID = [from Firebase Console]
VITE_FIREBASE_STORAGE_BUCKET = [from Firebase Console]
VITE_FIREBASE_MESSAGING_SENDER_ID = [from Firebase Console]
VITE_FIREBASE_APP_ID = [from Firebase Console]
VITE_FIREBASE_MEASUREMENT_ID = [from Firebase Console]
```

3. Click **Redeploy** in Deployments tab
4. Wait 2-3 minutes
5. Open app URL and verify it loads

---

## 🔑 Where to Find Firebase Credentials

**Firebase Console Path:**
1. Go to https://console.firebase.google.com
2. Click your project name
3. Click ⚙️ **Settings** (gear icon, top-right)
4. Go to **General** tab
5. Scroll down to **Your apps**
6. Click **Config** next to your Web app
7. Copy all 7 values into Vercel

---

## ✅ How to Verify It Worked

1. **Check the app loaded:**
   - Should NOT be blank white screen
   - Should NOT show red error panel
   - Should show chat interface

2. **Check console logs:**
   - Open DevTools (F12) → Console
   - Look for `[ENV]` messages
   - Should see: `[ENV] VITE_FIREBASE_API_KEY: AIzaSy...`
   - Should NOT see: `[ERROR] Missing critical env vars`

3. **Check features work:**
   - Sidebar appears (Home, Learn, Chat, etc.)
   - Role picker shows on first visit
   - Can type and send chat messages

---

## ❌ What If It Still Shows Blank Screen?

**Step 1:** Check Vercel Logs
- Vercel Dashboard → Deployments → Latest deployment → View Logs
- Look for errors about environment variables

**Step 2:** Check You Added All Variables
- Settings → Environment Variables
- Verify all 7 are there (not blank)
- No extra spaces in values

**Step 3:** Redeploy
- Click **Redeploy** button
- Wait full 2-3 minutes for build

**Step 4:** Clear Browser Cache
- DevTools (F12) → Network → Settings → Disable cache (while DevTools open)
- Then reload page (Ctrl+R)

---

## 🚨 If Red Error Panel Shows

The app is working! It's just telling you which env vars are missing.

**The panel shows:**
```
⚠️ Configuration Error

Missing required environment variables on Vercel. Contact admin and add these to Vercel:
• VITE_FIREBASE_API_KEY
• VITE_FIREBASE_PROJECT_ID
```

**What to do:**
1. Read the variable names listed
2. Go to Vercel Settings → Environment Variables
3. Add those exact variables
4. Click Redeploy
5. Refresh page in 2-3 minutes

---

## 📋 Variables Explained

| Variable | Source | Purpose | Required? |
|----------|--------|---------|-----------|
| `VITE_FIREBASE_API_KEY` | Firebase Console | Authenticates API requests | ✅ Critical |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console | Identifies your Firebase project | ✅ Critical |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console | Firebase auth domain | ✅ Recommended |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console | File storage bucket | ✅ Recommended |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | Push notifications | ✅ Recommended |
| `VITE_FIREBASE_APP_ID` | Firebase Console | App identifier | ✅ Recommended |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase Console (Analytics) | Analytics tracking | Optional |
| `VITE_API_BASE` | Your backend URL | Backend service (if any) | Optional |
| `VITE_GEMINI_API_KEY` | Google Cloud Console | AI chat features | Optional |

---

## 📞 Troubleshooting Flowchart

```
Does the app load?
├─ YES → All working! ✅
├─ NO (blank white screen) → Check Vercel logs for build errors
│   ├─ Any env var errors? → Add missing variables and redeploy
│   ├─ Other build errors? → Check that npm run build works locally
│   └─ Still blank? → Clear cache (Ctrl+Shift+Delete) and reload
└─ NO (red error panel) → This is normal! Panel shows missing vars
    └─ Add the listed variables to Vercel and redeploy
```

---

## 🔗 Full Documentation

For detailed instructions, see:
- **[VERCEL_ENV_VARS.md](VERCEL_ENV_VARS.md)** — Complete reference with all details
- **[VERCEL_DEPLOYMENT_READY.md](VERCEL_DEPLOYMENT_READY.md)** — Deployment checklist
- **[STATUS.md](STATUS.md)** — What's been done and what's next

---

## ⏱️ Timeline

- **0 min:** Start
- **2 min:** Copy 7 Firebase values into Vercel
- **3 min:** Click Redeploy
- **5 min:** App should be live and working ✅

---

## 💾 Emergency Reference

**Two critical variables:**
```
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_PROJECT_ID=elimulink-pro-v2
```

**If app won't start, these two are blocking it.** Add them first, then add the other 5 Firebase variables.

---

**Last Updated:** February 8, 2025  
**Status:** Ready to Deploy ✅  
**Support:** See [VERCEL_ENV_VARS.md](VERCEL_ENV_VARS.md) for full troubleshooting guide
