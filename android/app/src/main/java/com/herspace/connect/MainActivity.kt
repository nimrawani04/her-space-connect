package com.herspace.connect

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.ui.navigation.HerSpaceNav
import com.herspace.connect.ui.theme.HerSpaceTheme
import io.github.jan.supabase.auth.handleDeeplinks

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        // Google OAuth / email-link callback: herspace://auth-callback?code=…
        SupabaseProvider.client.handleDeeplinks(intent)
        setContent {
            HerSpaceTheme {
                HerSpaceNav()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        SupabaseProvider.client.handleDeeplinks(intent)
    }
}
