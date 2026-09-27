package com.herspace.connect.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.core.data.DemoSession
import com.herspace.connect.core.util.CycleMath
import com.herspace.connect.data.model.CycleEntry
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.CommunityViewModel
import com.herspace.connect.viewmodel.DashboardViewModel
import com.herspace.connect.viewmodel.HealthViewModel
import java.time.LocalDate
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/** The web's default cycle length (the health page defaults to 28 too). */
private const val CYCLE_LENGTH = 28

/**
 * Android twin of `src/routes/_authenticated/dashboard.tsx`.
 *
 * Same greeting header (localized date + time-of-day greeting + display name),
 * the same four cards in the same order (Today's cycle → Journal prompt →
 * Community feed → Mentor match), the same copy, button variants, and the same
 * `md:grid-cols-3` behaviour: at ≥768dp the cards sit in a 2+1 / 2+1 grid,
 * below that they stack one per row exactly like the web's single-column grid.
 *
 * Data comes from the shared ViewModels:
 *  - name       → DashboardViewModel.name (falls back to the demo session / "Sister")
 *  - post count → DashboardViewModel.postCount, else the community post list
 *                 (web counts `community_posts`; "—" is the web's null state)
 *  - cycle card → HealthViewModel cycle entries, phase math identical to the web
 *                 (`CycleMath.phaseForDay`, same day-1..5 / ovDay rules)
 */
@Composable
fun DashboardScreen(onNav: (String) -> Unit) {
    val dashVm: DashboardViewModel = viewModel()
    val communityVm: CommunityViewModel = viewModel()
    val healthVm: HealthViewModel = viewModel()

    val profileName by dashVm.name.collectAsState()
    val postCount by dashVm.postCount.collectAsState()
    val posts by communityVm.posts.collectAsState()
    val entries by healthVm.entries.collectAsState()

    // "Sunday, September 27" — web: toLocaleDateString({ weekday, month, day }).
    val today = remember { LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, MMMM d")) }
    val greeting = remember {
        when (LocalTime.now().hour) {
            in 0..4 -> "Good night"
            in 5..11 -> "Good morning"
            in 12..17 -> "Good afternoon"
            else -> "Good evening"
        }
    }
    val name = profileName?.takeIf { it.isNotBlank() }
        ?: if (DemoSession.isActive) DemoSession.name else "Sister"

    // Today's cycle — derive the phase from the user's own cycle_entries rows,
    // mirroring the web's flow-run detection on the health page. With no data the
    // card renders exactly what the web renders: "Follicular" and a 2/5 bar.
    val lastPeriod = remember(entries) { runCatching { findLastPeriodStart(entries) }.getOrNull() }
    val cycleDay = healthVm.cycleDay(lastPeriod, CYCLE_LENGTH)
    val phaseLabel = when (cycleDay?.let { CycleMath.phaseForDay(it, CYCLE_LENGTH) }) {
        CycleMath.Phase.MENSTRUAL -> "Menstrual"
        CycleMath.Phase.FOLLICULAR -> "Follicular"
        CycleMath.Phase.OVULATION -> "Ovulation"
        CycleMath.Phase.LUTEAL -> "Luteal"
        null -> "Follicular"
    }
    val cycleProgress =
        if (cycleDay != null) (cycleDay / CYCLE_LENGTH.toFloat()).coerceIn(0f, 1f) else 0.4f // web: w-2/5

    // Web: `{postCount ?? "—"} conversations happening now across Safe Space.`
    val countLabel = postCount?.toString()
        ?: posts.takeIf { it.isNotEmpty() }?.size?.toString()
        ?: "—"

    val screenWidth = LocalConfiguration.current.screenWidthDp
    val wide = screenWidth >= 768 // md:grid-cols-3
    val titleSize = when {
        screenWidth >= 768 -> 48.sp // md:text-5xl
        screenWidth >= 640 -> 36.sp // sm:text-4xl
        else -> 30.sp // text-3xl
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
    ) {
        // ── header ──
        Column(Modifier.padding(top = 20.dp, bottom = 40.dp)) { // space-y-10 below
            Text(
                today.uppercase(),
                fontSize = 12.sp, // text-xs
                lineHeight = 16.sp,
                letterSpacing = 2.4.sp, // tracking-[0.2em]
                color = MaterialTheme.colorScheme.onSurfaceVariant, // text-muted-foreground
                modifier = Modifier.padding(bottom = 8.dp) // mb-2
            )
            Text(
                "$greeting, $name.", // {greeting}, {name}.
                fontFamily = FontFamily.Serif, // font-serif
                fontStyle = FontStyle.Italic, // italic
                fontWeight = FontWeight.Normal,
                fontSize = titleSize,
                lineHeight = (titleSize.value * 1.05f).sp, // --leading-display
                letterSpacing = (-titleSize.value * 0.02f).sp, // --tracking-display
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // ── grid (gap-6 = 24dp) ──
        if (wide) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                CycleCard(Modifier.weight(2f), phaseLabel, cycleProgress, onNav)
                JournalCard(Modifier.weight(1f), onNav)
            }
            Spacer(Modifier.height(24.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(24.dp)) {
                CommunityCard(Modifier.weight(2f), countLabel, onNav)
                MentorCard(Modifier.weight(1f), onNav)
            }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                CycleCard(Modifier.fillMaxWidth(), phaseLabel, cycleProgress, onNav)
                JournalCard(Modifier.fillMaxWidth(), onNav)
                CommunityCard(Modifier.fillMaxWidth(), countLabel, onNav)
                MentorCard(Modifier.fillMaxWidth(), onNav)
            }
        }

        Spacer(Modifier.height(24.dp)) // bottom content padding
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cards — same shell as the web's shadcn Card: rounded-2xl border bg-card shadow-sm
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun DashboardCard(
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface, // bg-card
    border: BorderStroke? = BorderStroke(1.dp, MaterialTheme.colorScheme.outline), // border
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp), // rounded-2xl
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = border,
        content = content
    )
}

/** CardTitle: font-serif italic text-2xl font-semibold leading-none tracking-tight */
@Composable
private fun CardHeading(text: String) {
    Text(
        text,
        fontFamily = FontFamily.Serif,
        fontStyle = FontStyle.Italic,
        fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.24f).sp, // tracking-tight
        color = MaterialTheme.colorScheme.onSurface
    )
}

