package com.herspace.connect.core.data

import android.content.Context
import com.herspace.connect.BuildConfig
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage

/**
 * Singleton Supabase client — SAME project as the TanStack web app,
 * so Android and web share auth, tables, RLS and realtime.
 *
 * Web config lives in src/integrations/supabase/config.ts:
 *   URL = https://syvqiqhyaoohbjbkftaj.supabase.co
 */
object SupabaseProvider {
    lateinit var client: SupabaseClient
        private set

    fun init(@Suppress("UNUSED_PARAMETER") context: Context) {
        if (::client.isInitialized) return
        client = createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY
        ) {
            install(Auth) {
                scheme = "herspace"
                host = "auth-callback"
            }
            install(Postgrest)
            install(Realtime)
            install(Storage)
            install(Functions)
        }
    }

    suspend fun currentUserId(): String? =
        client.auth.currentUserOrNull()?.id
}
