package com.herspace.connect.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.herspace.connect.ui.navigation.Routes
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
 * Android twin of `src/routes/_authenticated/dashboard.tsx` with all recent web features:
 * - Warm Sanctuary Greeting Header with action shortcuts
 * - Main 4-card grid (Cycle Phase, Daily Journal Prompt, Community, Mentor Match)
 * - Dedicated Life Stages & Educational Academy row (AI Care Pathway, At-Home Lab Kits, Perimenopause Navigator)
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

    val lastPeriod = remember(entries) { runCatching { findLastPeriodStart(entries) }.getOrNull() }
    val cycleDay = healthVm.cycleDay(lastPeriod, CYCLE_LENGTH)
    val phaseLabel = when (cycleDay?.let { CycleMath.phaseForDay(it, CYCLE_LENGTH) }) {
        CycleMath.Phase.MENSTRUAL -> "Menstrual Phase"
        CycleMath.Phase.FOLLICULAR -> "Follicular Phase"
        CycleMath.Phase.OVULATION -> "Ovulation Phase"
        CycleMath.Phase.LUTEAL -> "Luteal Phase"
        null -> "Follicular Phase"
    }
    val currentDayNum = cycleDay ?: 8
    val cycleProgress =
        if (cycleDay != null) (cycleDay / CYCLE_LENGTH.toFloat()).coerceIn(0f, 1f) else (8f / 28f)

    val countLabel = postCount?.toString()
        ?: posts.takeIf { it.isNotEmpty() }?.size?.toString()
        ?: "12"

    val screenWidth = LocalConfiguration.current.screenWidthDp
    val wide = screenWidth >= 768

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
    ) {
        Spacer(Modifier.height(16.dp))

        // ── 1. Warm Sanctuary Greeting Header Card (from web dashboard.tsx) ──
        SanctuaryGreetingHeader(
            today = today,
            greeting = greeting,
            name = name,
            onCheckIn = { onNav(Routes.HEALTH) },
            onJournal = { onNav(Routes.WELLNESS) }
        )

        Spacer(Modifier.height(20.dp))

        // ── 2. Main Rhythm & Sisterhood Grid ──
        if (wide) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CycleCard(Modifier.weight(2f), phaseLabel, currentDayNum, cycleProgress, onNav)
                JournalCard(Modifier.weight(1f), onNav)
            }
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                CommunityCard(Modifier.weight(2f), countLabel, onNav)
                MentorCard(Modifier.weight(1f), onNav)
            }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                CycleCard(Modifier.fillMaxWidth(), phaseLabel, currentDayNum, cycleProgress, onNav)
                JournalCard(Modifier.fillMaxWidth(), onNav)
                CommunityCard(Modifier.fillMaxWidth(), countLabel, onNav)
                MentorCard(Modifier.fillMaxWidth(), onNav)
            }
        }

        Spacer(Modifier.height(28.dp))

        // ── 3. Dedicated Life Stages & Educational Academy Sanctuary Row (NEW FEATURE) ──
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f).padding(end = 8.dp)) {
                Text(
                    "Dedicated Life Stages & Academy",
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
                Text(
                    "Comprehensive clinical tools and compassionate guides tailored to every stage of womanhood.",
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            TextButton(onClick = { onNav(Routes.LIBRARY) }) {
                Text("Explore All →", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
            }
        }

        Spacer(Modifier.height(12.dp))

        // 3 Feature Cards
        if (wide) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                LifeStageCard(
                    modifier = Modifier.weight(1f),
                    badge = "Non-Dismissive",
                    label = "Care Pathway",
                    title = "Tell Your Story & Get A Pathway",
                    description = "Can't afford private care or feeling dismissed? AI understands your barriers and maps public, low-cost & community options.",
                    buttonText = "Find My Next Steps →",
                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                    icon = Icons.Filled.VolunteerActivism,
                    onClick = { onNav(Routes.WELLNESS) }
                )
                LifeStageCard(
                    modifier = Modifier.weight(1f),
                    badge = "AMH & Thyroid",
                    label = "Lab Kits",
                    title = "At-Home Lab Integrations",
                    description = "Upload or log Modern Fertility, Everlywell, or clinic lab sheets for cycle-matched deep clinical insights.",
                    buttonText = "Analyze My Lab Kit →",
                    containerColor = HerSpaceColors.Sage.copy(alpha = 0.08f),
                    borderColor = HerSpaceColors.Sage.copy(alpha = 0.25f),
                    icon = Icons.Filled.Biotech,
                    onClick = { onNav(Routes.HEALTH) }
                )
                LifeStageCard(
                    modifier = Modifier.weight(1f),
                    badge = "STRAW+10",
                    label = "Midlife Longevity",
                    title = "Perimenopause Navigator",
                    description = "Track vasomotor hot flashes, night sweats, sleep quality, brain fog, and calculate your clinical score.",
                    buttonText = "Open Navigator →",
                    containerColor = HerSpaceColors.Earth.copy(alpha = 0.08f),
                    borderColor = HerSpaceColors.Earth.copy(alpha = 0.25f),
                    icon = Icons.Filled.LocalFireDepartment,
                    onClick = { onNav(Routes.HEALTH) }
                )
            }
        } else {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                LifeStageCard(
                    modifier = Modifier.fillMaxWidth(),
                    badge = "Non-Dismissive",
                    label = "Care Pathway",
                    title = "Tell Your Story & Get A Pathway",
                    description = "Can't afford private care or feeling dismissed? AI understands your barriers and maps public, low-cost & community options.",
                    buttonText = "Find My Next Steps →",
                    containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                    borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.25f),
                    icon = Icons.Filled.VolunteerActivism,
                    onClick = { onNav(Routes.WELLNESS) }
                )
                LifeStageCard(
                    modifier = Modifier.fillMaxWidth(),
                    badge = "AMH & Thyroid",
                    label = "Lab Kits",
                    title = "At-Home Lab Integrations",
                    description = "Upload or log Modern Fertility, Everlywell, or clinic lab sheets for cycle-matched deep clinical insights.",
                    buttonText = "Analyze My Lab Kit →",
                    containerColor = HerSpaceColors.Sage.copy(alpha = 0.08f),
                    borderColor = HerSpaceColors.Sage.copy(alpha = 0.25f),
                    icon = Icons.Filled.Biotech,
                    onClick = { onNav(Routes.HEALTH) }
                )
                LifeStageCard(
                    modifier = Modifier.fillMaxWidth(),
                    badge = "STRAW+10",
                    label = "Midlife Longevity",
                    title = "Perimenopause Navigator",
                    description = "Track vasomotor hot flashes, night sweats, sleep quality, brain fog, and calculate your clinical score.",
                    buttonText = "Open Navigator →",
                    containerColor = HerSpaceColors.Earth.copy(alpha = 0.08f),
                    borderColor = HerSpaceColors.Earth.copy(alpha = 0.25f),
                    icon = Icons.Filled.LocalFireDepartment,
                    onClick = { onNav(Routes.HEALTH) }
                )
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun SanctuaryGreetingHeader(
    today: String,
    greeting: String,
    name: String,
    onCheckIn: () -> Unit,
    onJournal: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                Text(
                    today.uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 2.sp,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "$greeting, $name.",
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.Normal,
                fontSize = 28.sp,
                lineHeight = 32.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                "Welcome back to your quiet room. Your cycle, sisterhood, and wellness space are waiting for you.",
                fontSize = 13.sp,
                lineHeight = 18.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onCheckIn,
                    shape = RoundedCornerShape(50),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Check In Today", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = onJournal,
                    shape = RoundedCornerShape(50),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Journal Entry", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun DashboardCard(
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    border: BorderStroke? = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = border,
        content = content
    )
}

@Composable
private fun CardHeading(text: String) {
    Text(
        text,
        fontFamily = FontFamily.Serif,
        fontStyle = FontStyle.Italic,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.24f).sp,
        color = MaterialTheme.colorScheme.onSurface
    )
}

