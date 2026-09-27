package com.herspace.connect.core.data

import android.app.Activity
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.security.MessageDigest
import java.util.UUID

/**
 * Native "Continue with Google" via Android Credential Manager — the same
 * account-chooser / One Tap sheet other apps use. No browser involved, so the
 * sign-in completes inside the app and the session lands directly in Supabase.
 *
 * Needs the Supabase project's Google **Web** client ID
 * (`GOOGLE_WEB_CLIENT_ID`, the `*.apps.googleusercontent.com` value from
 * Supabase dashboard → Authentication → Providers → Google). The web app's
 * Google sign-in already works, so that client ID exists.
 */
sealed interface GoogleNativeResult {
    data class Success(val idToken: String, val nonce: String?) : GoogleNativeResult
    /** User dismissed the sheet — stay put, don't pop a browser on them. */
    data object Cancelled : GoogleNativeResult
    /**
     * Native unavailable — caller falls back to the browser. [reason] is the
     * underlying cause (no Google accounts, stale Play Services, bad client
     * ID, …) so the UI can say WHY instead of silently switching flows.
     */
    data class Unavailable(val reason: String) : GoogleNativeResult
}

private val WEB_CLIENT_ID_PATTERN =
    Regex("^\\d+-[A-Za-z0-9]{32}\\.apps\\.googleusercontent\\.com$")

suspend fun requestGoogleIdToken(
    activity: Activity,
    serverClientId: String
): GoogleNativeResult {
    if (serverClientId.isBlank()) {
        return GoogleNativeResult.Unavailable("no client ID configured")
    }
    Log.d("GoogleNativeAuth", "client ID length=${serverClientId.length}, tail=${serverClientId.takeLast(27)}")
    if (!WEB_CLIENT_ID_PATTERN.matches(serverClientId)) {
        return GoogleNativeResult.Unavailable(
            "client ID malformed (len=${serverClientId.length}) — re-copy the Client ID, not the secret"
        )
    }
    // No nonce — avoids "Nonces mismatch" errors with supabase-kt.
    val nonce: String? = null

    // Single attempt with nonce — avoids double-sheet behavior.
    return tryGoogleRequest(activity, serverClientId, nonce)
}

private suspend fun tryGoogleRequest(
    activity: Activity,
    serverClientId: String,
    nonce: String?
): GoogleNativeResult {
    val builder = GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(serverClientId)
        .setAutoSelectEnabled(false)
    if (nonce != null) builder.setNonce(nonce)
    val request = GetCredentialRequest.Builder()
        .addCredentialOption(builder.build())
        .build()
    return try {
        val result = CredentialManager.create(activity).getCredential(activity, request)
        val google = GoogleIdTokenCredential.createFrom(result.credential.data)
        GoogleNativeResult.Success(google.idToken, nonce)
    } catch (_: GetCredentialCancellationException) {
        GoogleNativeResult.Cancelled
    } catch (e: GetCredentialException) {
        Log.w("GoogleNativeAuth", "native Google request failed (nonce=${nonce != null})", e)
        GoogleNativeResult.Unavailable(
            "${e.message ?: e.javaClass.simpleName} (cidLen=${serverClientId.length})"
        )
    }
}