/** CardDescription: text-sm text-muted-foreground */
@Composable
private fun CardBody(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier,
        fontSize = 14.sp,
        lineHeight = 20.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

/** Badge: rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] */
@Composable
private fun PhaseBadge(label: String) {
    Box(
        Modifier
            .border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(50)) // border-earth
            .padding(horizontal = 10.dp, vertical = 2.dp)
    ) {
        Text(
            label.uppercase(), // badge base class is `uppercase`
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 1.32.sp, // tracking-[0.12em]
            color = MaterialTheme.colorScheme.primary // text-earth
        )
    }
}

/** Button (default variant): rounded-full h-9 px-4 bg-primary text-primary-foreground */
@Composable
private fun FilledPillButton(label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        modifier = Modifier.height(36.dp)
    ) {
        Text(label)
    }
}

/** Button variant="outline": rounded-full h-9 border bg-background text-foreground */
@Composable
private fun OutlinePillButton(label: String, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = MaterialTheme.colorScheme.onBackground
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        modifier = Modifier.height(36.dp)
    ) {
        Text(label)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// The four dashboard cards
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun CycleCard(
    modifier: Modifier,
    phaseLabel: String,
    progress: Float,
    onNav: (String) -> Unit
) {
    DashboardCard(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = 24.dp, top = 24.dp, end = 24.dp), // CardHeader p-6
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(Modifier.weight(1f).padding(end = 12.dp)) {
                CardHeading("Today's cycle")
                CardBody("Log a quick check-in to see patterns over time.", Modifier.padding(top = 6.dp))
            }
            PhaseBadge(phaseLabel)
        }
        Column(Modifier.padding(start = 24.dp, top = 24.dp, end = 24.dp, bottom = 24.dp)) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp) // h-2
                    .clip(RoundedCornerShape(50))
                    .background(MaterialTheme.colorScheme.surfaceVariant) // bg-muted
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(progress) // w-2/5
                        .fillMaxHeight()
                        .background(MaterialTheme.colorScheme.primary) // bg-earth
                )
            }
            Spacer(Modifier.height(16.dp)) // mb-4
            FilledPillButton("Open Health Hub") { onNav("health") }
        }
    }
}

@Composable
private fun JournalCard(modifier: Modifier, onNav: (String) -> Unit) {
    DashboardCard(
        modifier,
        containerColor = HerSpaceColors.Sage.copy(alpha = 0.05f), // bg-sage/5
        border = BorderStroke(1.dp, HerSpaceColors.Sage.copy(alpha = 0.20f)) // ring-sage/20
    ) {
        Column(Modifier.padding(24.dp)) {
            CardHeading("Journal prompt")
            Text(
                "\"What boundary served you best yesterday?\"",
                fontFamily = FontFamily.Serif, // font-serif italic text-lg
                fontStyle = FontStyle.Italic,
                fontSize = 18.sp,
                lineHeight = 24.sp,
                color = MaterialTheme.colorScheme.onBackground,
                modifier = Modifier.padding(top = 24.dp)
            )
            Spacer(Modifier.height(16.dp)) // CardContent space-y-4
            OutlinePillButton("Write now") { onNav("wellness") }
        }
    }
}

@Composable
private fun CommunityCard(modifier: Modifier, countLabel: String, onNav: (String) -> Unit) {
    DashboardCard(modifier) {
        Column(Modifier.padding(24.dp)) {
            CardHeading("Community feed")
            CardBody(
                "$countLabel conversations happening now across Safe Space.",
                Modifier.padding(top = 24.dp)
            )
            Spacer(Modifier.height(12.dp)) // CardContent space-y-3
            OutlinePillButton("Enter Safe Space") { onNav("community") }
        }
    }
}

@Composable
private fun MentorCard(modifier: Modifier, onNav: (String) -> Unit) {
    DashboardCard(modifier) {
        Column(Modifier.padding(24.dp)) {
            CardHeading("Mentor match")
            CardBody("Browse verified women leaders by field.", Modifier.padding(top = 24.dp))
            Spacer(Modifier.height(12.dp)) // CardContent space-y-3
            OutlinePillButton("Find a mentor") { onNav("mentorship") }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Port of the web health page's period-start detection (`health.tsx`): keep the
 * flow days (ignoring "none"/"spotting"), then take the first day of the most
 * recent contiguous run (gap ≤ 2 days) as the last period start.
 */
private fun findLastPeriodStart(entries: List<CycleEntry>): String? {
    val flowDays = entries
        .filter { e ->
            val f = e.flow?.lowercase()?.trim()
            f != null && f.isNotEmpty() && f != "none" && f != "spotting"
        }
        .map { it.entryDate }
        .distinct()
        .sortedDescending()
    if (flowDays.isEmpty()) return null
    var start = flowDays[0]
    var i = 1
    while (i < flowDays.size) {
        val newer = LocalDate.parse(flowDays[i - 1])
        val older = LocalDate.parse(flowDays[i])
        if (ChronoUnit.DAYS.between(older, newer) <= 2) {
            start = flowDays[i]
            i++
        } else break
    }
    return start
}
