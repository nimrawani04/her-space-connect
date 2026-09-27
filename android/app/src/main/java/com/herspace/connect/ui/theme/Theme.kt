package com.herspace.connect.ui.theme

import android.content.Context
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb

/**
 * HerSpace palette — 1:1 with the web app's design tokens in `src/styles.css`.
 * Everything the web expresses with `oklch(...)` / hex Tailwind classes has an
 * equivalent here so both platforms render the same colors.
 */
object HerSpaceColors {
    // ── Brand / accent ──
    val Earth = Color(0xFFC2410C)        // --earth / --primary (default accent)
    val EarthDark = Color(0xFFE26333)    // dark-mode primary
    val Sage = Color(0xFF606A5C)         // --sage
    val Sand = Color(0xFFF5F2ED)         // --sand
    val Accent = Color(0xFFAFDDFF)       // #AFDDFF — nav active, tabs, CTAs

    // ── Light theme (web `:root`) ──
    val LightBackground = Color(0xFFFAFAF9)   // --background
    val LightForeground = Color(0xFF1E1A16)   // --foreground
    val LightCard = Color(0xFFFFFFFF)         // --card
    val LightPrimaryForeground = Color(0xFFFDFCF9)
    val LightSecondary = Color(0xFFF0EAE3)    // --secondary / --accent
    val LightMuted = Color(0xFFF2EEE9)        // --muted
    val LightMutedForeground = Color(0xFF69625A) // --muted-foreground
    val LightBorder = Color(0xFFE1DDD8)       // --border

    // ── Dark theme (web `.dark`) ──
    val DarkBackground = Color(0xFF13110F)
    val DarkForeground = Color(0xFFF8FAFC)
    val DarkCard = Color(0xFF1D1A17)
    val DarkSecondary = Color(0xFF2D2824)
    val DarkMutedForeground = Color(0xFFA39D98)
    val DarkBorder = Color(0x1AFFFFFF)        // white/10

    // ── Auth / landing (web `auth.tsx`, `index.tsx`) ──
    val AuthBlack = Color(0xFF000000)
    val AuthOverlay = Color(0x99000000)       // bg-black/60
    val GridLine = Color(0x0AFFFFFF)          // bg-white/[0.04]
}

/** Light / dark / follow-system, persisted like the web theme provider's `Mode`. */
enum class AppearanceMode { SYSTEM, LIGHT, DARK }

/** The web's background styles from `settings.appearance.tsx`. */
enum class BackgroundStyle { PLAIN, WARM, SAGE, DUSK, GRADIENT, GRAIN }

/**
 * App-wide appearance state (mirrors `src/components/theme-provider.tsx`):
 * mode + accent + background, persisted to SharedPreferences.
 */
object Appearance {
    private const val PREFS = "herspace_appearance"
    private const val KEY_MODE = "mode"
    private const val KEY_ACCENT = "accent"
    private const val KEY_BACKGROUND = "background"

    var mode: AppearanceMode by mutableStateOf(AppearanceMode.SYSTEM)
    var accent: Color by mutableStateOf(HerSpaceColors.Earth)
    var background: BackgroundStyle by mutableStateOf(BackgroundStyle.PLAIN)
        private set

    @Volatile
    private var appContext: Context? = null

    fun load(context: Context) {
        if (appContext != null) return
        appContext = context.applicationContext
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        mode = runCatching { AppearanceMode.valueOf(prefs.getString(KEY_MODE, AppearanceMode.SYSTEM.name)!!) }
            .getOrDefault(AppearanceMode.SYSTEM)
        background = runCatching { BackgroundStyle.valueOf(prefs.getString(KEY_BACKGROUND, BackgroundStyle.PLAIN.name)!!) }
            .getOrDefault(BackgroundStyle.PLAIN)
        prefs.getString(KEY_ACCENT, null)?.let { hex ->
            runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrNull()?.let { accent = it }
        }
    }

    fun applyMode(value: AppearanceMode) {
        mode = value
        persist { it.putString(KEY_MODE, value.name) }
    }

