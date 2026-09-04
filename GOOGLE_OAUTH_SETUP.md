# Google OAuth Setup Guide for HerSpace

## Problem: "Unable to exchange external code" Error

If you're seeing this error after Google sign-in, it means the OAuth redirect URLs are not correctly configured.

## Solution: Configure Google Cloud Console

### Step 1: Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable the **Google+ API** or **Google People API**

### Step 2: Create/Edit OAuth 2.0 Client

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Or edit your existing OAuth 2.0 Client ID
3. Select **Application type**: Web application
4. Give it a name (e.g., "HerSpace Web App")

### Step 3: Configure Authorized Redirect URIs

Add **EXACTLY** these URLs (no trailing slashes):

#### Production URLs (Required):
```
https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
https://her-space-connect.vercel.app/auth/callback
```

#### Local Development URLs (Optional):
```
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
```

### Step 4: Copy Credentials

1. After saving, you'll see your **Client ID** and **Client Secret**
2. Copy both - you'll need them for Supabase

### Step 5: Configure Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/project/foteraufomwdujwappjt)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to expand
4. Enable the provider
5. Paste your **Client ID** from Google Cloud Console
6. Paste your **Client Secret** from Google Cloud Console
7. Verify the **Redirect URL** shown is:
   ```
   https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
   ```
8. Click **Save**

## Important Notes

### URL Format Requirements
- ❌ **Wrong**: `https://example.com/callback/` (trailing slash)
- ✅ **Correct**: `https://example.com/callback`

### The Two URLs Explained
1. **Supabase URL** (`https://foteraufomwdujwappjt.supabase.co/auth/v1/callback`)
   - This is where Google sends the OAuth code
   - Supabase exchanges it for tokens
   - **MUST be in Google Cloud Console**

2. **App URL** (`https://her-space-connect.vercel.app/auth/callback`)
   - This is where your app handles the authenticated session
   - Supabase redirects here after exchanging tokens

### Common Mistakes

1. **Forgetting the Supabase callback URL**
   - You need BOTH URLs in Google Cloud Console
   - The Supabase URL is the most critical one

2. **Typos in URLs**
   - Double-check spelling
   - Check protocol (https vs http)
   - Remove trailing slashes

3. **Credentials not matching**
   - Client ID and Secret in Supabase must match Google Cloud Console exactly

4. **Changes not propagated**
   - Google Cloud Console changes can take 5-10 minutes
   - Clear browser cookies and try again

## Testing the Setup

1. **Clear browser cookies** for your domain
2. Go to your app: `https://her-space-connect.vercel.app/auth`
3. Click **Continue with Google**
4. Select your Google account
5. You should be redirected to `/dashboard`

## Troubleshooting

### Still getting "Unable to exchange external code"?

1. **Verify Google Cloud Console**
   ```bash
   # Check these URLs are EXACTLY in your OAuth client:
   https://foteraufomwdujwappjt.supabase.co/auth/v1/callback
   https://her-space-connect.vercel.app/auth/callback
   ```

2. **Verify Supabase Dashboard**
   - Google provider is enabled
   - Client ID matches Google Cloud Console
   - Client Secret matches Google Cloud Console

3. **Check redirect URL in error message**
   - Look at the URL bar when error occurs
   - Does it show your Vercel domain or Supabase domain?

4. **Try incognito/private browsing**
   - Rules out cookie/cache issues

### Getting different errors?

Check the browser console (F12) for detailed error messages. The app logs all auth events with `[HerSpaceAuth]` prefix.

## For Local Development

If developing locally, add these to Google Cloud Console:

```
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
```

Make sure your `.env` file has:
```
VITE_SUPABASE_URL=https://foteraufomwdujwappjt.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

## Need Help?

1. Check browser console for `[HerSpaceAuth]` logs
2. Check Supabase Dashboard → Authentication → Logs
3. Verify all URLs match exactly (no typos)
4. Wait 10 minutes after making changes in Google Cloud Console
