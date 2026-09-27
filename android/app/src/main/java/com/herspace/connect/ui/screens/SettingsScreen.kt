package com.herspace.connect.ui.screens

import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.Monitor
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.repository.AuthRepository
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.Appearance
import com.herspace.connect.ui.theme.AppearanceMode
import com.herspace.connect.ui.theme.BackgroundStyle
import com.herspace.connect.ui.theme.HerSpaceColors
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.storage.storage
import io.ktor.http.ContentType
import kotlinx.coroutines.launch

private data class AccentPreset(val name: String, val hex: String, val color: Color)

private val ACCENT_PRESETS = listOf(
    AccentPreset("Earth", "#c2410c", Color(0xFFC2410C)),
    AccentPreset("Rose", "#be3a5b", Color(0xFFBE3A5B)),
    AccentPreset("Plum", "#7c3aed", Color(0xFF7C3AED)),
    AccentPreset("Sage", "#5a7a5f", Color(0xFF5A7A5F)),
    AccentPreset("Ocean", "#0e7490", Color(0xFF0E7490)),
    AccentPreset("Indigo", "#4f46e5", Color(0xFF4F46E5)),
    AccentPreset("Gold", "#a16207", Color(0xFFA16207)),
    AccentPreset("Ink", "#374151", Color(0xFF374151)),
)

private data class BackgroundPreset(val style: BackgroundStyle, val name: String, val desc: String)

private val BACKGROUNDS = listOf(
    BackgroundPreset(BackgroundStyle.PLAIN, "Plain", "Calm warm off-white"),
    BackgroundPreset(BackgroundStyle.WARM, "Warm glow", "Soft earth wash"),
    BackgroundPreset(BackgroundStyle.SAGE, "Sage haze", "Cool green ambience"),
    BackgroundPreset(BackgroundStyle.DUSK, "Dusk", "Top-down sunset fade"),
    BackgroundPreset(BackgroundStyle.GRADIENT, "Editorial", "Diagonal earth \u2192 sage"),
    BackgroundPreset(BackgroundStyle.GRAIN, "Grain", "Subtle dotted texture"),
)

private const val HEX_RE = "^#[a-fA-F0-9]{6}$"

/** Web `lib/avatar.ts` → `initials()`. */
private fun initials(name: String?): String {
    if (name.isNullOrBlank()) return "\uD83C\uDF38"
    return name.trim()
        .split(Regex("\\s+"))
        .mapNotNull { it.firstOrNull()?.toString() }
        .take(2)
        .joinToString("")
        .uppercase()
}

/** Web `handleUpload()` — same validations, same Supabase targets. */
private suspend fun uploadAvatar(context: Context, uri: Uri, previous: String?, onUploaded: (String) -> Unit) {
    val uid = SupabaseProvider.currentUserId() ?: throw IllegalStateException("Sign in required")
    val resolver = context.contentResolver
    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw IllegalStateException("Upload failed.")
    if (bytes.size > 5 * 1024 * 1024) throw IllegalStateException("Image must be under 5 MB.")
    val mime = resolver.getType(uri) ?: "image/jpeg"
    val ext = mime.substringAfterLast('/').lowercase().let {
        when {
            it.isBlank() -> "jpg"
            it == "jpeg" -> "jpg"
            else -> it
        }
    }
    val path = "$uid/avatar-${System.currentTimeMillis()}.$ext"
    val bucket = SupabaseProvider.client.storage.from("avatars")
    bucket.upload(path, bytes) {
        upsert = true
        contentType = ContentType.parse(mime)
    }
    if (previous != null && previous != path) runCatching { bucket.delete(previous) }
    SupabaseProvider.client.postgrest["profiles"]
        .update({ this["avatar_url"] = path }) { filter { eq("id", uid) } }
    onUploaded(path)
}

/**
 * Port of `src/routes/_authenticated/settings.appearance.tsx` — "You" profile card,
 * Theme card (appearance mode / accent / background), live preview and (extra, per
 * spec) an account section with the shell's "Sign out" action.
 */