    fun applyAccent(value: Color) {
        accent = value
        val argb = value.toArgb()
        persist { it.putString(KEY_ACCENT, String.format("#%06X", 0xFFFFFF and argb)) }
    }

    fun applyBackground(value: BackgroundStyle) {
        background = value
        persist { it.putString(KEY_BACKGROUND, value.name) }
    }

    fun resetAccent() = applyAccent(HerSpaceColors.Earth)

    private fun persist(block: (android.content.SharedPreferences.Editor) -> Unit) {
        val ctx = appContext ?: return
        val editor = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        block(editor)
        editor.apply()
    }
}

private fun lightScheme(accent: Color) = androidx.compose.material3.lightColorScheme(
    primary = accent,
    onPrimary = if (accent == HerSpaceColors.Accent) HerSpaceColors.AuthBlack else HerSpaceColors.LightPrimaryForeground,
    primaryContainer = HerSpaceColors.Sand,
    onPrimaryContainer = HerSpaceColors.LightForeground,
    secondary = HerSpaceColors.Sand,
    onSecondary = HerSpaceColors.LightForeground,
    secondaryContainer = HerSpaceColors.LightSecondary,
    onSecondaryContainer = HerSpaceColors.LightForeground,
    tertiary = HerSpaceColors.Sage,
    background = HerSpaceColors.LightBackground,
    onBackground = HerSpaceColors.LightForeground,
    surface = HerSpaceColors.LightCard,
    onSurface = HerSpaceColors.LightForeground,
    surfaceVariant = HerSpaceColors.LightMuted,
    onSurfaceVariant = HerSpaceColors.LightMutedForeground,
    surfaceContainer = HerSpaceColors.LightBackground,
    surfaceContainerHigh = HerSpaceColors.LightCard,
    outline = HerSpaceColors.LightBorder,
    outlineVariant = HerSpaceColors.LightBorder,
    error = Color(0xFFCC272E)
)

private fun darkScheme(accent: Color) = androidx.compose.material3.darkColorScheme(
    primary = accent,
    onPrimary = if (accent == HerSpaceColors.Accent) HerSpaceColors.AuthBlack else HerSpaceColors.LightPrimaryForeground,
    primaryContainer = HerSpaceColors.DarkSecondary,
    onPrimaryContainer = HerSpaceColors.DarkForeground,
    secondary = HerSpaceColors.DarkSecondary,
    onSecondary = HerSpaceColors.DarkForeground,
    secondaryContainer = HerSpaceColors.DarkSecondary,
    onSecondaryContainer = HerSpaceColors.DarkForeground,
    tertiary = HerSpaceColors.Sage,
    background = HerSpaceColors.DarkBackground,
    onBackground = HerSpaceColors.DarkForeground,
    surface = HerSpaceColors.DarkCard,
    onSurface = HerSpaceColors.DarkForeground,
    surfaceVariant = HerSpaceColors.DarkSecondary,
    onSurfaceVariant = HerSpaceColors.DarkMutedForeground,
    surfaceContainer = HerSpaceColors.DarkBackground,
    surfaceContainerHigh = HerSpaceColors.DarkCard,
    outline = HerSpaceColors.DarkBorder,
    outlineVariant = HerSpaceColors.DarkBorder,
    error = Color(0xFFFF6467)
)

@Composable
fun HerSpaceTheme(
    darkTheme: Boolean = when (Appearance.mode) {
        AppearanceMode.SYSTEM -> isSystemInDarkTheme()
        AppearanceMode.LIGHT -> false
        AppearanceMode.DARK -> true
    },
    content: @Composable () -> Unit
) {
    // Edge-to-edge draws under the status bar, so match the system icon
    // contrast to the theme (dark icons on the light theme and vice versa).
    // Otherwise the clock/battery vanish on light backgrounds.
    val view = androidx.compose.ui.platform.LocalView.current
    if (!view.isInEditMode) {
        androidx.compose.runtime.SideEffect {
            val window = (view.context as android.app.Activity).window
            androidx.core.view.WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }
    MaterialTheme(
        colorScheme = if (darkTheme) darkScheme(Appearance.accent) else lightScheme(Appearance.accent),
        content = content
    )
}
