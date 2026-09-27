package com.herspace.connect.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp

/**
 * Legal pages — Android twins of `src/routes/privacy.tsx` and
 * `src/routes/terms.tsx`. Reachable from the login card's
 * "Privacy · Terms" row without signing in, exactly like the web links.
 */
@Composable
fun PrivacyScreen(onBack: () -> Unit) {
    LegalPage(
        kicker = "Legal",
        title = "Privacy Policy",
        updated = "Last updated: September 2026",
        onBack = onBack,
        sections = listOf(
            "What we collect" to
                "Account data (name, email, profile photo) provided directly or via Google " +
                "sign-in (basic profile: name, email address, profile picture). Health and " +
                "wellness data you choose to log (cycle, symptoms, journal entries, community " +
                "posts). Technical data needed to operate the service (authentication tokens, " +
                "stored securely by our infrastructure provider Supabase).",
            "How we use it" to
                "To provide your account, personalize health insights, operate community and " +
                "safety features, and keep the women-only space verified. We never sell your " +
                "personal data and never use health journal content for advertising.",
            "Sharing" to
                "Data is processed by our infrastructure providers (hosting, database, " +
                "authentication) solely to operate HerSpace. Community posts you mark public " +
                "are visible to other verified members. We disclose data only when required by law.",
            "Google sign-in data" to
                "When you choose Google sign-in, we receive your name, email address, and " +
                "profile picture from Google (openid, email, and profile scopes) and use them " +
                "only to create and secure your HerSpace account. HerSpace's use of Google user " +
                "data adheres to the Google API Services User Data Policy.",
            "Your rights" to
                "You may request access, correction, export, or deletion of your data at any " +
                "time via Settings or by contacting support. Deleting your account removes your " +
                "profile and personal content.",
            "Contact" to
                "Questions about this policy: contact us through the app or at the support " +
                "email listed on our Google OAuth consent screen."
        )
    )
}

@Composable
fun TermsScreen(onBack: () -> Unit) {
    LegalPage(
        kicker = "Legal",
        title = "Terms of Service",
        updated = "Last updated: September 2026",
        onBack = onBack,
        sections = listOf(
            "The service" to
                "HerSpace is a women-only digital ecosystem for health insights, community, " +
                "mentorship, careers, safety networking, and mental wellness. Accounts are " +
                "verified to keep the space women-only; misrepresentation may lead to removal.",
            "Not professional advice" to
                "HerSpace content, including AI-generated insights, is educational only and does " +
                "not replace professional medical advice, diagnosis, legal counsel, or emergency " +
                "services. Always seek qualified professionals for health concerns.",
            "Acceptable use" to
                "Be respectful. No harassment, hate, explicit content involving minors, spam, " +
                "scraping, or attempts to breach other members' privacy or the platform's " +
                "security. Community content must be your own or shared with permission.",
            "Accounts" to
                "You are responsible for activity under your account. You may delete your " +
                "account at any time from Settings; we may suspend accounts that violate these terms.",
            "Changes" to
                "We may update these terms as HerSpace evolves; material changes will be " +
                "announced in the app. Continued use after changes take effect constitutes acceptance."
        )
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LegalPage(
    kicker: String,
    title: String,
    updated: String,
    onBack: () -> Unit,
    sections: List<Pair<String, String>>
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("HerSpace") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { pad ->
        Column(
            Modifier
                .padding(pad)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Column {
                Text(
                    kicker.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(Modifier.height(4.dp))
                Text(title, style = MaterialTheme.typography.headlineLarge, fontStyle = FontStyle.Italic)
                Spacer(Modifier.height(4.dp))
                Text(updated, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            sections.forEach { (heading, body) ->
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(heading, style = MaterialTheme.typography.titleLarge, fontStyle = FontStyle.Italic)
                    Text(
                        body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}
