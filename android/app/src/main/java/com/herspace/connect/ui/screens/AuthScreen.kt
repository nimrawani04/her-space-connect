package com.herspace.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.platform.LocalConfiguration
import com.herspace.connect.viewmodel.AuthViewModel

/**
 * Sign-in screen — 1:1 with the web `src/routes/auth.tsx`:
 * black video-style background with the grid overlay, "HerSpace" nav,
 * and the glass card with Continue with Google → guest demo → email form.
 *
 * Web details reproduced:
 * - video + `bg-black/60` dim + white/[0.04] grid + white/70 plus marks
 * - card `max-w-sm rounded-2xl border-white/10 bg-black/60 backdrop-blur-md p-6`
 * - Google button `rounded-full h-11 bg-white text-black`, guest ghost `h-9`,
 *   divider `bg-white/10` + `or`, labels `text-white/70` above inputs
 *   (`rounded-xl h-10 bg-white/5 border-white/15`), submit `h-11 bg-[#AFDDFF]`
 */
@Composable
fun AuthScreen(
    onDone: () -> Unit,
    onPrivacy: () -> Unit = {},
    onTerms: () -> Unit = {},
    vm: AuthViewModel = viewModel()
) {
    var email by remember { mutableStateOf("") }
    var pw by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf("in") }
    val busy by vm.busy.collectAsState()
    val err by vm.error.collectAsState()
    val activity = androidx.compose.ui.platform.LocalContext.current as? android.app.Activity
    val screenWidthDp = LocalConfiguration.current.screenWidthDp

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        // Video stand-in (soft smoke blobs) + dim + grid, exactly like the web layers.
        AuthBackground(showSquares = screenWidthDp >= 840)

        Column(Modifier.fillMaxSize()) {
            AuthTopBar()

            Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (screenWidthDp >= 768) {
                        Column(Modifier.padding(end = 40.dp, bottom = 32.dp)) {
                            Text(
                                "“A quiet room for your health, shared with those you trust.”",
                                color = Color.White,
                                fontFamily = FontFamily.SansSerif,
                                fontSize = 32.sp,
                                lineHeight = 34.sp
                            )
                            Text(
                                "VERIFIED WOMEN-ONLY · ZERO-KNOWLEDGE PRIVACY",
                                color = Color.White.copy(alpha = 0.6f),
                                fontFamily = FontFamily.SansSerif,
                                fontSize = 12.sp,
                                letterSpacing = 2.4.sp,
                                modifier = Modifier.padding(top = 24.dp)
                            )
                            Text(
                                "HerSpace does not replace professional medical advice, legal counsel, or emergency services.",
                                color = Color.White.copy(alpha = 0.4f),
                                fontFamily = FontFamily.SansSerif,
                                fontSize = 12.sp,
                                lineHeight = 18.sp,
                                modifier = Modifier.padding(top = 24.dp).widthIn(max = 320.dp)
                            )
                        }
                    }

                    AuthCard(
                        mode = mode,
                        email = email, onEmail = { email = it },
                        password = pw, onPassword = { pw = it },
                        displayName = name, onName = { name = it },
                        busy = busy,
                        error = err,
                        onGoogle = { activity?.let { vm.signInWithGoogle(it, onDone) } },
                        onGuest = { vm.continueAsGuest(onDone) },
                        onSubmit = {
                            if (mode == "in") vm.signIn(email, pw, onDone)
                            else vm.signUp(email, pw, name.ifBlank { email.substringBefore("@") }, onDone)
                        },
                        onToggleMode = { mode = if (mode == "in") "up" else "in" },
                        onPrivacy = onPrivacy,
                        onTerms = onTerms
                    )
                }
            }
        }
    }
}

/**
 * Web layer stack: `<video> + bg-black/60 + grid`. The video is the exact clip
 * from `auth.tsx`, played muted + looping (object-cover = zoom/crop). The smoke
 * blobs stay underneath as the offline/loading fallback.
 */
private const val AUTH_VIDEO_URL =
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4"

@Composable
private fun AuthBackground(showSquares: Boolean) {
    AuthSmokeFallback()
    AuthVideoLayer()
    AuthDimAndGrid(showSquares)
}

