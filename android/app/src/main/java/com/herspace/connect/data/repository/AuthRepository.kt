package com.herspace.connect.data.repository

import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.Profile
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest

class AuthRepository {
    private val client get() = SupabaseProvider.client

    suspend fun signIn(email: String, password: String) {
        client.auth.signInWith(io.github.jan.supabase.auth.providers.builtin.Email) {
            this.email = email
            this.password = password
        }
    }

    /**
     * "Continue with Google" — same flow as the web `handleGoogle()` in
     * `src/routes/auth.tsx`: opens the browser, Supabase redirects back to the
     * app's deep link (`herspace://auth-callback`, handled in MainActivity).
     * Fallback for when native sign-in is unavailable.
     */
    suspend fun signInWithGoogle() {
        client.auth.signInWith(io.github.jan.supabase.auth.providers.Google) {
            queryParams["prompt"] = "select_account"
        }
    }

    /**
     * Native Google sign-in: exchanges a Google ID token (from Android
     * Credential Manager) for a Supabase session. Completes fully in-app.
     */
    suspend fun signInWithGoogleIdToken(idToken: String, nonce: String?) {
        client.auth.signInWith(io.github.jan.supabase.auth.providers.builtin.IDToken) {
            this.idToken = idToken
            provider = io.github.jan.supabase.auth.providers.Google
            this.nonce = nonce
        }
    }

    suspend fun signUp(email: String, password: String, displayName: String) {
        client.auth.signUpWith(io.github.jan.supabase.auth.providers.builtin.Email) {
            this.email = email
            this.password = password
        }
        val uid = client.auth.currentUserOrNull()?.id ?: return
        client.postgrest["profiles"].upsert(Profile(id = uid, displayName = displayName))
    }

    suspend fun signOut() = client.auth.signOut()

    suspend fun me(): Profile? {
        val uid = client.auth.currentUserOrNull()?.id ?: return null
        return client.postgrest["profiles"]
            .select { filter { eq("id", uid) }; limit(1) }
            .decodeSingleOrNull<Profile>()
    }

    fun isSignedIn(): Boolean = client.auth.currentUserOrNull() != null
}
