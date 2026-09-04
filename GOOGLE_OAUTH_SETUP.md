# Google OAuth Setup Guide for HerSpace

## Problem: OAuth Tokens Not Being Received

If you're seeing logs like `callback.no-token-fragment` and being redirected back to auth, the issue is that Google OAuth redirect URLs are not configured correctly.

## CRITICAL: The Correct Redirect URLs

You need **EXACTLY** these two URLs in your Google Cloud Console OAuth client:

### Primary URL (MOST IMPORTANT):
```
https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
```

### Secondary URL (Your App):
```
https://her-space-connect.vercel.app/auth/callback
```

## Step-by-Step Fix

### 1. Open Google Cloud Console
Go to: https://console.cloud.google.com/apis/credentials

### 2. Select Your Project
Make sure you're in the correct Google Cloud project

### 3. Find Your OAuth 2.0 Client ID
- Look for "OAuth 2.0 Client IDs" section
- Click on your client ID (usually named "Web client" or similar)

### 4. Configure Authorized Redirect URIs

**CRITICAL: You must add BOTH URLs exactly as shown:**

Click "ADD URI" and paste:
```
https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
```

Click "ADD URI" again and paste:
```
https://her-space-connect.vercel.app/auth/callback
```

**Common mistakes to avoid:**
- ❌ `http://` instead of `https://`
- ❌ Trailing slash: `https://example.com/callback/`
- ❌ Missing the Supabase URL (most common!)
- ❌ Wrong Supabase project URL
- ❌ Typo in the domain name

### 5. Save Changes
Click "SAVE" at the bottom of the page

### 6. Verify Supabase Settings

Go to your Supabase Dashboard:
https://app.supabase.com/project/foteraufomwdujwappjt/auth/providers

1. Find **Google** provider
2. Make sure it's **Enabled** (toggle should be ON)
3. Verify your **Client ID** matches Google Cloud Console
4. Verify your **Client Secret** matches Google Cloud Console
5. The callback URL shown should be:
   ```
   https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
   ```

### 7. Test the Configuration

After saving:
1. **Wait 5 minutes** for Google's changes to propagate
2. **Clear your browser cache completely**
   - Chrome: Ctrl+Shift+Delete → "All time" → Check "Cookies" and "Cached images"
3. Go to your app in **incognito/private mode**
4. Try signing in with Google

## How to Verify It's Working

Open browser console (F12) and watch for these logs:

✅ **Success logs:**
```
[HerSpaceAuth] google.sign-in-started
[HerSpaceAuth] callback.started
[HerSpaceAuth] callback.oauth-consumed { hasUser: true }
[HerSpaceAuth] callback.success-redirecting-to-dashboard
```

❌ **Failure logs (what you're seeing now):**
```
[HerSpaceAuth] callback.no-token-fragment
[HerSpaceAuth] session.wait-timeout
```

## Still Not Working?

### Double-Check These:

1. **Exact URL Match**
   - The Supabase callback URL in Google Console must be EXACTLY:
     `https://foteraufomwdujwappjt.supabase.co/auth/v1/callback`
   - Not `auth/callback` or `/callback` or any variation

2. **Both URLs Added**
   - You need BOTH the Supabase URL AND your app URL
   - Google redirects to Supabase first, then Supabase redirects to your app

3. **Wait for Propagation**
   - Google Cloud changes can take 5-10 minutes
   - Try again after waiting

4. **Clear Everything**
   ```
   - Clear browser cookies for her-space-connect.vercel.app
   - Clear browser cookies for accounts.google.com
   - Clear browser cache
   - Try in incognito mode
   ```

5. **Check OAuth Consent Screen**
   - Go to "OAuth consent screen" in Google Cloud Console
   - Make sure your app is not in "Testing" mode with limited users
   - Or add your email to the test users list

## For Local Development

If testing locally, also add:
```
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
```

And your `.env` should have:
```
VITE_SUPABASE_URL=https://foteraufomwdujwappjt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

## The Flow Explained

This is what should happen:

1. User clicks "Continue with Google"
2. App redirects to Google sign-in
3. User signs in with Google
4. **Google redirects to**: `https://foteraufomwdujwappjt.supabase.co/auth/v1/callback?code=xxx`
5. Supabase exchanges the code for tokens
6. **Supabase redirects to**: `https://her-space-connect.vercel.app/auth/callback#access_token=xxx`
7. Your app saves the session
8. Your app redirects to `/dashboard`

If step 4 fails (wrong URL in Google Console), the entire flow breaks.

## Debug: What URL is Google Using?

After signing in with Google, if you get an error, look at the URL in your browser. If you see something like:

```
https://accounts.google.com/...redirect_uri_mismatch...
```

That confirms the redirect URL mismatch. The error page will show which URL Google tried to use and which URLs are registered.