/** Soft smoke blobs — visible while the video loads, or when offline. */
@Composable
private fun AuthSmokeFallback() {
    Canvas(Modifier.fillMaxSize()) {
        fun blob(fx: Float, fy: Float, radiusFraction: Float, alpha: Float) {
            val center = Offset(size.width * fx, size.height * fy)
            val radius = size.width * radiusFraction
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color.White.copy(alpha = alpha),
                        Color.Transparent
                    ),
                    center = center,
                    radius = radius
                ),
                radius = radius,
                center = center
            )
        }
        // Top-centre wisp (the pale shape behind the card in the video frame)
        blob(0.52f, 0.10f, 0.55f, 0.10f)
        blob(0.30f, 0.30f, 0.35f, 0.06f)
        // Left-mid smoke
        blob(0.10f, 0.55f, 0.42f, 0.07f)
        blob(0.22f, 0.72f, 0.30f, 0.05f)
        // Bottom-right smoke
        blob(0.88f, 0.82f, 0.45f, 0.06f)
        blob(0.65f, 0.38f, 0.28f, 0.05f)
    }
}

/** The web video: muted, looping, cropped to fill (object-cover). */
@Composable
private fun AuthVideoLayer() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val player = remember {
        androidx.media3.exoplayer.ExoPlayer.Builder(context).build().apply {
            setMediaItem(androidx.media3.common.MediaItem.fromUri(AUTH_VIDEO_URL))
            repeatMode = androidx.media3.common.Player.REPEAT_MODE_ALL
            volume = 0f
            playWhenReady = true
            prepare()
        }
    }
    DisposableEffect(Unit) {
        onDispose { player.release() }
    }
    androidx.compose.ui.viewinterop.AndroidView(
        factory = { ctx ->
            androidx.media3.ui.PlayerView(ctx).apply {
                this.player = player
                useController = false
                resizeMode = androidx.media3.ui.AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

/** `bg-black/60` dim + the white/[0.04] grid + white/70 plus marks. */
@Composable
private fun AuthDimAndGrid(showSquares: Boolean) {
    Canvas(Modifier.fillMaxSize()) {
        // ── bg-black/60 dim ──
        drawRect(Color.Black.copy(alpha = 0.6f))

        // ── grid overlay ──
        val stroke = 1f
        val white04 = Color(0x0AFFFFFF)
        val vFractions = floatArrayOf(0.126f, 0.375f, 0.619f, 0.862f)
        val hFractions = floatArrayOf(0.327f, 0.714f)

        vFractions.forEach { f ->
            val x = size.width * f
            drawLine(white04, Offset(x, 0f), Offset(x, size.height), strokeWidth = stroke)
        }
        hFractions.forEach { f ->
            val y = size.height * f
            drawLine(white04, Offset(0f, y), Offset(size.width, y), strokeWidth = stroke)
        }

        // plus marks at the intersections (10px arms, white/70)
        val arm = 10f * density
        val white70 = Color.White.copy(alpha = 0.7f)
        hFractions.forEach { top ->
            vFractions.forEach { left ->
                val x = size.width * left
                val y = size.height * top
                drawLine(white70, Offset(x - arm / 2, y), Offset(x + arm / 2, y), strokeWidth = stroke)
                drawLine(white70, Offset(x, y - arm / 2), Offset(x, y + arm / 2), strokeWidth = stroke)
            }
        }

        if (showSquares) {
            val sq = 90f * density
            val border = Color.White.copy(alpha = 0.8f)
            drawRect(border, topLeft = Offset(size.width * 0.60f, size.height * 0.27f), size = androidx.compose.ui.geometry.Size(sq, sq), style = Stroke(stroke))
            drawRect(border, topLeft = Offset(size.width * 0.32f, size.height * 0.58f), size = androidx.compose.ui.geometry.Size(sq, sq), style = Stroke(stroke))
            val line = Color.White.copy(alpha = 0.25f)
            drawLine(line, Offset(size.width * 0.38f, size.height * 0.14f), Offset(size.width * 0.52f, size.height * 0.14f), strokeWidth = stroke)
            drawLine(line, Offset(size.width * 0.32f, size.height * 0.58f), Offset(size.width * 0.20f, size.height * 0.74f), strokeWidth = stroke)
        }
    }
}

@Composable
private fun AuthTopBar() {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 20.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // font-graphik 18px — plain sans, no italic (matches web nav link)
        Text(
            "HerSpace",
            color = Color.White,
            fontFamily = FontFamily.SansSerif,
            fontSize = 18.sp,
            lineHeight = 21.sp
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AuthCard(
    mode: String,
    email: String, onEmail: (String) -> Unit,
    password: String, onPassword: (String) -> Unit,
    displayName: String, onName: (String) -> Unit,
    busy: Boolean,
    error: String?,
    onGoogle: () -> Unit,
    onGuest: () -> Unit,
    onSubmit: () -> Unit,
    onToggleMode: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit
) {
    // Web Input: rounded-xl h-10 bg-white/5 border-white/15 text-white
    val fieldShape = RoundedCornerShape(12.dp)
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        disabledTextColor = Color.White.copy(alpha = 0.4f),
        focusedContainerColor = Color.White.copy(alpha = 0.05f),
        unfocusedContainerColor = Color.White.copy(alpha = 0.05f),
        disabledContainerColor = Color.White.copy(alpha = 0.05f),
        focusedBorderColor = Color.White.copy(alpha = 0.35f),
        unfocusedBorderColor = Color.White.copy(alpha = 0.15f),
        cursorColor = Color(0xFFAFDDFF)
    )
    val fieldModifier = Modifier.fillMaxWidth().height(40.dp)

    Column(
        Modifier
            .widthIn(max = 384.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            // bg-black/60 + backdrop-blur-md: no backdrop blur on native, so a
            // near-opaque card keeps the grid from bleeding through like the web.
            .background(Color(0xFF0D0D0D).copy(alpha = 0.94f))
            .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(16.dp))
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column {
            Text(
                if (mode == "in") "Welcome back." else "Join HerSpace.",
                color = Color.White,
                fontFamily = FontFamily.SansSerif,
                fontSize = 32.sp,
                lineHeight = 32.sp
            )
            Text(
                if (mode == "in") "Sign in to your space." else "Create your account — it takes a minute.",
                color = Color.White.copy(alpha = 0.6f),
                fontFamily = FontFamily.SansSerif,
                fontSize = 13.sp, lineHeight = 18.sp,
                modifier = Modifier.padding(top = 8.dp)
            )
        }

        // Continue with Google (w-full rounded-full h-11 bg-white) + guest (h-9 ghost)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = onGoogle,
                enabled = !busy,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black,
                    disabledContainerColor = Color.White.copy(alpha = 0.5f),
                    disabledContentColor = Color.Black.copy(alpha = 0.6f)
                ),
                shape = RoundedCornerShape(50),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                modifier = Modifier.fillMaxWidth().height(44.dp)
            ) {
                GoogleLogo(Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text("Continue with Google", fontSize = 14.sp, fontWeight = FontWeight.Medium, fontFamily = FontFamily.SansSerif)
            }

            TextButton(
                onClick = onGuest,
                enabled = !busy,
                colors = ButtonDefaults.textButtonColors(contentColor = Color.White.copy(alpha = 0.6f)),
                shape = RoundedCornerShape(50),
                modifier = Modifier.fillMaxWidth().height(36.dp)
            ) {
                Text("Instant Guest / Demo Access →", fontSize = 12.sp, fontFamily = FontFamily.SansSerif)
            }
        }

        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.1f))
            Text(
                "or",
                color = Color.White.copy(alpha = 0.4f),
                fontFamily = FontFamily.SansSerif,
                fontSize = 11.sp,
                letterSpacing = 1.5.sp,
                modifier = Modifier.padding(horizontal = 12.dp)
            )
            HorizontalDivider(modifier = Modifier.weight(1f), color = Color.White.copy(alpha = 0.1f))
        }

        // Labels above inputs — exactly like the web <Label> + <Input>.
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (mode == "up") {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Your name", color = Color.White.copy(alpha = 0.7f), fontFamily = FontFamily.SansSerif, fontSize = 13.sp)
                    OutlinedTextField(
                        value = displayName, onValueChange = onName,
                        singleLine = true, colors = fieldColors, shape = fieldShape,
                        modifier = fieldModifier, enabled = !busy
                    )
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Email", color = Color.White.copy(alpha = 0.7f), fontFamily = FontFamily.SansSerif, fontSize = 13.sp)
                OutlinedTextField(
                    value = email, onValueChange = onEmail,
                    singleLine = true, colors = fieldColors, shape = fieldShape,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = fieldModifier, enabled = !busy
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Password", color = Color.White.copy(alpha = 0.7f), fontFamily = FontFamily.SansSerif, fontSize = 13.sp)
                OutlinedTextField(
                    value = password, onValueChange = onPassword,
                    singleLine = true, colors = fieldColors, shape = fieldShape,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = fieldModifier, enabled = !busy
                )
            }

            if (error != null) {
                Text(error!!, color = Color(0xFFFF6467), fontFamily = FontFamily.SansSerif, fontSize = 12.sp)
            }

            // Web: disabled={loading} only — always AFDDFF blue otherwise.
            Button(
                onClick = onSubmit,
                enabled = !busy,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFAFDDFF),
                    contentColor = Color.Black,
                    disabledContainerColor = Color(0xFFAFDDFF).copy(alpha = 0.5f),
                    disabledContentColor = Color.Black.copy(alpha = 0.6f)
                ),
                shape = RoundedCornerShape(50),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                modifier = Modifier.fillMaxWidth().height(44.dp)
            ) {
                Text(
                    when {
                        busy -> "..."
                        mode == "in" -> "Sign in"
                        else -> "Create account"
                    },
                    fontSize = 14.sp, fontWeight = FontWeight.Medium, fontFamily = FontFamily.SansSerif
                )
            }
        }

        // "New to HerSpace? Join now" / "Already have an account? Sign in"
        val caption = buildString {
            append(if (mode == "in") "New to HerSpace? " else "Already have an account? ")
            append(if (mode == "in") "Join now" else "Sign in")
        }
        val linkStart = caption.length - if (mode == "in") "Join now".length else "Sign in".length
        val annotated = androidx.compose.ui.text.buildAnnotatedString {
            append(caption)
            addStyle(
                androidx.compose.ui.text.SpanStyle(
                    color = Color(0xFFAFDDFF),
                    fontWeight = FontWeight.Medium
                ),
                linkStart, caption.length
            )
        }
        TextButton(
            onClick = onToggleMode,
            colors = ButtonDefaults.textButtonColors(contentColor = Color.White.copy(alpha = 0.6f)),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(annotated, fontSize = 13.sp, fontFamily = FontFamily.SansSerif, textAlign = TextAlign.Center)
        }
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(
                onClick = onPrivacy,
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = Color.White.copy(alpha = 0.4f))
            ) {
                Text(
                    "Privacy",
                    fontFamily = FontFamily.SansSerif,
                    fontSize = 11.sp,
                    style = androidx.compose.ui.text.TextStyle(
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline
                    )
                )
            }
            Text("·", color = Color.White.copy(alpha = 0.4f), fontFamily = FontFamily.SansSerif, fontSize = 11.sp)
            TextButton(
                onClick = onTerms,
                contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp),
                colors = ButtonDefaults.textButtonColors(contentColor = Color.White.copy(alpha = 0.4f))
            ) {
                Text(
                    "Terms",
                    fontFamily = FontFamily.SansSerif,
                    fontSize = 11.sp,
                    style = androidx.compose.ui.text.TextStyle(
                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline
                    )
                )
            }
        }
    }
}

/** The exact Google "G" marks from the web SVG in `auth.tsx`. */
@Composable
private fun GoogleLogo(modifier: Modifier = Modifier) {
    val marks = remember {
        listOf(
            "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" to android.graphics.Color.parseColor("#4285F4"),
            "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" to android.graphics.Color.parseColor("#34A853"),
            "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" to android.graphics.Color.parseColor("#FBBC05"),
            "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" to android.graphics.Color.parseColor("#EA4335")
        )
    }
    Canvas(modifier) {
        val s = size.minDimension
        scale(scaleX = s / 24f, scaleY = s / 24f, pivot = Offset.Zero) {
            drawIntoCanvas { canvas ->
                val paint = android.graphics.Paint().apply {
                    isAntiAlias = true
                    style = android.graphics.Paint.Style.FILL
                }
                marks.forEach { (data, color) ->
                    val path = androidx.core.graphics.PathParser.createPathFromPathData(data)
                    paint.color = color
                    canvas.nativeCanvas.drawPath(path, paint)
                }
            }
        }
    }
}
