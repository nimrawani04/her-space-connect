package com.herspace.connect.core.data

import android.content.Context

/**
 * Local guest / demo session — the Android equivalent of the web app's
 * `localStorage.herspace_demo_user` (see `src/routes/auth.tsx` and the guard in
 * `src/routes/_authenticated/route.tsx`).
 *
 * A demo user skips Supabase auth but gets the same shell and screens; data
 * simply stays empty/seeded exactly like the web demo does.
 */
object DemoSession {
    private const val PREFS = "herspace_demo"
    private const val KEY_ACTIVE = "active"
    private const val KEY_NAME = "name"
    private const val KEY_EMAIL = "email"

    @Volatile
    private var appContext: Context? = null

    @Volatile
    var isActive: Boolean = false
        private set

    @Volatile
    var name: String = "Sister"
        private set

    @Volatile
    var email: String = "guest@herspace.app"
        private set

    fun load(context: Context) {
        if (appContext != null) return
        appContext = context.applicationContext
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        isActive = prefs.getBoolean(KEY_ACTIVE, false)
        name = prefs.getString(KEY_NAME, "Sister") ?: "Sister"
        email = prefs.getString(KEY_EMAIL, "guest@herspace.app") ?: "guest@herspace.app"
    }

    /** Mirror of `handleDemoSignIn()` on the web. */
    fun start(name: String = "Sister", email: String = "guest@herspace.app") {
        isActive = true
        this.name = name
        this.email = email
        prefs()?.edit()
            ?.putBoolean(KEY_ACTIVE, true)
            ?.putString(KEY_NAME, name)
            ?.putString(KEY_EMAIL, email)
            ?.apply()
    }

    fun clear() {
        isActive = false
        prefs()?.edit()?.clear()?.apply()
    }

    private fun prefs() = appContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