@Composable
fun SettingsScreen(onSignOut: () -> Unit) {
    var displayName by remember { mutableStateOf("") }
    var avatarPath by remember { mutableStateOf<String?>(null) }
    var profileLoaded by remember { mutableStateOf(false) }
    var uploading by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    var hexText by remember { mutableStateOf("#C2410C") }
    var pendingUri by remember { mutableStateOf<Uri?>(null) }

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repo = remember { AuthRepository() }

    LaunchedEffect(Unit) {
        val profile = runCatching { repo.me() }.getOrNull()
        displayName = profile?.displayName.orEmpty()
        avatarPath = profile?.avatarUrl
        profileLoaded = true
    }

    // Keep the hex field in sync with the accent (swatches, reset, load).
    LaunchedEffect(Appearance.accent) {
        hexText = "#%06X".format(0xFFFFFF and Appearance.accent.toArgb())
    }

    val avatarImage by produceState<ImageBitmap?>(initialValue = null, avatarPath) {
        value = avatarPath?.let { path ->
            runCatching {
                val bytes = SupabaseProvider.client.storage.from("avatars").downloadAuthenticated(path)
                BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.asImageBitmap()
            }.getOrNull()
        }
    }

    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) pendingUri = uri
    }

    LaunchedEffect(pendingUri) {
        val uri = pendingUri ?: return@LaunchedEffect
        uploading = true
        notice = try {
            uploadAvatar(context, uri, avatarPath) { avatarPath = it }
            "Profile picture updated."
        } catch (e: Exception) {
            e.message ?: "Upload failed."
        } finally {
            uploading = false
        }
        pendingUri = null
    }

    fun removeAvatar() {
        val path = avatarPath ?: return
        scope.launch {
            try {
                val uid = SupabaseProvider.currentUserId()
                if (uid == null) {
                    notice = "Sign in required"
                    return@launch
                }
                SupabaseProvider.client.storage.from("avatars").delete(path)
                SupabaseProvider.client.postgrest["profiles"]
                    .update({ setToNull("avatar_url") }) { filter { eq("id", uid) } }
                avatarPath = null
                notice = "Picture removed."
            } catch (e: Exception) {
                notice = e.message ?: "Upload failed."
            }
        }
    }

    // Web `resetAll()`.
    fun resetAll() {
        Appearance.applyMode(AppearanceMode.LIGHT)
        Appearance.resetAccent()
        Appearance.applyBackground(BackgroundStyle.PLAIN)
        notice = "Appearance reset to defaults."
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            ScreenHeader(
                "Settings",
                "Theme & Appearance",
                "Tune HerSpace to feel like yours. Everything saves to your profile and follows you across devices.",
            )
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                OutlinedButton(onClick = { resetAll() }, shape = RoundedCornerShape(50.dp)) {
                    Icon(Icons.Outlined.Refresh, null, Modifier.size(14.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Reset to defaults")
                }
            }
        }

        // ── You (profile + avatar) ──
        item {
            ThemeCard {
                CardTitle("You")
                if (!profileLoaded) {
                    LoadingRow()
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            AvatarDisplay(80.dp, initials(displayName), avatarImage)
                            Column(
                                Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                OutlinedButton(
                                    onClick = { pickPhoto.launch("image/*") },
                                    enabled = !uploading,
                                    shape = RoundedCornerShape(50.dp),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Icon(Icons.Outlined.Upload, null, Modifier.size(14.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        when {
                                            uploading -> "Uploading\u2026"
                                            avatarPath != null -> "Replace photo"
                                            else -> "Upload photo"
                                        },
                                    )
                                }
                                if (avatarPath != null) {
                                    TextButton(
                                        onClick = { removeAvatar() },
                                        shape = RoundedCornerShape(50.dp),
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = ButtonDefaults.textButtonColors(
                                            contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                        ),
                                    ) {
                                        Icon(Icons.Outlined.Delete, null, Modifier.size(14.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("Remove")
                                    }
                                }
                            }
                        }
                        Text(
                            "Your photo appears in the header and across HerSpace.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        notice?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        // ── Theme ──
        item {
            ThemeCard {
                CardTitle("Theme")
                Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
                    // Appearance mode
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionLabel("Appearance")
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ModeTile(
                                icon = { Icon(Icons.Outlined.LightMode, null, Modifier.size(16.dp)) },
                                label = "Light",
                                selected = Appearance.mode == AppearanceMode.LIGHT,
                                onClick = { Appearance.applyMode(AppearanceMode.LIGHT) },
                                modifier = Modifier.weight(1f),
                            )
                            ModeTile(
                                icon = { Icon(Icons.Outlined.DarkMode, null, Modifier.size(16.dp)) },
                                label = "Dark",
                                selected = Appearance.mode == AppearanceMode.DARK,
                                onClick = { Appearance.applyMode(AppearanceMode.DARK) },
                                modifier = Modifier.weight(1f),
                            )
                            ModeTile(
                                icon = { Icon(Icons.Outlined.Monitor, null, Modifier.size(16.dp)) },
                                label = "Auto",
                                selected = Appearance.mode == AppearanceMode.SYSTEM,
                                onClick = { Appearance.applyMode(AppearanceMode.SYSTEM) },
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    // Accent color
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            SectionLabel("Accent color")
                            TextButton(
                                onClick = { Appearance.resetAccent() },
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                                colors = ButtonDefaults.textButtonColors(
                                    contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            ) {
                                Icon(Icons.Outlined.Refresh, null, Modifier.size(12.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Reset", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        AccentSwatches()
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            // Preview well for the custom colour (web's <input type="color">).
                            Box(
                                Modifier.size(44.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Appearance.accent)
                                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp)),
                            )
                            OutlinedTextField(
                                value = hexText,
                                onValueChange = { value ->
                                    hexText = value
                                    if (Regex(HEX_RE).matches(value)) {
                                        runCatching {
                                            Appearance.applyAccent(Color(android.graphics.Color.parseColor(value)))
                                        }
                                    }
                                },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                                    .semantics { contentDescription = "Custom accent color" },
                                textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                            )
                        }
                    }

                    // Background presets
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        SectionLabel("Background")
                        BACKGROUNDS.chunked(2).forEach { pair ->
                            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                pair.forEach { preset ->
                                    BackgroundOption(
                                        preset = preset,
                                        selected = Appearance.background == preset.style,
                                        onClick = { Appearance.applyBackground(preset.style) },
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                                if (pair.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        }

        // ── Live preview ──
        item {
            ThemeCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Outlined.AutoAwesome, null, Modifier.size(16.dp), tint = HerSpaceColors.Earth)
                    CardTitle("Live preview")
                }
                Spacer(Modifier.height(12.dp))
                Box(
                    Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
                        .background(MaterialTheme.colorScheme.background),
                ) {
                    Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            AvatarDisplay(40.dp, initials(displayName), avatarImage)
                            Column {
                                Text(
                                    "Hello, ${displayName.ifBlank { "Sister" }}.",
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontFamily = FontFamily.Serif,
                                        fontStyle = FontStyle.Italic,
                                    ),
                                )
                                Text(
                                    "This is how your space feels.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {}, shape = RoundedCornerShape(50.dp)) { Text("Primary action") }
                            OutlinedButton(onClick = {}, shape = RoundedCornerShape(50.dp)) { Text("Secondary") }
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(HerSpaceColors.Earth)
                                    .padding(horizontal = 10.dp, vertical = 4.dp),
                                contentAlignment = Alignment.Center,
                            ) { Text("Tag", color = Color.White, style = MaterialTheme.typography.labelSmall) }
                            OutlineTag("Outline")
                        }
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                "Cards, inputs, and links all pick up your accent color automatically. " +
                                    "Try a link to your dashboard.",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                }
            }
        }

        // ── Account / sign out ──
        item {
            ThemeCard {
                CardTitle("Account")
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = onSignOut,
                    shape = RoundedCornerShape(50.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(Icons.Outlined.Logout, null, Modifier.size(14.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign out")
                }
            }
        }
    }
}

@Composable
private fun ThemeCard(content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(16.dp), content = content)
    }
}

@Composable
private fun CardTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleLarge.copy(
            fontFamily = FontFamily.Serif,
            fontStyle = FontStyle.Italic,
        ),
    )
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall.copy(
            letterSpacing = 1.9.sp,
        ),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun OutlineTag(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.background)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun ModeTile(
    icon: @Composable () -> Unit,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    val background = if (selected) MaterialTheme.colorScheme.secondaryContainer else Color.Transparent
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .border(1.dp, border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        icon()
        Text(label, style = MaterialTheme.typography.labelSmall)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AccentSwatches() {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ACCENT_PRESETS.forEach { preset ->
            val selected = Appearance.accent.toArgb() == preset.color.toArgb()
            Box(
                Modifier.size(36.dp)
                    .clip(CircleShape)
                    .background(preset.color)
                    .border(2.dp, if (selected) MaterialTheme.colorScheme.onSurface else Color.Transparent, CircleShape)
                    .clickable { Appearance.applyAccent(preset.color) }
                    .semantics { contentDescription = preset.name },
            )
        }
    }
}

@Composable
private fun BackgroundOption(
    preset: BackgroundPreset,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val border = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
    Column(
        modifier
            .clip(RoundedCornerShape(12.dp))
            .border(if (selected) 2.dp else 1.dp, border, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        BackgroundSwatch(preset.style)
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(preset.name, style = MaterialTheme.typography.bodyMedium)
            if (selected) OutlineTag("Active")
        }
        Text(
            preset.desc,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** `BackgroundSwatch` from `settings.appearance.tsx`, redrawn with Compose brushes. */
@Composable
private fun BackgroundSwatch(style: BackgroundStyle) {
    val base = MaterialTheme.colorScheme.background
    val outline = MaterialTheme.colorScheme.outline
    BoxWithConstraints(
        Modifier.fillMaxWidth()
            .height(64.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(base)
            .border(1.dp, outline, RoundedCornerShape(8.dp)),
    ) {
        val density = LocalDensity.current
        val w = with(density) { maxWidth.toPx() }
        val h = with(density) { maxHeight.toPx() }
        val earth = HerSpaceColors.Earth
        val sage = HerSpaceColors.Sage
        val sand = HerSpaceColors.Sand
        val dotColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.25f)
        Canvas(Modifier.fillMaxSize()) {
            when (style) {
                BackgroundStyle.PLAIN -> Unit
                BackgroundStyle.WARM -> {
                    drawRect(
                        Brush.radialGradient(
                            listOf(earth.copy(alpha = 0.30f), Color.Transparent),
                            center = Offset(0.2f * w, 0f),
                            radius = 0.6f * w,
                        ),
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(sand.copy(alpha = 0.80f), Color.Transparent),
                            center = Offset(w, h),
                            radius = 0.6f * w,
                        ),
                    )
                }
                BackgroundStyle.SAGE -> {
                    drawRect(
                        Brush.radialGradient(
                            listOf(sage.copy(alpha = 0.35f), Color.Transparent),
                            center = Offset(0.8f * w, 0.1f * h),
                            radius = 0.6f * w,
                        ),
                    )
                    drawRect(
                        Brush.radialGradient(
                            listOf(sand.copy(alpha = 0.80f), Color.Transparent),
                            center = Offset(0f, h),
                            radius = 0.6f * w,
                        ),
                    )
                }
                BackgroundStyle.DUSK -> {
                    drawRect(
                        Brush.verticalGradient(
                            0f to earth.copy(alpha = 0.18f),
                            0.8f to Color.Transparent,
                        ),
                    )
                }
                BackgroundStyle.GRADIENT -> {
                    drawRect(
                        Brush.linearGradient(
                            0f to earth.copy(alpha = 0.25f),
                            0.5f to Color.Transparent,
                            1f to sage.copy(alpha = 0.30f),
                        ),
                    )
                }
                BackgroundStyle.GRAIN -> {
                    val step = 5.dp.toPx()
                    val radius = 1.dp.toPx()
                    var y = step / 2
                    while (y < h) {
                        var x = step / 2
                        while (x < w) {
                            drawCircle(dotColor, radius = radius, center = Offset(x, y))
                            x += step
                        }
                        y += step
                    }
                }
            }
        }
    }
}

@Composable
private fun AvatarDisplay(size: Dp, initialsText: String, image: ImageBitmap?) {
    Box(
        Modifier.size(size)
            .clip(CircleShape)
            .background(HerSpaceColors.Sand)
            .border(2.dp, MaterialTheme.colorScheme.outline, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (image != null) {
            Image(
                bitmap = image,
                contentDescription = "Your profile picture",
                modifier = Modifier.fillMaxSize().clip(CircleShape),
                contentScale = ContentScale.Crop,
            )
        } else {
            Text(
                initialsText,
                color = HerSpaceColors.Earth,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                ),
            )
        }
    }
}