@Composable
private fun CardBody(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

@Composable
private fun PhaseBadge(label: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.35f), RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(
            label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.primary
        )
    }
}

@Composable
private fun CycleCard(
    modifier: Modifier,
    phaseLabel: String,
    dayNum: Int,
    progress: Float,
    onNav: (String) -> Unit
) {
    DashboardCard(modifier) {
        Column(Modifier.padding(20.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "BODY & RHYTHM",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                PhaseBadge(phaseLabel)
            }
            Spacer(Modifier.height(8.dp))
            CardHeading("Today's Cycle Phase")
            CardBody("Log a quick check-in to see emotional, hormonal, and physical patterns over time.", Modifier.padding(top = 4.dp))

            Spacer(Modifier.height(16.dp))

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Phase Progress", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("Day $dayNum of 28", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.height(6.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(50))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(progress)
                        .fillMaxHeight()
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.primary)
                )
            }
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Energy and focus often rise during this phase.",
                    fontSize = 11.sp,
                    fontStyle = FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )
                Button(
                    onClick = { onNav(Routes.HEALTH) },
                    shape = RoundedCornerShape(50),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Text("Health Hub →", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun JournalCard(modifier: Modifier, onNav: (String) -> Unit) {
    DashboardCard(
        modifier,
        containerColor = HerSpaceColors.Sage.copy(alpha = 0.06f),
        border = BorderStroke(1.dp, HerSpaceColors.Sage.copy(alpha = 0.25f))
    ) {
        Column(Modifier.padding(20.dp)) {
            Text(
                "MIND & REFLECTION",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp,
                color = HerSpaceColors.Sage
            )
            Spacer(Modifier.height(6.dp))
            CardHeading("Today's Journal Prompt")
            Spacer(Modifier.height(10.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.background.copy(alpha = 0.6f))
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                    .padding(12.dp)
            ) {
                Text(
                    "“What boundary served your peace best yesterday?”",
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    fontSize = 15.sp,
                    lineHeight = 20.sp,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            Spacer(Modifier.height(14.dp))
            OutlinedButton(
                onClick = { onNav(Routes.WELLNESS) },
                shape = RoundedCornerShape(50),
                modifier = Modifier.fillMaxWidth().height(36.dp)
            ) {
                Text("Reflect & Write", fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun CommunityCard(modifier: Modifier, countLabel: String, onNav: (String) -> Unit) {
    DashboardCard(modifier) {
        Column(Modifier.padding(20.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(
                    "SAFE SPACE SISTERHOOD",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                Text("100% Private Circle", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(6.dp))
            CardHeading("Community & Shared Wisdom")
            CardBody(
                "$countLabel supportive conversations are taking place right now across Safe Space. Share questions anonymously or lend advice to a sister.",
                Modifier.padding(top = 4.dp)
            )
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = { onNav(Routes.COMMUNITY) },
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Enter Safe Space", fontSize = 12.sp)
                }
                OutlinedButton(
                    onClick = { onNav(Routes.EXPERIENCE) },
                    shape = RoundedCornerShape(50),
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Experience Match", fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun MentorCard(modifier: Modifier, onNav: (String) -> Unit) {
    DashboardCard(modifier) {
        Column(Modifier.padding(20.dp)) {
            Text(
                "SISTERHOOD NETWORK",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(6.dp))
            CardHeading("Mentor Match")
            CardBody(
                "Connect with experienced women leaders, founders, and clinical guides ready to support your goals.",
                Modifier.padding(top = 4.dp)
            )
            Spacer(Modifier.height(14.dp))
            OutlinedButton(
                onClick = { onNav(Routes.MENTORSHIP) },
                shape = RoundedCornerShape(50),
                modifier = Modifier.fillMaxWidth().height(36.dp)
            ) {
                Text("Browse Mentors →", fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun LifeStageCard(
    modifier: Modifier = Modifier,
    badge: String,
    label: String,
    title: String,
    description: String,
    buttonText: String,
    containerColor: Color,
    borderColor: Color,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = BorderStroke(1.dp, borderColor)
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(icon, contentDescription = null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
                    Text(
                        label.uppercase(),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Box(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.8f))
                        .border(1.dp, borderColor, RoundedCornerShape(50))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(badge, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            }

            Spacer(Modifier.height(8.dp))
            Text(
                title,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                fontWeight = FontWeight.SemiBold,
                fontSize = 17.sp,
                lineHeight = 22.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                description,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp)
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = onClick,
                shape = RoundedCornerShape(50),
                modifier = Modifier.fillMaxWidth().height(34.dp)
            ) {
                Text(buttonText, fontSize = 11.sp, fontWeight = FontWeight.Medium)
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
