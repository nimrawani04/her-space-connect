package com.herspace.connect.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.KeyboardArrowLeft
import androidx.compose.material.icons.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.core.util.CycleMath
import com.herspace.connect.data.model.CycleEntry
import com.herspace.connect.data.model.WellnessLog
import com.herspace.connect.data.repository.HealthRepository
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.HealthViewModel
import com.herspace.connect.viewmodel.todayIso
import kotlinx.coroutines.launch
import kotlinx.serialization.json.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.exp
import kotlin.math.roundToInt
import kotlin.math.sqrt

// ─────────────────────────────────────────────────────────────────────────────
// Palette (mirrors the Tailwind tokens used by src/routes/_authenticated/health.tsx
// and its src/components/health/* children — these tones are fixed on the web too,
// in both light and dark mode).
// ─────────────────────────────────────────────────────────────────────────────

private val Earth = HerSpaceColors.Earth              // --earth  #C2410C
private val OnEarth = Color(0xFFFDFCF9)               // --earth-foreground
private val Sand = HerSpaceColors.Sand                // --sand   #F5F2ED
private val Sage = HerSpaceColors.Sage                // --sage   #606A5C
private val Accent = HerSpaceColors.Accent            // #AFDDFF — active tab pill

private val Amber100 = Color(0xFFFEF3C7)
private val Amber300 = Color(0xFFFCD34D)
private val Amber700 = Color(0xFFB45309)
private val Amber900 = Color(0xFF78350F)
private val Rose100 = Color(0xFFFFE4E6)
private val Rose200 = Color(0xFFFECDD3)
private val Rose300 = Color(0xFFFDA4AF)
private val Rose500 = Color(0xFFF43F5E)
private val Rose700 = Color(0xFFE11D48)
private val Rose900 = Color(0xFF881337)
private val Rose950 = Color(0xFF4C0519)
private val Emerald50 = Color(0xFFECFDF5)
private val Emerald100 = Color(0xFFD1FAE5)
private val Emerald200 = Color(0xFFA7F3D0)
private val Emerald300 = Color(0xFF6EE7B7)
private val Emerald400 = Color(0xFF34D399)
private val Emerald500 = Color(0xFF10B981)
private val Emerald900 = Color(0xFF064E3B)
private val Violet100 = Color(0xFFEDE9FE)
private val Violet300 = Color(0xFFDDD6FE)
private val Violet900 = Color(0xFF4C1D95)
private val Marker = Color(0xFF1F2937)                // #1f2937 — "today" marker on charts

private data class Tint(val bg: Color, val fg: Color, val border: Color)

private val PHASE_TINT = mapOf(
    CycleMath.Phase.MENSTRUAL to Tint(Rose100, Rose900, Rose300),
    CycleMath.Phase.FOLLICULAR to Tint(Amber100, Amber900, Amber300),
    CycleMath.Phase.OVULATION to Tint(Emerald100, Emerald900, Emerald300),
    CycleMath.Phase.LUTEAL to Tint(Violet100, Violet900, Violet300),
)

private val PHASE_COLOR = mapOf(
    CycleMath.Phase.MENSTRUAL to Rose700,      // #e11d48
    CycleMath.Phase.FOLLICULAR to Amber700,    // #d97706 ≈ amber-600
    CycleMath.Phase.OVULATION to Emerald500,   // #059669 ≈ emerald-600
    CycleMath.Phase.LUTEAL to Violet900,       // #7c3aed ≈ violet-600
)

private class PhaseInfo(val label: String, val days: String, val body: String, val dominant: List<String>)

private val PHASE_INFO = mapOf(
    CycleMath.Phase.MENSTRUAL to PhaseInfo(
        "Menstrual phase", "Day 1 – 5",
        "The uterine lining sheds. Estrogen and progesterone are at their lowest. Energy is often lower — rest is biologically appropriate.",
        listOf("Estrogen ↓", "Progesterone ↓")
    ),
    CycleMath.Phase.FOLLICULAR to PhaseInfo(
        "Follicular phase", "Day 6 – 13",
        "FSH rises, ovarian follicles mature, estrogen climbs. Skin clears, mood and focus lift, strength training feels easier.",
        listOf("FSH ↑", "Estrogen ↑")
    ),
    CycleMath.Phase.OVULATION to PhaseInfo(
        "Ovulation", "≈ Day 14",
        "A surge of LH releases an egg. Estrogen peaks, then drops. Libido and communication often peak here too.",
        listOf("LH ↑↑", "Estrogen peak")
    ),
    CycleMath.Phase.LUTEAL to PhaseInfo(
        "Luteal phase", "Day 15 – 28",
        "The corpus luteum produces progesterone, which calms but can bring PMS, bloating, lower energy, and cravings in the late luteal phase.",
        listOf("Progesterone ↑", "Estrogen mild ↑")
    ),
)

private val PHASE_ORDER = listOf(
    CycleMath.Phase.MENSTRUAL, CycleMath.Phase.FOLLICULAR, CycleMath.Phase.OVULATION, CycleMath.Phase.LUTEAL
)

private class Hormone(val key: String, val label: String, val color: Color, val what: String)

private val HORMONES = listOf(
    Hormone("estrogen", "Estrogen", Color(0xFFD946EF), "Builds uterine lining, lifts mood and skin, peaks just before ovulation."),
    Hormone("progesterone", "Progesterone", Color(0xFF8B5CF6), "Calming hormone of the luteal phase. Stabilises mood, raises body temperature."),
    Hormone("lh", "LH (Luteinizing)", Emerald500, "Surges to trigger ovulation. Detected by ovulation predictor kits."),
    Hormone("fsh", "FSH (Follicle-stim.)", Color(0xFFF59E0B), "Recruits and matures ovarian follicles early in the cycle."),
)

/** Normalised (0–100) textbook hormone curve — ported 1:1 from health.tsx `hormoneLevel`. */
private fun hormoneLevel(key: String, day: Int, cycleLength: Int): Float {
    val ov = (cycleLength - 14).toFloat()
    val t = day.toFloat()
    fun bump(center: Float, width: Float, height: Float): Double {
        val d = t - center
        return height * exp(-(d * d) / (2.0 * width * width))
    }
    val v = when (key) {
        "estrogen" -> 15.0 + bump(ov - 1f, 3f, 75f) + bump(ov + 7f, 5f, 40f)
        "progesterone" -> 5.0 + bump(ov + 7f, 4.5f, 85f)
        "lh" -> 8.0 + bump(ov, 1.1f, 90f)
        else -> 12.0 + bump(2f, 2.5f, 35f) + bump(ov, 1.6f, 30f)
    }
    return v.coerceAtMost(100.0).toFloat()
}

// ── Option lists (src/lib/cycle-stats.ts + the health components) ──
private val FLOW_OPTIONS = listOf("spotting", "light", "medium", "heavy", "very_heavy")
private val BLOOD_COLORS = listOf("bright red", "dark red", "brown", "pink", "black")
private val CLOTTING_OPTIONS = listOf("none", "small", "moderate", "heavy")
private val PERIOD_SYMPTOMS = listOf(
    "cramps", "back_pain", "headache", "nausea", "breast_tenderness", "bloating", "digestive_issues"
)
private val MOODS = listOf("happy", "calm", "irritable", "sad", "anxious", "emotional", "motivated", "stressed")
private val ENERGY_LEVELS = listOf("Very low", "Low", "Moderate", "High", "Very high")
private val EXERCISE = listOf("walking", "running", "gym", "yoga", "pilates", "cycling", "rest day")
private val WELLNESS_SYMPTOMS = listOf(
    "acne", "hair fall", "bloating", "fatigue", "headache", "cramps", "breast pain",
    "constipation", "diarrhea", "dizziness", "nausea", "hot flashes"
)
private val NUTRITION_FLAGS = listOf("healthy meals", "junk food", "sugar cravings", "protein", "fruits & veg")
private val QUICK_SYMPTOMS = listOf(
    "cramps", "acne", "mood swings", "fatigue", "bloating", "headache",
    "breast tenderness", "cravings", "low energy", "anxiety", "insomnia",
    "high libido", "low libido", "back pain", "nausea", "clear skin", "focused"
)
private val SEVERITY_LABEL = mapOf(1 to "mild", 2 to "moderate", 3 to "severe")

private val SYMPTOM_EXAMPLES = listOf(
    "Period & cycle" to listOf("irregular periods", "heavy bleeding", "period cramps", "spotting between periods", "missed period"),
    "Skin & hair" to listOf("acne on jaw", "hair thinning", "excess facial hair", "dry skin", "oily scalp"),
    "Mood & sleep" to listOf("anxiety", "low mood", "trouble sleeping", "mood swings", "brain fog"),
    "Pain & body" to listOf("pelvic pain", "lower back pain", "bloating", "breast tenderness", "headaches"),
    "Sexual & urinary" to listOf("painful intercourse", "vaginal dryness", "UTI symptoms", "itching", "unusual discharge"),
    "Hormonal" to listOf("hot flashes", "night sweats", "weight gain", "fatigue", "decreased libido"),
)

private class TimelinePhase(
    val name: String, val range: String, val tint: Tint, val bar: Color,
    val effects: List<Pair<String, String>>, val barWeight: Float
)

private val PHASE_TIMELINE = listOf(
    TimelinePhase(
        "Menstrual", "Day 1–5", Tint(Rose100, Rose900, Rose200), Rose300, listOf(
            "Mood" to "lower / reflective", "Energy" to "low", "Appetite" to "comfort cravings",
            "Sleep" to "may be restless", "Focus" to "softer",
            "Exercise" to "gentle (walks, yoga)", "Skin" to "more sensitive"
        ), 0.18f
    ),
    TimelinePhase(
        "Follicular", "Day 6–13", Tint(Amber100, Amber900, Color(0xFFFDE68A)), Amber300, listOf(
            "Mood" to "uplifting", "Energy" to "rising", "Appetite" to "balanced",
            "Sleep" to "improving", "Focus" to "sharp",
            "Exercise" to "great for strength + new workouts", "Skin" to "clearer"
        ), 0.28f
    ),
    TimelinePhase(
        "Ovulation", "Day 14", Tint(Emerald100, Emerald900, Emerald200), Emerald300, listOf(
            "Mood" to "confident, social", "Energy" to "peak", "Appetite" to "lighter",
            "Sleep" to "good", "Focus" to "high",
            "Exercise" to "HIIT, performance peaks", "Skin" to "glowing; some breakouts possible"
        ), 0.05f
    ),
    TimelinePhase(
        "Luteal", "Day 15–28", Tint(Violet100, Violet900, Color(0xFFE9D5FF)), Violet300, listOf(
            "Mood" to "may dip in late luteal (PMS)", "Energy" to "tapering", "Appetite" to "rising; cravings late",
            "Sleep" to "may worsen pre-period", "Focus" to "needs more rest",
            "Exercise" to "moderate, recovery-focused", "Skin" to "more oily, breakouts possible"
        ), 0.49f
    ),
)

private enum class HealthTab(val label: String) {
    PERIOD("Period log"),
    DAILY("Daily wellness"),
    HORMONES("Cycle & Hormones"),
    INSIGHTS("AI insights"),
    DASHBOARD("Dashboard"),
    ASSISTANT("Symptom Assistant"),
    RESEARCH("Research"),
    TRACKER("Quick log"),
    SETTINGS("Settings"),
}

// ─────────────────────────────────────────────────────────────────────────────
// Cycle statistics — port of src/lib/cycle-stats.ts `summarizeCycles`
// ─────────────────────────────────────────────────────────────────────────────

private val FLOW_RANK = mapOf("spotting" to 1, "light" to 2, "medium" to 3, "heavy" to 4, "very_heavy" to 5)

private class CycleStats(
    val cycleCount: Int,
    val avgCycle: Int?,
    val avgPeriod: Double?,
    val flowLabel: String?,
    val regularity: String?,
    val longest: Int?,
    val shortest: Int?,
    val daysSinceLast: Int?,
)

private fun isPeriodRow(r: CycleEntry): Boolean =
    r.isPeriodStart == true ||
        (r.flowIntensity != null && r.flowIntensity != "none") ||
        (r.flow != null && r.flow != "none")

/** Descending, deduped list of period START dates. */
private fun periodStartsOf(rows: List<CycleEntry>): List<String> =
    rows.filter(::isPeriodRow).map { it.entryDate }.distinct().sortedDescending()

private fun summarize(rows: List<CycleEntry>): CycleStats {
    val starts = periodStartsOf(rows)
    val asc = starts.sorted()
    val lengths = mutableListOf<Int>()
    for (i in 1 until asc.size) {
        val d = CycleMath.daysBetween(asc[i - 1], asc[i])
        if (d in 11..89) lengths.add(d)
    }
    val durations = rows.mapNotNull { r ->
        val end = r.endDate ?: return@mapNotNull null
        val n = CycleMath.daysBetween(r.entryDate, end) + 1
        n.takeIf { it in 1..14 }
    }
    val ranks = rows.mapNotNull { r -> r.flowIntensity?.let { FLOW_RANK[it] } }
    val flowLabel = if (ranks.isEmpty()) null else {
        val avg = ranks.average()
        when {
            avg < 1.5 -> "spotting"; avg < 2.5 -> "light"; avg < 3.5 -> "medium"
            avg < 4.5 -> "heavy"; else -> "very heavy"
        }
    }
    val regularity = if (lengths.size < 2) null else {
        val mean = lengths.average()
        val sd = sqrt(lengths.map { (it - mean) * (it - mean) }.average())
        when {
            sd < 3 -> "Regular"; sd < 7 -> "Somewhat irregular"; else -> "Irregular"
        }
    }
    return CycleStats(
        cycleCount = starts.size,
        avgCycle = if (lengths.isEmpty()) null else lengths.average().roundToInt(),
        avgPeriod = if (durations.isEmpty()) null else (durations.average() * 10).roundToInt() / 10.0,
        flowLabel = flowLabel,
        regularity = regularity,
        longest = lengths.maxOrNull(),
        shortest = lengths.minOrNull(),
        daysSinceLast = starts.firstOrNull()?.let { CycleMath.daysBetween(it, todayIso()) },
    )
}

private suspend fun currentUserId(): String? =
    runCatching { SupabaseProvider.currentUserId() }.getOrNull()

// ─────────────────────────────────────────────────────────────────────────────
// Shared building blocks
// ─────────────────────────────────────────────────────────────────────────────

private fun prettyOption(raw: String): String =
    raw.replace('_', ' ').replaceFirstChar { it.uppercase() }

private val isoFormatter: DateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE

private fun parseIso(value: String): LocalDate? = runCatching { LocalDate.parse(value, isoFormatter) }.getOrNull()

private val MonthTitle: DateTimeFormatter = DateTimeFormatter.ofPattern("MMMM yyyy")
private val ShortDate: DateTimeFormatter = DateTimeFormatter.ofPattern("MMM d")
private val LongDate: DateTimeFormatter = DateTimeFormatter.ofPattern("MMMM d")

/**
 * Canvas-2D-style helper: [android.graphics.Paint] has no `fillText` (and cannot draw on its own),
 * so this mirrors `ctx.fillText(text, x, y)` by drawing with [paint] on the current DrawScope's
 * native canvas — same call shape as `drawText(text, x, y, paint)` used by the charts below.
 */
private fun DrawScope.fillText(paint: android.graphics.Paint, text: String, x: Float, y: Float) {
    drawContext.canvas.nativeCanvas.drawText(text, x, y, paint)
}

@Composable
private fun SectionCard(
    title: String,
    subtitle: String? = null,
    /** Web: base CardTitle = 16sp, `text-lg` chart titles = 18sp, `text-2xl` section titles = 24sp. */
    titleSize: TextUnit = 16.sp,
    modifier: Modifier = Modifier,
    containerColor: Color = MaterialTheme.colorScheme.surface,
    borderColor: Color = MaterialTheme.colorScheme.outline,
    trailing: (@Composable () -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        border = BorderStroke(1.dp, borderColor),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(
                        title,
                        fontSize = titleSize,
                        fontWeight = FontWeight.SemiBold,
                        fontStyle = FontStyle.Italic,
                    )
                    if (subtitle != null) {
                        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (trailing != null) {
                    Spacer(Modifier.width(8.dp))
                    trailing()
                }
            }
            content()
        }
    }
}

@Composable
private fun FieldLabel(text: String, optional: Boolean = false) {
    val label = if (optional) "$text " else text
    val styled = buildAnnotatedString {
        append(label)
        if (optional) withStyle(SpanStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("(optional)") }
    }
    Text(styled, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
}

@Composable
private fun Helper(text: String, italic: Boolean = false) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
    )
}

@Composable
private fun Kicker(text: String, color: Color = MaterialTheme.colorScheme.onSurfaceVariant) {
    Text(text.uppercase(), fontSize = 11.sp, letterSpacing = 2.sp, color = color)
}

/** Web pill: `rounded-full text-xs border` — earth when selected, outline when not. */
@Composable
private fun Pill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    selectedBg: Color = Earth,
    selectedFg: Color = OnEarth,
    uppercase: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val bg = if (selected) selectedBg else Color.Transparent
    val fg = if (selected) selectedFg else MaterialTheme.colorScheme.onSurfaceVariant
    val border = if (selected) selectedBg else MaterialTheme.colorScheme.outline
    Box(
        modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .border(1.dp, border, RoundedCornerShape(50))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            if (uppercase) label.uppercase() else label,
            fontSize = 12.sp,
            color = fg,
            maxLines = 1,
        )
    }
}

/** The web's `TabsTrigger`: uppercase 12px, tracked, #AFDDFF + black when active. */
@Composable
private fun TabPill(label: String, active: Boolean, onClick: () -> Unit) {
    val bg = if (active) Accent else Color.Transparent
    val fg = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Text(
            label.uppercase(),
            fontSize = 12.sp,
            letterSpacing = 1.8.sp,
            color = fg,
            fontWeight = if (active) FontWeight.Medium else FontWeight.Normal,
            maxLines = 1,
        )
    }
}

@Composable
private fun PillButton(text: String, enabled: Boolean = true, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Earth, contentColor = OnEarth),
    ) { Text(text) }
}

@Composable
private fun AlertCard(title: String, body: String) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
            Text(body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

/** Severity chip: off → mild → moderate → severe → off (as on the web). */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun SeverityPill(text: String, severity: Int?, onCycle: () -> Unit, onClear: (() -> Unit)? = null) {
    val tint = when (severity) {
        1 -> Tint(Sage.copy(alpha = 0.20f), Sage, Sage.copy(alpha = 0.40f))
        2 -> Tint(Amber100, Amber900, Amber300)
        3 -> Tint(Rose100, Rose900, Rose300)
        else -> Tint(Sand.copy(alpha = 0.40f), Earth, Color.Transparent)
    }
    val bg = if (severity == null) Sand.copy(alpha = 0.40f) else tint.bg
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .border(1.dp, tint.border, RoundedCornerShape(50))
            .combinedClickable(onClick = onCycle, onLongClick = onClear)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (severity == null) {
                Text("+", fontSize = 12.sp, color = tint.fg)
            } else {
                Box(Modifier.size(6.dp).clip(RoundedCornerShape(50)).background(tint.fg))
            }
            Text(text, fontSize = 12.sp, color = tint.fg, maxLines = 1)
            if (severity != null) {
                Text("· ${SEVERITY_LABEL[severity]}", fontSize = 10.sp, color = tint.fg.copy(alpha = 0.7f), maxLines = 1)
            }
        }
    }
}

@Composable
private fun DataRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().padding(bottom = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 8.dp))
    }
}

@Composable
private fun StatTile(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(14.dp)) {
            Kicker(label)
            Text(value, style = MaterialTheme.typography.headlineSmall, fontStyle = FontStyle.Italic, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

/** Bordered select like the web's `<Select>` — dropdown menu on tap. */
@Composable
private fun DropSelect(
    valueLabel: String,
    placeholder: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        Row(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                .clickable { expanded = true }
                .padding(horizontal = 12.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                valueLabel.ifBlank { placeholder },
                style = MaterialTheme.typography.bodyMedium,
                color = if (valueLabel.isBlank()) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f),
                maxLines = 1,
            )
            Icon(Icons.Filled.KeyboardArrowRight, contentDescription = null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (label, key) ->
                DropdownMenuItem(
                    text = { Text(label, style = MaterialTheme.typography.bodySmall) },
                    onClick = { expanded = false; onSelect(key) },
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun HealthScreen(vm: HealthViewModel = viewModel()) {
    val entries by vm.entries.collectAsState()
    val busy by vm.busy.collectAsState()
    val msg by vm.msg.collectAsState()
    val repo = remember { HealthRepository() }
    var tab by remember { mutableStateOf(HealthTab.ASSISTANT) }   // web default: symptom-assistant

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { HeroPanel(onStart = { tab = HealthTab.ASSISTANT }) }
        item { TabStrip(selected = tab, onSelect = { tab = it }) }
        when (tab) {
            HealthTab.PERIOD -> item { PeriodLogPanel(entries, vm, repo) }
            HealthTab.DAILY -> item { DailyWellnessPanel(repo) }
            HealthTab.HORMONES -> item { HormonesPanel(entries, vm) }
            HealthTab.INSIGHTS -> item { AIInsightsPanel() }
            HealthTab.DASHBOARD -> item { DashboardPanel(entries, repo) }
            HealthTab.ASSISTANT -> item { SymptomAssistantPanel() }
            HealthTab.RESEARCH -> item { ResearchPanel() }
            HealthTab.TRACKER -> item { QuickLogPanel(vm, repo, busy, msg) }
            HealthTab.SETTINGS -> item { HealthSettingsPanel() }
        }
    }
}

// ── Hero: "01 · Intelligence" ──
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HeroPanel(onStart: () -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        // Solid surface — the old Sand-at-40% turned into a grey wash in dark mode.
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            ScreenHeader(
                "01 · Intelligence",
                "Understand your body, before you see the doctor.",
                "The HerSpace AI Symptom Assistant listens carefully, suggests possibilities to discuss with a clinician, " +
                    "and prepares a doctor-ready report — designed by and for women.",
            )
            // FlowRow, not Row: on narrow phones a fixed Row squeezes the second
            // button until its label stacks letter-by-letter ("H o w ...").
            FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onStart,
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(containerColor = Earth, contentColor = OnEarth),
                ) {
                    Icon(Icons.Filled.AutoAwesome, contentDescription = null, Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Start with your symptoms", maxLines = 1)
                }
                OutlinedButton(onClick = onStart, shape = RoundedCornerShape(50)) {
                    Text("How it works", maxLines = 1)
                }
            }
            FeatureCard(Icons.Filled.AutoAwesome, "Plain-English answers", "No jargon. Just a calm summary you can act on.")
            FeatureCard(Icons.Filled.LocalHospital, "Doctor-ready report", "Export a printable PDF to bring to your appointment.")
            FeatureCard(Icons.Filled.Security, "Private by design", "Your entries stay yours. Educational, never diagnostic.")
        }
    }
}

@Composable
private fun FeatureCard(icon: ImageVector, title: String, body: String) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(14.dp)) {
            Icon(icon, contentDescription = null, Modifier.size(16.dp), tint = Earth)
            Spacer(Modifier.height(8.dp))
            Text(title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
            Text(body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

@Composable
private fun TabStrip(selected: HealthTab, onSelect: (HealthTab) -> Unit) {
    // Horizontally scrollable strip, like the web's overflow-x tab list. The old
    // pill-shaped container clipped the end pills ("PERIOD LOG" → "ERIOD LOG").
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        HealthTab.values().forEach { t -> TabPill(t.label, t == selected) { onSelect(t) } }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Period log (port of src/components/health/PeriodLogger.tsx)
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PeriodLogPanel(entries: List<CycleEntry>, vm: HealthViewModel, repo: HealthRepository) {
    val scope = rememberCoroutineScope()
    var selectedDays by remember { mutableStateOf(listOf<String>()) }
    var visibleMonth by remember { mutableStateOf(LocalDate.now().withDayOfMonth(1)) }
    var flowIntensity by remember { mutableStateOf("") }
    var bloodColor by remember { mutableStateOf("") }
    var clotting by remember { mutableStateOf("") }
    var pain by remember { mutableStateOf(0f) }
    var cramp by remember { mutableStateOf(0f) }
    var symptoms by remember { mutableStateOf(mapOf<String, Int>()) }
    var notes by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { vm.refresh() }

    val stats = remember(entries) { summarize(entries) }
    val (loggedDays, loggedStarts) = remember(entries) {
        val days = mutableSetOf<String>()
        val starts = mutableSetOf<String>()
        entries.forEach { h ->
            if (!isPeriodRow(h)) return@forEach
            val start = parseIso(h.entryDate) ?: return@forEach
            val rawEnd = h.endDate?.let { parseIso(it) } ?: start
            val end = if (java.time.temporal.ChronoUnit.DAYS.between(start, rawEnd) > 14) start else rawEnd
            starts.add(h.entryDate)
            var d = start
            while (!d.isAfter(end)) { days.add(d.toString()); d = d.plusDays(1) }
        }
        days to starts
    }

    fun cycleSeverity(s: String) {
        symptoms = symptoms.toMutableMap().apply {
            val v = this[s]
            when (v) {
                null -> this[s] = 1
                1 -> this[s] = 2
                2 -> this[s] = 3
                else -> remove(s)
            }
        }
    }

    fun togglePeriodDay(iso: String) {
        selectedDays = if (selectedDays.contains(iso)) selectedDays - iso else (selectedDays + iso).sorted()
    }

    fun save() {
        if (selectedDays.isEmpty()) { notice = "Pick at least one period day on the calendar"; return }
        scope.launch {
            saving = true
            val uid = currentUserId()
            if (uid == null) { notice = "Sign in required"; saving = false; return@launch }
            try {
                repo.upsertCycleEntry(
                    CycleEntry(
                        userId = uid,
                        entryDate = selectedDays.first(),
                        endDate = selectedDays.lastOrNull().takeIf { selectedDays.size > 1 },
                        isPeriodStart = true,
                        flowIntensity = flowIntensity.ifBlank { null },
                        flow = flowIntensity.ifBlank { null },
                        bloodColor = bloodColor.ifBlank { null },
                        clotting = clotting.ifBlank { null },
                        painLevel = if (pain > 0) pain.roundToInt() else null,
                        crampLevel = if (cramp > 0) cramp.roundToInt() else null,
                        symptoms = symptoms.keys.toList().ifEmpty { null },
                        notes = notes.ifBlank { null },
                    )
                )
                notice = "Period logged."
                symptoms = emptyMap(); notes = ""; bloodColor = ""; clotting = ""
                pain = 0f; cramp = 0f; selectedDays = emptyList()
                vm.refresh()
            } catch (e: Exception) {
                notice = e.message
            }
            saving = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard(
            "Log a period",
            "Tap each period day once to mark it red. Tap a selected day again to clear it.",
            titleSize = 24.sp,
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                // ── Calendar ──
                Card(
                    Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Sand.copy(alpha = 0.2f)),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                ) {
                    Column(Modifier.padding(8.dp)) {
                        PeriodCalendar(
                            visibleMonth = visibleMonth,
                            onPrev = { visibleMonth = visibleMonth.minusMonths(1) },
                            onNext = { visibleMonth = visibleMonth.plusMonths(1) },
                            selectedDays = selectedDays,
                            onToggle = ::togglePeriodDay,
                            loggedDays = loggedDays,
                            loggedStarts = loggedStarts,
                        )
                        Row(
                            Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Box(Modifier.size(10.dp).clip(RoundedCornerShape(50)).background(Rose300))
                                Helper("Previously logged")
                            }
                            if (selectedDays.isNotEmpty()) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    val first = parseIso(selectedDays.first())
                                    val last = parseIso(selectedDays.last())
                                    Text(
                                        buildString {
                                            if (first != null) append(first.format(ShortDate))
                                            if (selectedDays.size > 1 && last != null) append(" → ${last.format(ShortDate)}")
                                            append(" · ${selectedDays.size} day${if (selectedDays.size > 1) "s" else ""} selected")
                                        },
                                        fontSize = 12.sp,
                                        color = Earth,
                                        fontWeight = FontWeight.Medium,
                                    )
                                    Text(
                                        "clear",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                                        modifier = Modifier.clickable { selectedDays = emptyList() },
                                    )
                                }
                            }
                        }
                    }
                }

                // ── Flow intensity ──
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    FieldLabel("Flow intensity", optional = true)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        FLOW_OPTIONS.forEach { f ->
                            Pill(prettyOption(f), flowIntensity == f, onClick = {
                                flowIntensity = if (flowIntensity == f) "" else f
                            })
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        FieldLabel("Blood color", optional = true)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            BLOOD_COLORS.forEach { c ->
                                Pill(c, bloodColor == c, onClick = { bloodColor = if (bloodColor == c) "" else c })
                            }
                        }
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        FieldLabel("Clotting", optional = true)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            CLOTTING_OPTIONS.forEach { c ->
                                Pill(prettyOption(c), clotting == c, onClick = { clotting = if (clotting == c) "" else c })
                            }
                        }
                    }
                }

                // ── Pain / cramps ──
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    FieldLabel("Pain level — ${pain.roundToInt()}/10", optional = true)
                    Slider(
                        value = pain,
                        onValueChange = { pain = it },
                        valueRange = 0f..10f,
                        steps = 9,
                        colors = sliderColors(),
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    val crampLabel = when {
                        cramp == 0f -> "none"; cramp <= 3f -> "mild"; cramp <= 6f -> "moderate"
                        cramp <= 8f -> "strong"; else -> "severe"
                    }
                    val label = buildAnnotatedString {
                        append("Cramp level — ")
                        withStyle(SpanStyle(color = Earth, fontWeight = FontWeight.Medium)) { append("${cramp.roundToInt()}/10") }
                        withStyle(SpanStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("  $crampLabel") }
                        withStyle(SpanStyle(fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("  (optional)") }
                    }
                    Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
                    Slider(value = cramp, onValueChange = { cramp = it }, valueRange = 0f..10f, steps = 9, colors = sliderColors())
                    Helper("Rate cramps separately from overall pain — sharper signal for phase correlations.")
                }

                // ── Symptoms ──
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    FieldLabel("Symptoms", optional = true)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        PERIOD_SYMPTOMS.forEach { s ->
                            SeverityPill(prettyOption(s), symptoms[s], onCycle = { cycleSeverity(s) })
                        }
                    }
                    Helper("Tap once for mild, again for moderate, again for severe, again to clear.")
                }

                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    FieldLabel("Notes", optional = true)
                    OutlinedTextField(
                        notes, { notes = it },
                        Modifier.fillMaxWidth(),
                        minLines = 3,
                        textStyle = MaterialTheme.typography.bodyMedium,
                    )
                }

                PillButton(if (saving) "Saving…" else "Save period", enabled = !saving, onClick = ::save)
                if (notice != null) Helper(notice!!)
            }
        }

        // ── Your averages ──
        SectionCard("Your averages") {
            Column {
                DataRow("Cycles tracked", "${stats.cycleCount}")
                DataRow("Avg cycle", stats.avgCycle?.let { "$it days" } ?: "—")
                DataRow("Avg period", stats.avgPeriod?.let { "%.1f days".format(it) } ?: "—")
                DataRow("Avg flow", stats.flowLabel ?: "—")
                DataRow("Regularity", stats.regularity ?: "—")
                DataRow("Longest", stats.longest?.let { "$it d" } ?: "—")
                DataRow("Shortest", stats.shortest?.let { "$it d" } ?: "—")
                DataRow("Days since last", stats.daysSinceLast?.let { "$it d" } ?: "—")
            }
        }

        // ── Recent periods ──
        SectionCard("Recent periods") {
            val periods = entries.filter { it.flowIntensity != null || it.isPeriodStart == true }.take(12)
            if (periods.isEmpty()) {
                Helper("No periods logged yet.")
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    periods.forEach { p ->
                        Card(
                            Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        ) {
                            Column(Modifier.padding(10.dp)) {
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        buildString {
                                            append(p.entryDate)
                                            if (p.endDate != null) append(" → ${p.endDate}")
                                        },
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                    )
                                    if (p.flowIntensity != null) {
                                        Pill(prettyOption(p.flowIntensity), selected = false, onClick = {})
                                    }
                                }
                                if (p.painLevel != null || p.crampLevel != null) {
                                    Text(
                                        buildString {
                                            if (p.painLevel != null) append("Pain: ${p.painLevel}/10")
                                            if (p.painLevel != null && p.crampLevel != null) append(" · ")
                                            if (p.crampLevel != null) append("Cramps: ${p.crampLevel}/10")
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun sliderColors() = SliderDefaults.colors(
    thumbColor = Earth,
    activeTrackColor = Earth,
    inactiveTrackColor = MaterialTheme.colorScheme.outline,
)

@Composable
private fun PeriodCalendar(
    visibleMonth: LocalDate,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    selectedDays: List<String>,
    onToggle: (String) -> Unit,
    loggedDays: Set<String>,
    loggedStarts: Set<String>,
) {
    val today = LocalDate.now()
    val maxDay = today.plusMonths(2)
    val monthStart = visibleMonth.withDayOfMonth(1)
    val daysInMonth = monthStart.lengthOfMonth()
    val leading = monthStart.dayOfWeek.value % 7          // JS getDay(): Sun = 0
    val selected = selectedDays.toSet()
    val muted = MaterialTheme.colorScheme.onSurfaceVariant

    Column {
        Row(
            Modifier.fillMaxWidth().padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onPrev, Modifier.size(32.dp)) {
                Icon(Icons.Filled.KeyboardArrowLeft, contentDescription = "Previous month", tint = Earth)
            }
            Text(monthStart.format(MonthTitle), fontSize = 14.sp, fontWeight = FontWeight.Medium, color = Earth)
            IconButton(onClick = onNext, Modifier.size(32.dp)) {
                Icon(Icons.Filled.KeyboardArrowRight, contentDescription = "Next month", tint = Earth)
            }
        }

        Row(Modifier.fillMaxWidth()) {
            listOf("S", "M", "T", "W", "T", "F", "S").forEach { d ->
                Text(
                    d,
                    Modifier.weight(1f).padding(vertical = 4.dp),
                    fontSize = 11.sp,
                    color = muted,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }

        val cells = mutableListOf<LocalDate?>()
        repeat(leading) { cells.add(null) }
        for (d in 1..daysInMonth) cells.add(monthStart.withDayOfMonth(d))
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                week.forEach { day ->
                    if (day == null) {
                        Spacer(Modifier.weight(1f).aspectRatio(1f))
                    } else {
                        val iso = day.toString()
                        val isSel = iso in selected
                        val isLogged = iso in loggedDays
                        val isStart = iso in loggedStarts
                        val enabled = !day.isAfter(maxDay)
                        val bg = when {
                            isSel -> Rose200
                            isLogged -> Rose100
                            else -> Color.Transparent
                        }
                        val fg = when {
                            isSel -> Rose950
                            isLogged -> Rose900
                            else -> MaterialTheme.colorScheme.onSurface
                        }
                        Box(
                            Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(6.dp))
                                .background(bg)
                                .then(
                                    if (isSel) Modifier.border(1.dp, Rose500, RoundedCornerShape(6.dp)) else Modifier
                                )
                                .clickable(enabled = enabled) { onToggle(iso) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "${day.dayOfMonth}",
                                fontSize = 13.sp,
                                color = fg,
                                fontWeight = if ((isSel || isLogged) && (isSel || isStart)) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = if (enabled) Modifier else Modifier.alpha(0.35f),
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Daily wellness (port of src/components/health/DailyWellness.tsx)
// ─────────────────────────────────────────────────────────────────────────────

private fun numLabel(v: Float): String = if (v % 1f == 0f) "${v.toInt()}" else "$v"

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DailyWellnessPanel(repo: HealthRepository) {
    val scope = rememberCoroutineScope()
    var date by remember { mutableStateOf(todayIso()) }
    var mood by remember { mutableStateOf(listOf<String>()) }
    var energy by remember { mutableStateOf(3f) }
    var sleepHours by remember { mutableStateOf(7f) }
    var sleepQuality by remember { mutableStateOf(3f) }
    var water by remember { mutableStateOf(6f) }
    var exercise by remember { mutableStateOf(listOf<String>()) }
    var nutrition by remember { mutableStateOf(setOf<String>()) }
    var severities by remember { mutableStateOf(mapOf<String, Int>()) }
    var custom by remember { mutableStateOf(listOf<String>()) }
    var customInput by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }
    var recent by remember { mutableStateOf(listOf<WellnessLog>()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(date) {
        loading = true
        val rows = runCatching { repo.recentWellness(14) }.getOrDefault(emptyList())
        recent = rows
        rows.firstOrNull { it.logDate == date }?.let { row ->
            mood = row.mood ?: emptyList()
            energy = (row.energyLevel ?: 3).toFloat()
            sleepHours = (row.sleepHours ?: 7.0).toFloat()
            sleepQuality = (row.sleepQuality ?: 3).toFloat()
            water = (row.waterGlasses ?: 6).toFloat()
            exercise = row.exercise ?: emptyList()
            nutrition = (row.nutrition as? JsonObject)
                ?.mapNotNull { (k, v) -> k.takeIf { v.jsonPrimitive.booleanOrNull == true } }
                ?.toSet() ?: emptySet()
            severities = (row.symptoms as? JsonObject)
                ?.mapNotNull { (k, v) -> (k to (v.jsonPrimitive.intOrNull ?: 2)) }
                ?.toMap() ?: emptyMap()
            custom = row.customSymptoms ?: emptyList()
            notes = row.notes ?: ""
        }
        loading = false
    }

    fun toggle(list: List<String>, item: String): List<String> =
        if (list.contains(item)) list - item else list + item

    fun cycleSeverity(s: String) {
        severities = severities.toMutableMap().apply {
            when (this[s]) {
                null -> this[s] = 1
                1 -> this[s] = 2
                2 -> this[s] = 3
                else -> remove(s)
            }
        }
    }

    fun save() {
        scope.launch {
            saving = true
            val uid = currentUserId()
            if (uid == null) { notice = "Sign in required"; saving = false; return@launch }
            try {
                repo.logWellness(
                    WellnessLog(
                        userId = uid,
                        logDate = date,
                        mood = mood.ifEmpty { null },
                        energyLevel = energy.roundToInt(),
                        sleepHours = sleepHours.toDouble(),
                        sleepQuality = sleepQuality.roundToInt(),
                        waterGlasses = water.roundToInt(),
                        exercise = exercise.ifEmpty { null },
                        nutrition = buildJsonObject { nutrition.forEach { f -> put(f, true) } },
                        symptoms = buildJsonObject { severities.forEach { (k, v) -> put(k, v) } },
                        customSymptoms = custom.ifEmpty { null },
                        notes = notes.ifBlank { null },
                    )
                )
                notice = "Logged."
                recent = runCatching { repo.recentWellness(14) }.getOrDefault(recent)
            } catch (e: Exception) {
                notice = e.message
            }
            saving = false
        }
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard(
            "Daily wellness",
            titleSize = 24.sp,
            trailing = {
                OutlinedTextField(
                    date, { date = it },
                    Modifier.width(170.dp),
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
            },
        ) {
            if (loading) LoadingRow()
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Field("Mood") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        MOODS.forEach { m -> Pill(prettyOption(m), mood.contains(m), onClick = { mood = toggle(mood, m) }) }
                    }
                }

                Field("Energy — ${ENERGY_LEVELS[energy.roundToInt().coerceIn(1, 5) - 1]}") {
                    Slider(value = energy, onValueChange = { energy = it }, valueRange = 1f..5f, steps = 4, colors = sliderColors())
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Field("Sleep — ${numLabel(sleepHours)} hrs", Modifier.weight(1f)) {
                        Slider(value = sleepHours, onValueChange = { sleepHours = it }, valueRange = 0f..12f, steps = 23, colors = sliderColors())
                    }
                    Field("Sleep quality — ${sleepQuality.roundToInt()}/5", Modifier.weight(1f)) {
                        Slider(value = sleepQuality, onValueChange = { sleepQuality = it }, valueRange = 1f..5f, steps = 4, colors = sliderColors())
                    }
                }

                Field("Water — ${water.roundToInt()} glasses") {
                    Slider(value = water, onValueChange = { water = it }, valueRange = 0f..16f, steps = 15, colors = sliderColors())
                }

                Field("Exercise") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        EXERCISE.forEach { x -> Pill(prettyOption(x), exercise.contains(x), onClick = { exercise = toggle(exercise, x) }) }
                    }
                }

                Field("Nutrition") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        NUTRITION_FLAGS.forEach { n ->
                            Pill(n, nutrition.contains(n), onClick = {
                                nutrition = if (nutrition.contains(n)) nutrition - n else nutrition + n
                            })
                        }
                    }
                }

                Field("Symptoms") {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        (WELLNESS_SYMPTOMS + custom).forEach { s ->
                            SeverityPill(s, severities[s], onCycle = { cycleSeverity(s) })
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                        OutlinedTextField(
                            customInput, { customInput = it },
                            Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("Add a custom symptom", style = MaterialTheme.typography.bodySmall) },
                        )
                        OutlinedButton(onClick = {
                            val v = customInput.trim().lowercase()
                            if (v.isNotBlank() && !custom.contains(v)) custom = custom + v
                            customInput = ""
                        }) { Text("Add") }
                    }
                }

                Field("Notes") {
                    OutlinedTextField(notes, { notes = it }, Modifier.fillMaxWidth(), minLines = 2, textStyle = MaterialTheme.typography.bodyMedium)
                }

                PillButton(if (saving) "Saving…" else "Save daily log", enabled = !saving, onClick = ::save)
                if (notice != null) Helper(notice!!)
            }
        }

        SectionCard("Last 14 days") {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                (0..1).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                        (0..6).forEach { col ->
                            val index = row * 7 + col
                            val day = LocalDate.now().minusDays((13 - index).toLong())
                            val iso = day.toString()
                            val filled = recent.any { it.logDate == iso }
                            Box(
                                Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (filled) Earth.copy(alpha = 0.8f) else Sand.copy(alpha = 0.4f))
                                    .clickable { date = iso },
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "${day.dayOfMonth}",
                                    fontSize = 10.sp,
                                    color = if (filled) OnEarth else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
                Helper("Filled = logged. Tap any day above to load it.")
            }
        }
    }
}

@Composable
private fun Field(label: String, modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        FieldLabel(label)
        content()
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 8 — Quick log (port of the CycleTracker in health.tsx)
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
private fun QuickLogPanel(vm: HealthViewModel, repo: HealthRepository, busy: Boolean, msg: String?) {
    val entries by vm.entries.collectAsState()
    val scope = rememberCoroutineScope()
    var entryDate by remember { mutableStateOf(todayIso()) }
    var flow by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf("") }
    var energy by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var severities by remember { mutableStateOf(mapOf<String, Int>()) }
    var localNotice by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { vm.refresh() }

    fun cycleSymptom(s: String) {
        severities = severities.toMutableMap().apply {
            when (this[s]) {
                null -> this[s] = 1
                1 -> this[s] = 2
                2 -> this[s] = 3
                else -> remove(s)
            }
        }
    }

    fun save() {
        val symptomKeys = severities.keys.toList()
        if (entryDate == todayIso() && severities.isEmpty()) {
            // Path through the shared HealthViewModel (today, no severity tags).
            vm.saveToday(flow, mood, energy.toIntOrNull(), symptomKeys, notes)
            return
        }
        vm.busy.value = true
        scope.launch {
            val uid = currentUserId()
            if (uid == null) { vm.msg.value = "Sign in required"; vm.busy.value = false; return@launch }
            try {
                repo.upsertCycleEntry(
                    CycleEntry(
                        userId = uid,
                        entryDate = entryDate,
                        flow = flow.ifBlank { null },
                        mood = mood.ifBlank { null },
                        energy = energy.toIntOrNull(),
                        symptoms = symptomKeys.ifEmpty { null },
                        symptomSeverities = severities.ifEmpty { null },
                        notes = notes.ifBlank { null },
                    )
                )
                vm.msg.value = "Logged."
                vm.refresh()
            } catch (e: Exception) {
                vm.msg.value = e.message
            }
            vm.busy.value = false
        }
    }

    val helper = buildAnnotatedString {
        append("Tap once for ")
        withStyle(SpanStyle(color = Sage)) { append("mild") }
        append(", again for ")
        withStyle(SpanStyle(color = Amber700)) { append("moderate") }
        append(", again for ")
        withStyle(SpanStyle(color = Rose700)) { append("severe") }
        append(", again to clear. Long-press to remove. Severity weights the cycle-phase correlations.")
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard("Today's check-in") {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Field("Date", Modifier.weight(1f)) {
                            OutlinedTextField(entryDate, { entryDate = it }, Modifier.fillMaxWidth(), singleLine = true, textStyle = MaterialTheme.typography.bodyMedium)
                        }
                        Field("Flow", Modifier.weight(1f)) {
                            OutlinedTextField(
                                flow, { flow = it }, Modifier.fillMaxWidth(), singleLine = true,
                                placeholder = { Text("none / light / heavy", style = MaterialTheme.typography.bodySmall) },
                                textStyle = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Field("Mood", Modifier.weight(1f)) {
                            OutlinedTextField(
                                mood, { mood = it }, Modifier.fillMaxWidth(), singleLine = true,
                                placeholder = { Text("calm / anxious…", style = MaterialTheme.typography.bodySmall) },
                                textStyle = MaterialTheme.typography.bodyMedium,
                            )
                        }
                        Field("Energy 1–10", Modifier.weight(1f)) {
                            OutlinedTextField(
                                energy, { energy = it.filter(Char::isDigit).take(2) }, Modifier.fillMaxWidth(), singleLine = true,
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                textStyle = MaterialTheme.typography.bodyMedium,
                            )
                        }
                    }
                    Field("Symptoms today") {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            QUICK_SYMPTOMS.forEach { s -> SeverityPill(s, severities[s], onCycle = { cycleSymptom(s) }, onClear = { severities = severities - s }) }
                        }
                        Text(helper, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
                    }
                    Field("Notes") {
                        OutlinedTextField(notes, { notes = it }, Modifier.fillMaxWidth(), minLines = 3, textStyle = MaterialTheme.typography.bodyMedium)
                    }
                    PillButton(if (busy) "Saving…" else "Save entry", enabled = !busy, onClick = ::save)
                    val notice = localNotice ?: msg
                    if (notice != null) Helper(notice)
                }
            }

            SectionCard("Recent") {
                if (entries.isEmpty()) {
                    EmptyCard("No entries yet.")
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        entries.take(30).forEach { e ->
                            Card(
                                Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                            ) {
                                Column(Modifier.padding(10.dp)) {
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text(e.entryDate, style = MaterialTheme.typography.titleSmall, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                        if (e.flow != null) Pill(e.flow, selected = false, onClick = {})
                                    }
                                    Text(
                                        "Mood: ${e.mood ?: "—"} · Energy: ${e.energy ?: "—"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.padding(top = 2.dp),
                                    )
                                    if (!e.symptoms.isNullOrEmpty()) {
                                        FlowRow(
                                            Modifier.padding(top = 6.dp),
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                            verticalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            e.symptoms!!.forEach { s ->
                                                val sev = e.symptomSeverities?.get(s)
                                                val tint = when (sev) {
                                                    1 -> Tint(Sage.copy(alpha = 0.20f), Sage, Sage.copy(alpha = 0.40f))
                                                    2 -> Tint(Amber100, Amber900, Amber300)
                                                    3 -> Tint(Rose100, Rose900, Rose300)
                                                    else -> Tint(Color.Transparent, MaterialTheme.colorScheme.onSurfaceVariant, MaterialTheme.colorScheme.outline)
                                                }
                                                val text = if (sev != null) "$s · ${SEVERITY_LABEL[sev]}" else s
                                                Box(
                                                    Modifier
                                                        .clip(RoundedCornerShape(50))
                                                        .background(tint.bg)
                                                        .border(1.dp, tint.border, RoundedCornerShape(50))
                                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                                ) { Text(text, fontSize = 10.sp, color = tint.fg, maxLines = 1) }
                                            }
                                        }
                                    }
                                    if (!e.notes.isNullOrEmpty()) {
                                        Text(e.notes!!, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 3 — Cycle & Hormones
// (CyclePrediction + PhaseTimeline + HormoneCycle + symptom analytics from health.tsx)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun HormonesPanel(entries: List<CycleEntry>, vm: HealthViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        AICyclePredictionCard()
        PhaseTimelineCard()
        HormoneCycleSection(entries, vm)
    }
}

@Composable
private fun MiniPillButton(text: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = Earth, contentColor = OnEarth),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
    ) { Text(text, fontSize = 12.sp) }
}

@Composable
private fun OutlineBadge(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) { Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
}

/** "AI cycle prediction" — server function, so the panel shows an explanatory note instead. */
@Composable
private fun AICyclePredictionCard() {
    var attempted by remember { mutableStateOf(false) }
    SectionCard(
        "AI cycle prediction",
        "Personalized estimates from your logged history",
        titleSize = 24.sp,
        trailing = { MiniPillButton(if (attempted) "Refresh" else "Predict") { attempted = true } },
    ) {
        if (!attempted) {
            Helper("Click Predict to estimate your next period, fertile window, ovulation day, and PMS phase.")
        } else {
            EmptyCard("AI cycle prediction runs on the HerSpace server, which the Android app can't reach yet. Keep logging periods and this will light up.")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlineBadge("Improves with more cycles logged")
                OutlineBadge("Educational estimate · not a diagnosis")
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PhaseTimelineCard() {
    SectionCard("Hormone phase timeline", titleSize = 24.sp) {
        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
            AlertCard("Educational estimates", "These are typical hormonal patterns — not your lab measurements. Individual cycles vary.")

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                PHASE_TIMELINE.forEach { p ->
                    Column(
                        Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(p.tint.bg)
                            .border(1.dp, p.tint.border, RoundedCornerShape(12.dp)).padding(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(p.name.uppercase(), fontSize = 10.sp, letterSpacing = 1.sp, color = p.tint.fg, maxLines = 1)
                        Text(p.range, fontSize = 10.sp, color = p.tint.fg.copy(alpha = 0.8f), modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }

            Row(Modifier.fillMaxWidth().height(8.dp)) {
                PHASE_TIMELINE.forEach { p ->
                    Box(Modifier.weight(p.barWeight).fillMaxHeight().background(p.bar))
                }
            }

            PHASE_TIMELINE.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    pair.forEach { p ->
                        Card(
                            Modifier.weight(1f),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        ) {
                            Column(Modifier.padding(14.dp)) {
                                Text(p.name, style = MaterialTheme.typography.titleMedium, fontStyle = FontStyle.Italic)
                                Kicker(p.range, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    p.effects.forEach { (k, v) ->
                                        val line = buildAnnotatedString {
                                            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("$k: ") }
                                            append(v)
                                        }
                                        Text(line, style = MaterialTheme.typography.bodySmall)
                                    }
                                }
                            }
                        }
                    }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HormoneCycleSection(entries: List<CycleEntry>, vm: HealthViewModel) {
    var lastPeriod by remember { mutableStateOf("") }
    var cycleLength by remember { mutableStateOf(28) }
    var irregularity by remember { mutableStateOf("regular") }
    var starts by remember { mutableStateOf(listOf<String>()) }
    var detectedAvg by remember { mutableStateOf<Triple<Int, Int, Int>?>(null) }   // avg, spread, cycles
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(entries) {
        loading = true
        val flowDays = entries
            .filter { r -> !r.flow.isNullOrBlank() && r.flow!!.lowercase() !in listOf("none", "spotting") }
            .map { it.entryDate }
            .distinct()
            .sorted()
        if (flowDays.isNotEmpty()) {
            val groups = mutableListOf(mutableListOf(flowDays.first()))
            for (i in 1 until flowDays.size) {
                val prev = parseIso(flowDays[i - 1])
                val cur = parseIso(flowDays[i])
                val diff = if (prev != null && cur != null) java.time.temporal.ChronoUnit.DAYS.between(prev, cur) else 99L
                if (diff <= 2) groups.last().add(flowDays[i]) else groups.add(mutableListOf(flowDays[i]))
            }
            val groupStarts = groups.map { it.first() }
            starts = groupStarts.sortedDescending()
            lastPeriod = groupStarts.maxOrNull() ?: lastPeriod
            if (groupStarts.size >= 2) {
                val asc = groupStarts.sorted()
                val gaps = (1 until asc.size).map { CycleMath.daysBetween(asc[it - 1], asc[it]) }.filter { it in 18..60 }
                if (gaps.isNotEmpty()) {
                    detectedAvg = Triple(gaps.average().roundToInt(), gaps.max() - gaps.min(), gaps.size)
                }
            }
        }
        loading = false
    }

    val cycleDay = vm.cycleDay(lastPeriod.ifBlank { null }, cycleLength)
    val phase = cycleDay?.let { CycleMath.phaseForDay(it, cycleLength) }
    val nextPeriod = lastPeriod.takeIf { it.isNotBlank() }?.let { CycleMath.addDays(it, cycleLength) }
    val ovulationDate = lastPeriod.takeIf { it.isNotBlank() }?.let { CycleMath.addDays(it, cycleLength - 14) }
    val tolerance = when (irregularity) { "somewhat" -> 5; "very" -> 8; else -> 2 }

    val anchorOptions = if (starts.isEmpty()) {
        listOf("No period entries yet" to "__none")
    } else {
        starts.mapIndexed { i, d ->
            val suffix = if (i == 0) "most recent" else if (i == 1) "previous" else "${i + 1} cycles ago"
            "$d · $suffix" to d
        } + (if (lastPeriod.isNotBlank() && !starts.contains(lastPeriod)) listOf("Custom date above" to "__custom") else emptyList())
    }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard("Where you are in your cycle", titleSize = 24.sp) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Field("Last period started", Modifier.weight(1f)) {
                        OutlinedTextField(
                            lastPeriod, { lastPeriod = it },
                            Modifier.fillMaxWidth(), singleLine = true,
                            placeholder = { Text("YYYY-MM-DD", style = MaterialTheme.typography.bodySmall) },
                            textStyle = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    Field("Anchor from your logs", Modifier.weight(1f)) {
                        DropSelect(
                            valueLabel = lastPeriod,
                            placeholder = if (starts.isNotEmpty()) "Pick a period start" else "No logged periods",
                            options = anchorOptions,
                            onSelect = { v -> if (v != "__none" && v != "__custom") lastPeriod = v },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Field("Typical cycle length (days)", Modifier.weight(1f)) {
                        OutlinedTextField(
                            "$cycleLength",
                            { s -> cycleLength = (s.filter { it.isDigit() }.toIntOrNull() ?: 28).coerceIn(20, 45) },
                            Modifier.fillMaxWidth(), singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                            textStyle = MaterialTheme.typography.bodyMedium,
                        )
                    }
                    Field("How regular?", Modifier.weight(1f)) {
                        DropSelect(
                            valueLabel = when (irregularity) {
                                "somewhat" -> "Somewhat irregular (±5 days)"
                                "very" -> "Very irregular (±8+ days)"
                                else -> "Regular (±2 days)"
                            },
                            placeholder = "Regular (±2 days)",
                            options = listOf(
                                "Regular (±2 days)" to "regular",
                                "Somewhat irregular (±5 days)" to "somewhat",
                                "Very irregular (±8+ days)" to "very",
                            ),
                            onSelect = { irregularity = it },
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }

                val hint = detectedAvg
                if (hint != null) {
                    val (avg, spread, cyclesCount) = hint
                    val text = buildAnnotatedString {
                        append("From your logs: avg ")
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)) { append("${avg}d") }
                        append(", varies ±${(spread + 1) / 2}d across $cyclesCount cycle${if (cyclesCount > 1) "s" else ""}. ")
                        withStyle(SpanStyle(color = Earth)) { append("Use this") }
                    }
                    Text(
                        text,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.clickable {
                            cycleLength = avg
                            irregularity = if (spread >= 14) "very" else if (spread >= 6) "somewhat" else "regular"
                        },
                    )
                } else {
                    Helper("Auto-detected from your Cycle Tracker entries. Edit if needed.")
                }

                if (loading) {
                    Helper("Reading your entries…")
                } else if (cycleDay == null || phase == null) {
                    AlertCard(
                        "No period date yet",
                        "Pick when your last period started, or log a \"light/medium/heavy\" flow day in Cycle Tracker so we can estimate your phase automatically.",
                    )
                }

                if (cycleDay != null && phase != null) {
                    val info = PHASE_INFO.getValue(phase)
                    val tint = PHASE_TINT.getValue(phase)
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Sand.copy(alpha = 0.3f)),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                                Box(
                                    Modifier.clip(RoundedCornerShape(50)).background(tint.bg)
                                        .border(1.dp, tint.border, RoundedCornerShape(50))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) { Text(info.label, fontSize = 12.sp, color = tint.fg, fontWeight = FontWeight.Medium) }
                                val dayLine = buildAnnotatedString {
                                    append("Day ")
                                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)) { append("$cycleDay") }
                                    append(" of $cycleLength · ${info.days}")
                                }
                                Text(dayLine, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                if (irregularity != "regular") OutlineBadge("±${tolerance}d window")
                            }
                            Text(info.body, style = MaterialTheme.typography.bodySmall, lineHeight = 18.sp)
                            if (irregularity == "very") {
                                Helper(
                                    "Because your cycles vary widely, treat the day count as a rough estimate. Phase is most reliable when confirmed with body signs (cervical fluid, basal temperature, an LH test).",
                                    italic = true,
                                )
                            }
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                info.dominant.forEach { d -> OutlineBadge(d) }
                            }
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                            Row(Modifier.fillMaxWidth()) {
                                Column(Modifier.weight(1f)) {
                                    val est = ovulationDate
                                    val line = buildAnnotatedString {
                                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("Estimated ovulation: ") }
                                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)) { append(est ?: "—") }
                                        if (est != null) {
                                            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                                append(" (window ${CycleMath.addDays(est, -tolerance)} → ${CycleMath.addDays(est, tolerance)})")
                                            }
                                        }
                                    }
                                    Text(line, fontSize = 12.sp)
                                }
                                Column(Modifier.weight(1f)) {
                                    val nxt = nextPeriod
                                    val line = buildAnnotatedString {
                                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("Next period (est.): ") }
                                        withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)) { append(nxt ?: "—") }
                                        if (nxt != null) {
                                            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                                append(" (window ${CycleMath.addDays(nxt, -tolerance)} → ${CycleMath.addDays(nxt, tolerance)})")
                                            }
                                        }
                                    }
                                    Text(line, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        SectionCard("Hormones across your cycle", titleSize = 24.sp) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                HormoneChart(cycleLength, cycleDay, tolerance)
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    HORMONES.chunked(2).forEach { pair ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                            pair.forEach { h ->
                                Card(
                                    Modifier.weight(1f),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                                ) {
                                    Column(Modifier.padding(10.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Box(Modifier.size(12.dp).clip(RoundedCornerShape(50)).background(h.color))
                                            Text(h.label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, maxLines = 1)
                                        }
                                        Text(
                                            h.what,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                            modifier = Modifier.padding(top = 4.dp),
                                        )
                                    }
                                }
                            }
                            if (pair.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
                Helper(
                    "Curves are educational approximations of a textbook 28-day cycle, scaled to your cycle length. Real hormone levels vary widely between bodies and cycles — use this to understand the pattern, not to diagnose.",
                    italic = true,
                )
            }
        }

        // Phase cards (current one highlighted)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            PHASE_ORDER.take(2).forEach { p -> PhaseCard(p, p == phase, modifier = Modifier.weight(1f)) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
            PHASE_ORDER.drop(2).forEach { p -> PhaseCard(p, p == phase, modifier = Modifier.weight(1f)) }
        }

        SymptomCorrelations(entries, starts, cycleLength)
        SymptomTrend(entries, starts, cycleLength)
        SymptomPrediction(entries, starts, cycleLength)
    }
}

@Composable
private fun PhaseCard(phase: CycleMath.Phase, current: Boolean, modifier: Modifier = Modifier) {
    val info = PHASE_INFO.getValue(phase)
    val tint = PHASE_TINT.getValue(phase)
    Card(
        modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(if (current) 2.dp else 1.dp, if (current) Earth.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outline),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box(
                Modifier.clip(RoundedCornerShape(50)).background(tint.bg)
                    .border(1.dp, tint.border, RoundedCornerShape(50))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) { Text(info.label, fontSize = 11.sp, color = tint.fg, fontWeight = FontWeight.Medium, maxLines = 1) }
            Text(info.days, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(info.body, style = MaterialTheme.typography.bodySmall)
        }
    }
}

// ── Hormone chart (SVG in health.tsx → Compose Canvas) ──
@Composable
private fun HormoneChart(cycleLength: Int, cycleDay: Int?, tolerance: Int) {
    val density = LocalDensity.current
    val onSurface = MaterialTheme.colorScheme.onSurface
    Canvas(Modifier.fillMaxWidth().height(240.dp)) {
        val sx = size.width / 720f
        val sy = size.height / 240f
        val padL = 36f
        val innerW = 720f - 36f - 12f
        val innerH = 240f - 16f - 28f
        fun X(d: Float) = (padL + (d - 1f) / (cycleLength - 1).coerceAtLeast(1) * innerW) * sx
        fun Y(v: Float) = (16f + (1f - v / 100f) * innerH) * sy
        val ovDay = cycleLength - 14

        fun band(from: Float, to: Float, color: Color, alpha: Float) {
            val x1 = X(from)
            val w = (X(to) - x1).coerceAtLeast(0f)
            drawRect(color, topLeft = Offset(x1, 16f * sy), size = Size(w, innerH * sy), alpha = alpha)
        }
        band(1f, 5f, Rose200, 0.35f)
        band(6f, (ovDay - 1).toFloat(), Color(0xFFFDE68A), 0.30f)
        band(ovDay.toFloat(), (ovDay + 1).toFloat(), Emerald200, 0.50f)
        band((ovDay + 2).toFloat(), cycleLength.toFloat(), Violet300, 0.35f)

        listOf(0, 25, 50, 75, 100).forEach { v ->
            val y = Y(v.toFloat())
            drawLine(
                onSurface.copy(alpha = 0.08f),
                Offset(padL * sx, y),
                Offset((padL + innerW) * sx, y),
                strokeWidth = 1f,
                pathEffect = if (v == 0) null else PathEffect.dashPathEffect(floatArrayOf(6f, 8f)),
            )
        }
        drawLine(onSurface.copy(alpha = 0.20f), Offset(padL * sx, Y(0f)), Offset((padL + innerW) * sx, Y(0f)), strokeWidth = 1f)

        val labelPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.45f).toArgb()
            textSize = with(density) { 9.sp.toPx() }
            textAlign = android.graphics.Paint.Align.RIGHT
        }
        labelPaint.textSize = with(density) { 9.sp.toPx() }
        fillText(labelPaint, "low", (padL - 6f) * sx, Y(0f) + 3f * sy)
        fillText(labelPaint, "high", (padL - 6f) * sx, Y(100f) + 3f * sy)

        val tickPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.60f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.CENTER
        }
        listOf(1, 7, 14, 21, 28).filter { it <= cycleLength }.forEach { d ->
            val x = X(d.toFloat())
            drawLine(onSurface.copy(alpha = 0.40f), Offset(x, Y(0f)), Offset(x, Y(0f) + 4f * sy), strokeWidth = 1f)
            fillText(tickPaint, "Day $d", x, Y(0f) + 18f * sy)
        }

        HORMONES.forEach { h ->
            val path = Path()
            for (d in 1..cycleLength) {
                val px = X(d.toFloat())
                val py = Y(hormoneLevel(h.key, d, cycleLength))
                if (d == 1) path.moveTo(px, py) else path.lineTo(px, py)
            }
            drawPath(path, color = h.color, style = Stroke(width = 3f, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }

        if (cycleDay != null) {
            if (tolerance > 0) {
                val x1 = X((cycleDay - tolerance).coerceAtLeast(1).toFloat())
                val x2 = X((cycleDay + tolerance).coerceAtMost(cycleLength).toFloat())
                drawRect(Marker, topLeft = Offset(x1, 16f * sy), size = Size((x2 - x1).coerceAtLeast(0f), innerH * sy), alpha = 0.08f)
            }
            val x = X(cycleDay.toFloat())
            drawLine(
                Marker.copy(alpha = 0.6f),
                Offset(x, 16f * sy),
                Offset(x, Y(0f)),
                strokeWidth = 2f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 12f)),
            )
            drawCircle(Marker, radius = 6f, center = Offset(x, 22f * sy))
            val markerPaint = android.graphics.Paint().apply {
                isAntiAlias = true
                color = Marker.toArgb()
                textSize = with(density) { 10.sp.toPx() }
                textAlign = android.graphics.Paint.Align.CENTER
            }
            val suffix = if (tolerance > 0) " (±${tolerance}d)" else ""
            fillText(markerPaint, "Today · Day $cycleDay$suffix", x, 12f * sy)
        }

        val legendPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.75f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.LEFT
        }
        HORMONES.forEachIndexed { i, h ->
            val x = (padL + i * 130f) * sx
            drawRect(h.color, topLeft = Offset(x, 226f * sy), size = Size(10f * sx, 3f * sy))
            fillText(legendPaint, h.label, x + 14f * sx, 234f * sy)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Symptom × cycle-phase correlations ("Your symptom patterns by phase")
// ─────────────────────────────────────────────────────────────────────────────

private class TallyCell(var count: Int = 0, var severity: Int = 0, var phaseDays: Int = 0)

private class CorrelationModel(
    val matrix: Map<String, Map<CycleMath.Phase, TallyCell>>,
    val phaseDays: Map<CycleMath.Phase, Int>,
    val totalDays: Int,
    val symptoms: List<String>,
    val insights: List<Insight>,
)

private class Insight(val symptom: String, val phase: CycleMath.Phase, val count: Int, val avgSev: Double, val weighted: Double)

private fun buildCorrelations(entries: List<CycleEntry>, anchorsAsc: List<String>, cycleLength: Int): CorrelationModel {
    fun cycleDayFor(date: String): Int? {
        if (anchorsAsc.isEmpty()) return null
        val t = parseIso(date)?.toEpochDay() ?: return null
        var anchor: Long? = null
        for (a in anchorsAsc) {
            val at = parseIso(a)?.toEpochDay() ?: continue
            if (at <= t) anchor = at else break
        }
        val a = anchor ?: return null
        val diff = (t - a).toInt()
        if (diff < 0 || diff > 60) return null
        return (diff % cycleLength) + 1
    }

    val phaseDays = PHASE_ORDER.associateWith { 0 }.toMutableMap()
    val matrix = linkedMapOf<String, MutableMap<CycleMath.Phase, TallyCell>>()
    var totalDays = 0

    for (e in entries) {
        val day = cycleDayFor(e.entryDate) ?: continue
        val phase = CycleMath.phaseForDay(day, cycleLength)
        phaseDays[phase] = (phaseDays[phase] ?: 0) + 1
        totalDays++
        for (s in e.symptoms.orEmpty()) {
            val row = matrix.getOrPut(s) { PHASE_ORDER.associateWith { TallyCell() }.toMutableMap() }
            val sev = e.symptomSeverities?.get(s) ?: 2
            val cell = row.getValue(phase)
            cell.count += 1
            cell.severity += sev
        }
    }

    val sorted = matrix.keys.sortedByDescending { s ->
        PHASE_ORDER.sumOf { matrix[s]!!.getValue(it).severity }
    }

    val insights = mutableListOf<Insight>()
    for (s in sorted) {
        var best: Insight? = null
        for (p in PHASE_ORDER) {
            val denom = phaseDays[p] ?: 0
            if (denom < 2) continue
            val cell = matrix[s]!!.getValue(p)
            val weighted = cell.severity.toDouble() / denom
            val avgSev = if (cell.count > 0) cell.severity.toDouble() / cell.count else 0.0
            if (weighted > 0 && (best == null || weighted > best.weighted)) {
                best = Insight(s, p, cell.count, avgSev, weighted)
            }
        }
        if (best != null && best.count >= 2) insights.add(best)
    }
    insights.sortByDescending { it.weighted }

    return CorrelationModel(matrix, phaseDays, totalDays, sorted, insights)
}

private fun severityPhrase(avg: Double): String = when {
    avg >= 2.5 -> "mostly severe"
    avg >= 1.75 -> "mostly moderate"
    avg >= 1.25 -> "mild–moderate"
    else -> "mostly mild"
}

private fun shortPhaseLabel(phase: CycleMath.Phase): String = PHASE_INFO.getValue(phase).label.replace(" phase", "")

@Composable
private fun SymptomCorrelations(entries: List<CycleEntry>, periodStarts: List<String>, cycleLength: Int) {
    val anchors = remember(periodStarts) { periodStarts.sorted() }
    val model = remember(entries, anchors, cycleLength) { buildCorrelations(entries, anchors, cycleLength) }

    SectionCard("Your symptom patterns by phase", titleSize = 24.sp) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (anchors.isEmpty() || model.totalDays == 0) {
                AlertCard(
                    "Not enough data yet",
                    "Log a few period days and tap symptoms in the Cycle Tracker for a couple of weeks. As soon as we can map symptoms to cycle days, your patterns will appear here.",
                )
            } else if (model.symptoms.isEmpty()) {
                Helper(
                    "We mapped ${model.totalDays} logged day${if (model.totalDays == 1) "" else "s"} to a cycle phase, but no symptoms are tagged yet. Tap symptom chips when you log a day."
                )
            } else {
                if (model.insights.isNotEmpty()) {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Sand.copy(alpha = 0.3f)),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Kicker("What we noticed")
                            model.insights.take(5).forEach { i ->
                                val tint = PHASE_TINT.getValue(i.phase)
                                val line = buildAnnotatedString {
                                    append("Your ")
                                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(i.symptom) }
                                    append(" shows up most in the ")
                                    withStyle(SpanStyle(color = tint.fg, fontWeight = FontWeight.Medium)) { append(shortPhaseLabel(i.phase)) }
                                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                        append(" — ${i.count} day${if (i.count == 1) "" else "s"}, ${severityPhrase(i.avgSev)} (avg %.1f/3).".format(i.avgSev))
                                    }
                                }
                                Text(line, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                // Table
                Column {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                        HeaderCell("Symptom", Modifier.weight(1.3f))
                        PHASE_ORDER.forEach { p ->
                            HeaderCell(shortPhaseLabel(p), Modifier.weight(1f), caption = "${model.phaseDays[p] ?: 0} day${if ((model.phaseDays[p] ?: 0) == 1) "" else "s"}")
                        }
                    }
                    model.symptoms.forEach { s ->
                        val row = model.matrix.getValue(s)
                        val maxRow = PHASE_ORDER.maxOf { row.getValue(it).severity }
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                s.replaceFirstChar { it.uppercase() },
                                Modifier.weight(1.3f).padding(top = 6.dp, bottom = 6.dp, end = 6.dp),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                            )
                            PHASE_ORDER.forEach { p ->
                                val cell = row.getValue(p)
                                MatrixCell(cell.count, cell.severity, maxRow, Modifier.weight(1f))
                            }
                        }
                    }
                }

                val footnote = buildAnnotatedString {
                    append("Each cell shows ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("days logged") }
                    append(" · ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("avg severity") }
                    append(" (1 mild → 3 severe). Shading reflects severity-weighted frequency, so a few severe days outweigh many mild ones. Patterns get more reliable after 2–3 logged cycles.")
                }
                Text(footnote, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontStyle = FontStyle.Italic)
            }
        }
    }
}

@Composable
private fun HeaderCell(text: String, modifier: Modifier, caption: String? = null) {
    Column(modifier.padding(bottom = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text.uppercase(), fontSize = 10.sp, letterSpacing = 1.4.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
        if (caption != null) Text(caption, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f))
    }
}

@Composable
private fun MatrixCell(count: Int, severity: Int, maxSeverity: Int, modifier: Modifier) {
    val intensity = if (count > 0 && maxSeverity > 0) severity.toFloat() / maxSeverity else 0f
    val avg = if (count > 0) severity.toFloat() / count else 0f
    Box(modifier.padding(vertical = 4.dp), contentAlignment = Alignment.Center) {
        if (count == 0) {
            Box(
                Modifier.size(width = 52.dp, height = 28.dp)
                    .border(1.dp, MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.25f), RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center,
            ) { Text("·", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            Box(
                Modifier.size(width = 52.dp, height = 28.dp)
                    .background(Earth.copy(alpha = 0.15f + intensity * 0.65f), RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center,
            ) {
                val lineColor = if (intensity > 0.55f) Color.White else MaterialTheme.colorScheme.onSurface
                val line = buildAnnotatedString {
                    append("$count")
                    withStyle(SpanStyle(fontSize = 9.sp, color = lineColor.copy(alpha = 0.7f))) { append(" · %.1f".format(avg)) }
                }
                Text(
                    line,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = lineColor,
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Symptom analytics — "Cycle-by-cycle trends" + "Next-cycle forecast"
// (SymptomTrend / SymptomPrediction in health.tsx)
// ─────────────────────────────────────────────────────────────────────────────

private class CycleSpan(val start: String, val end: String)

/** Cycles as [start, nextStart); the open-ended current cycle ends tomorrow. */
private fun buildCycles(periodStarts: List<String>): List<CycleSpan> {
    val asc = periodStarts.sorted()
    val todayPlus = CycleMath.addDays(todayIso(), 1)
    return asc.mapIndexed { i, s -> CycleSpan(s, asc.getOrNull(i + 1) ?: todayPlus) }
}

private class SymptomCell(var count: Int = 0, var severity: Int = 0)

private class SymptomTally(
    val cycles: List<CycleSpan>,
    val phaseDays: Array<IntArray>,
    val cells: Array<Array<MutableMap<String, SymptomCell>>>,
)

/** Per-cycle × per-phase tallies, mirroring the JS in SymptomTrend/SymptomPrediction. */
private fun buildSymptomTally(entries: List<CycleEntry>, periodStarts: List<String>, cycleLength: Int): SymptomTally {
    val cycles = buildCycles(periodStarts)
    val phaseDays = Array(cycles.size) { IntArray(PHASE_ORDER.size) }
    val cells: Array<Array<MutableMap<String, SymptomCell>>> =
        Array(cycles.size) { Array(PHASE_ORDER.size) { linkedMapOf() } }

    cycles.forEachIndexed { ci, span ->
        val s = parseIso(span.start) ?: return@forEachIndexed
        val e = parseIso(span.end) ?: return@forEachIndexed
        val days = minOf(cycleLength, (e.toEpochDay() - s.toEpochDay()).toInt().coerceAtLeast(0))
        for (d in 1..days) {
            phaseDays[ci][PHASE_ORDER.indexOf(CycleMath.phaseForDay(d, cycleLength))] += 1
        }
    }

    for (entry in entries) {
        val ci = cycles.indexOfFirst { entry.entryDate >= it.start && entry.entryDate < it.end }
        if (ci < 0) continue
        val day = CycleMath.daysBetween(cycles[ci].start, entry.entryDate) + 1
        if (day < 1 || day > cycleLength) continue
        val pi = PHASE_ORDER.indexOf(CycleMath.phaseForDay(day, cycleLength))
        for (sym in entry.symptoms.orEmpty()) {
            val cell = cells[ci][pi].getOrPut(sym) { SymptomCell() }
            cell.count += 1
            cell.severity += entry.symptomSeverities?.get(sym) ?: 2
        }
    }

    return SymptomTally(cycles, phaseDays, cells)
}

private class TrendPoint(val y: Double, val count: Int) {
    var x: Float = 0f
    var yPx: Float = 0f
}
private class TrendSeries(val phase: CycleMath.Phase, val points: List<TrendPoint?>)

@Composable
private fun SymptomTrend(entries: List<CycleEntry>, periodStarts: List<String>, cycleLength: Int) {
    var selected by remember { mutableStateOf("__all") }
    var metric by remember { mutableStateOf("severity") }

    val tally = remember(entries, periodStarts, cycleLength) {
        buildSymptomTally(entries, periodStarts, cycleLength)
    }
    val allSymptoms = remember(entries) { entries.flatMap { it.symptoms.orEmpty() }.distinct().sorted() }
    val totalLogged = remember(entries) { entries.count { !it.symptoms.isNullOrEmpty() } }
    val startsAsc = remember(tally) { tally.cycles.map { it.start } }

    val severity = metric == "severity"
    val yMax = if (severity) 3f else 1f

    val series = remember(tally, selected, metric) {
        PHASE_ORDER.map { p ->
            val pi = PHASE_ORDER.indexOf(p)
            TrendSeries(
                p,
                tally.cycles.indices.map { ci ->
                    var count = 0
                    var sev = 0
                    if (selected == "__all") {
                        for (cell in tally.cells[ci][pi].values) { count += cell.count; sev += cell.severity }
                    } else {
                        tally.cells[ci][pi][selected]?.let { count = it.count; sev = it.severity }
                    }
                    when {
                        severity && count > 0 -> TrendPoint(sev.toDouble() / count, count)
                        !severity && tally.phaseDays[ci][pi] > 0 -> TrendPoint(count.toDouble() / tally.phaseDays[ci][pi], count)
                        else -> null
                    }
                },
            )
        }
    }

    SectionCard("Cycle-by-cycle trends", titleSize = 24.sp) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (tally.cycles.size < 2) {
                AlertCard(
                    "Need at least 2 cycles",
                    "Log the start of two periods (and tag symptoms in between) and a trend across cycles will appear here.",
                )
            } else {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        FieldLabel("Symptom")
                        DropSelect(
                            valueLabel = if (selected == "__all") "All symptoms combined" else selected.replaceFirstChar { it.uppercase() },
                            placeholder = "Symptom",
                            options = listOf("All symptoms combined" to "__all") +
                                allSymptoms.map { it.replaceFirstChar { c -> c.uppercase() } to it },
                            onSelect = { selected = it },
                        )
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        FieldLabel("View")
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            Pill("Avg severity", severity, onClick = { metric = "severity" })
                            Pill("Frequency", !severity, onClick = { metric = "frequency" })
                        }
                    }
                }

                val n = tally.cycles.size
                Text(
                    "$n cycle${if (n == 1) "" else "s"} · $totalLogged tagged day${if (totalLogged == 1) "" else "s"}",
                    Modifier.fillMaxWidth(),
                    textAlign = TextAlign.End,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                TrendCanvas(series, startsAsc, severity, yMax)

                val footnote = buildAnnotatedString {
                    append("Each point is one cycle. Dot size reflects how many days you tagged. Missing dots mean nothing was logged in that phase for that cycle. Switch ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("Frequency") }
                    append(" to see what share of phase days carried the symptom, or ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("Avg severity") }
                    append(" to see how intense it felt.")
                }
                Text(footnote, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontStyle = FontStyle.Italic)
            }
        }
    }
}

@Composable
private fun TrendCanvas(
    series: List<TrendSeries>,
    startsAsc: List<String>,
    severity: Boolean,
    yMax: Float,
) {
    val density = LocalDensity.current
    val onSurface = MaterialTheme.colorScheme.onSurface
    val cycleCount = startsAsc.size
    val yLabel = if (severity) "Avg severity (1–3)" else "Symptom-days ÷ phase days"

    Canvas(Modifier.fillMaxWidth().height(240.dp)) {
        val sx = size.width / 720f
        val sy = size.height / 240f
        val padL = 44f
        val innerW = 720f - 44f - 14f
        val padT = 16f
        val innerH = 240f - 16f - 42f
        fun X(i: Int) = if (cycleCount <= 1) padL + innerW / 2f else padL + i * innerW / (cycleCount - 1)
        fun Y(v: Float) = padT + (1f - minOf(v, yMax) / yMax) * innerH

        val yPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.55f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.RIGHT
        }
        listOf(0f, 0.25f, 0.5f, 0.75f, 1f).forEach { t ->
            val v = t * yMax
            val y = Y(v) * sy
            drawLine(onSurface.copy(alpha = 0.08f), Offset(padL * sx, y), Offset((padL + innerW) * sx, y), strokeWidth = 1f)
            fillText(yPaint, if (severity) "%.1f".format(v) else "${(v * 100).roundToInt()}%", (padL - 6f) * sx, y + 3f)
        }

        // rotated y-axis title
        val axisPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.55f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.CENTER
        }
        val nc = drawContext.canvas.nativeCanvas
        val ax = (padL - 34f) * sx
        val ay = (padT + innerH / 2f) * sy
        nc.save()
        nc.rotate(-90f, ax, ay)
        nc.drawText(yLabel, ax, ay, axisPaint)
        nc.restore()

        // x ticks: cycle index + start date
        val tickPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.70f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.CENTER
        }
        val datePaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.45f).toArgb()
            textSize = with(density) { 9.sp.toPx() }
            textAlign = android.graphics.Paint.Align.CENTER
        }
        startsAsc.forEachIndexed { i, s ->
            val x = X(i) * sx
            drawLine(onSurface.copy(alpha = 0.30f), Offset(x, (padT + innerH) * sy), Offset(x, (padT + innerH + 4f) * sy), strokeWidth = 1f)
            fillText(tickPaint, "C${i + 1}", x, (padT + innerH + 16f) * sy)
            fillText(datePaint, s.substring(5), x, (padT + innerH + 30f) * sy)
        }

        // one polyline per phase, split at missing points
        for (trend in series) {
            val color = PHASE_COLOR.getValue(trend.phase)
            val segs = ArrayList<ArrayList<TrendPoint>>()
            var cur = ArrayList<TrendPoint>()
            trend.points.forEachIndexed { i, pt ->
                if (pt == null) {
                    if (cur.isNotEmpty()) { segs.add(cur); cur = ArrayList() }
                } else {
                    pt.x = X(i); pt.yPx = Y(pt.y.toFloat()) * sy
                    cur.add(pt)
                }
            }
            if (cur.isNotEmpty()) segs.add(cur)

            for (seg in segs) {
                if (seg.size == 1) {
                    val p = seg[0]
                    drawCircle(color, radius = 4f * sx, center = Offset(p.x * sx, p.yPx))
                } else {
                    val path = Path()
                    seg.forEachIndexed { idx, p ->
                        val px = p.x * sx
                        if (idx == 0) path.moveTo(px, p.yPx) else path.lineTo(px, p.yPx)
                    }
                    drawPath(path, color = color, style = Stroke(width = 2.25f * sx, cap = StrokeCap.Round, join = StrokeJoin.Round))
                }
            }
            for (seg in segs) {
                for (p in seg) {
                    val r = minOf(7f, 2.5f + sqrt(p.count.toFloat()) * 1.2f) * sx
                    drawCircle(color, radius = r, center = Offset(p.x * sx, p.yPx), alpha = 0.85f)
                    drawCircle(Color.White, radius = r, center = Offset(p.x * sx, p.yPx), style = Stroke(width = 1.5f * sx))
                }
            }
        }

        // legend
        val legendPaint = android.graphics.Paint().apply {
            isAntiAlias = true
            color = onSurface.copy(alpha = 0.75f).toArgb()
            textSize = with(density) { 10.sp.toPx() }
            textAlign = android.graphics.Paint.Align.LEFT
        }
        PHASE_ORDER.forEachIndexed { i, p ->
            val x = (padL + i * 130f) * sx
            drawRect(PHASE_COLOR.getValue(p), topLeft = Offset(x, 228f * sy), size = Size(10f * sx, 3f * sy))
            fillText(legendPaint, shortPhaseLabel(p), x + 14f * sx, 234f * sy)
        }
    }
}

private class PhaseForecast(
    val freq: Double,
    val sev: Double,
    val confidence: Double,
    val observedCycles: Int,
)

private class ForecastRow(val symptom: String, val byPhase: List<PhaseForecast>, val load: Double)

private class FreqSample(val freq: Double, val sev: Double?, val w: Int, val tagged: Int)

/** Recency-weighted forecast for one symptom in one phase — port of SymptomPrediction.predict. */
private fun predictPhase(tally: SymptomTally, phaseIdx: Int, symptom: String): PhaseForecast {
    val series = ArrayList<FreqSample>()
    for (ci in tally.cycles.indices) {
        val denom = tally.phaseDays[ci][phaseIdx]
        if (denom <= 0) continue
        val cell = tally.cells[ci][phaseIdx][symptom]
        val count = cell?.count ?: 0
        val sevSum = cell?.severity ?: 0
        series.add(
            FreqSample(
                freq = count.toDouble() / denom,
                sev = if (count > 0) sevSum.toDouble() / count else null,
                w = ci + 1,
                tagged = count,
            )
        )
    }
    if (series.isEmpty()) return PhaseForecast(0.0, 0.0, 0.0, 0)

    val wSum = series.sumOf { it.w }
    val freqMean = series.sumOf { it.freq * it.w } / wSum
    val sevSeries = series.filter { it.sev != null }
    val sevWSum = sevSeries.sumOf { it.w }
    val sevMean = if (sevWSum > 0) sevSeries.sumOf { (it.sev ?: 0.0) * it.w } / sevWSum else 0.0

    var trendNudge = 0.0
    if (series.size >= 3) {
        val n = series.size
        val ys = series.map { it.freq }
        val xm = (n - 1) / 2.0
        val ym = ys.average()
        var num = 0.0
        var den = 0.0
        for (i in 0 until n) {
            val x = i.toDouble()
            num += (x - xm) * (ys[i] - ym)
            den += (x - xm) * (x - xm)
        }
        val slope = if (den > 0) num / den else 0.0
        trendNudge = (slope * 0.5).coerceIn(-0.15, 0.15)
    }

    val totalTagged = series.sumOf { it.tagged }
    val confidence = minOf(1.0, (series.size / 4.0) * 0.6 + minOf(1.0, totalTagged / 8.0) * 0.4)

    return PhaseForecast(
        freq = (freqMean + trendNudge).coerceIn(0.0, 1.0),
        sev = sevMean.coerceIn(0.0, 3.0),
        confidence = confidence,
        observedCycles = series.size,
    )
}

private fun buildForecast(tally: SymptomTally, symptoms: List<String>): List<ForecastRow> =
    symptoms
        .map { sym ->
            val byPhase = PHASE_ORDER.indices.map { pi -> predictPhase(tally, pi, sym) }
            ForecastRow(sym, byPhase, byPhase.sumOf { it.freq * (if (it.sev > 0) it.sev else 0.0) })
        }
        .filter { r -> r.byPhase.maxOf { it.observedCycles } > 0 && r.load > 0 }
        .sortedByDescending { it.load }

private fun sevLabel(avg: Double): String = when {
    avg >= 2.5 -> "severe"
    avg >= 1.75 -> "moderate"
    avg >= 1.25 -> "mild–moderate"
    avg > 0 -> "mild"
    else -> "—"
}

@Composable
private fun SymptomPrediction(entries: List<CycleEntry>, periodStarts: List<String>, cycleLength: Int) {
    val tally = remember(entries, periodStarts, cycleLength) {
        buildSymptomTally(entries, periodStarts, cycleLength)
    }
    val allSymptoms = remember(entries) { entries.flatMap { it.symptoms.orEmpty() }.distinct().sorted() }
    val rows = remember(tally, allSymptoms) { buildForecast(tally, allSymptoms) }

    val nextStart = remember(periodStarts, cycleLength) {
        periodStarts.maxOrNull()?.let { CycleMath.addDays(it, cycleLength) }
    }
    val nextStartLabel = nextStart?.let { runCatching { parseIso(it)?.format(LongDate) }.getOrNull() }

    val watchouts = remember(rows) {
        rows.flatMapIndexed { _, r ->
            PHASE_ORDER.indices.mapNotNull { pi ->
                val c = r.byPhase[pi]
                if (c.freq < 0.2 || c.sev <= 0) null else WatchOut(r.symptom, PHASE_ORDER[pi], c)
            }
        }.sortedByDescending { it.cell.freq * it.cell.sev }.take(4)
    }

    SectionCard("Next-cycle forecast", titleSize = 24.sp) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (tally.cycles.size < 2 || rows.isEmpty()) {
                AlertCard(
                    "Not enough history yet",
                    "Forecasts unlock after you've logged symptoms across at least two cycles. The more cycles you log, the more accurate this becomes.",
                )
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Kicker("Predicted for your next cycle")
                    if (nextStartLabel != null) {
                        val line = buildAnnotatedString {
                            append("Starting around ")
                            withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)) { append(nextStartLabel) }
                            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                append(", based on ${tally.cycles.size} logged cycles.")
                            }
                        }
                        Text(line, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                if (watchouts.isNotEmpty()) {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Sand.copy(alpha = 0.3f)),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Kicker("Likely to watch for")
                            watchouts.forEach { w ->
                                val line = buildAnnotatedString {
                                    append("Expect ")
                                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(w.symptom) }
                                    append(" in the ")
                                    withStyle(SpanStyle(color = PHASE_TINT.getValue(w.phase).fg, fontWeight = FontWeight.Medium)) {
                                        append(shortPhaseLabel(w.phase))
                                    }
                                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                                        append(
                                            " — ~${(w.cell.freq * 100).roundToInt()}% of days, ${sevLabel(w.cell.sev)} " +
                                                "(avg ${"%.1f".format(w.cell.sev)}/3)" +
                                                if (w.cell.confidence < 0.5) " · low confidence" else ""
                                        )
                                        append(".")
                                    }
                                }
                                Text(line, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }

                // Forecast table
                Column(Modifier.horizontalScroll(rememberScrollState())) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        HeaderCell("Symptom", Modifier.width(116.dp))
                        PHASE_ORDER.forEach { p -> HeaderCell(shortPhaseLabel(p), Modifier.width(76.dp)) }
                    }
                    rows.take(10).forEach { r ->
                        val maxLoad = r.byPhase.maxOf { it.freq * (if (it.sev > 0) it.sev else 0.0) }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                r.symptom.replaceFirstChar { it.uppercase() },
                                Modifier.width(116.dp).padding(top = 4.dp, bottom = 4.dp, end = 6.dp),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                            )
                            r.byPhase.forEach { cell -> ForecastCell(cell, maxLoad, Modifier.width(76.dp)) }
                        }
                    }
                }

                val footnote = buildAnnotatedString {
                    append("Each cell shows the predicted ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("chance per day") }
                    append(" and ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("average severity") }
                    append(" for that phase next cycle. We weight recent cycles more heavily and nudge the forecast along clear upward or downward trends. Faded cells mean fewer cycles backed the estimate — keep logging to tighten it.")
                }
                Text(footnote, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontStyle = FontStyle.Italic)
            }
        }
    }
}

private class WatchOut(val symptom: String, val phase: CycleMath.Phase, val cell: PhaseForecast)

@Composable
private fun ForecastCell(cell: PhaseForecast, maxLoad: Double, modifier: Modifier) {
    val load = cell.freq * (if (cell.sev > 0) cell.sev else 0.0)
    val intensity = if (maxLoad > 0) (load / maxLoad).toFloat() else 0f
    val blank = cell.freq <= 0 || cell.sev <= 0
    val muted = MaterialTheme.colorScheme.onSurfaceVariant

    Box(modifier.padding(vertical = 3.dp, horizontal = 2.dp), contentAlignment = Alignment.Center) {
        Box(
            Modifier
                .fillMaxWidth()
                .then(
                    if (blank) {
                        Modifier.border(1.dp, muted.copy(alpha = 0.25f), RoundedCornerShape(6.dp))
                    } else {
                        Modifier.background(Earth.copy(alpha = 0.15f + intensity * 0.65f), RoundedCornerShape(6.dp))
                    }
                )
                .alpha(if (!blank && cell.confidence < 0.35) 0.65f else 1f)
                .padding(horizontal = 6.dp, vertical = 4.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (blank) {
                Text("·", fontSize = 12.sp, fontWeight = FontWeight.Medium, color = muted.copy(alpha = 0.5f))
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "${(cell.freq * 100).roundToInt()}%",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (intensity > 0.55f) Color.White else MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        "${"%.1f".format(cell.sev)}/3",
                        fontSize = 10.sp,
                        color = if (intensity > 0.55f) Color.White.copy(alpha = 0.85f) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                    )
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 4 — AI insights (port of src/components/health/AIInsights.tsx)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun AIInsightsPanel() {
    var attempted by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
            Row(
                Modifier.fillMaxWidth().padding(20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Kicker("AI pattern detection", color = Earth)
                    Helper("Reads your last 90 days of cycle and wellness logs and surfaces plain-language patterns.")
                }
                MiniPillButton(if (attempted) "Re-analyze" else "Find patterns") { attempted = true }
            }
        }

        if (attempted) {
            EmptyCard(
                "AI pattern detection runs on the HerSpace server, which the Android app can't reach yet. " +
                    "Keep logging your cycle and wellness entries and your patterns will appear here."
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 5 — Dashboard (port of src/components/health/CycleDashboard.tsx)
// ─────────────────────────────────────────────────────────────────────────────

private const val SERVER_NOTE =
    "This runs on the HerSpace server, which the Android app can't reach yet."

private enum class DashRange(val label: String, val days: Int) {
    WEEK("Week", 7), MONTH("Month", 30), SIX("6 months", 180), YEAR("Year", 365),
}

private class CalCell(val day: Int?, val date: String, val period: Boolean, val ovulation: Boolean, val wellness: Boolean)

private fun buildCalendarCells(
    cycles: List<CycleEntry>,
    wellnessDates: Set<String>,
    starts: List<String>,
): List<CalCell> {
    val now = LocalDate.now()
    val first = now.withDayOfMonth(1)
    val days = first.lengthOfMonth()
    val leading = first.dayOfWeek.value % 7          // JS getDay(): Sun = 0
    val periodDates = mutableSetOf<String>()
    for (c in cycles) {
        if (isPeriodRow(c)) {
            val s = parseIso(c.entryDate) ?: continue
            val e = c.endDate?.let { parseIso(it) } ?: s
            var d = s
            while (!d.isAfter(e)) { periodDates.add(d.toString()); d = d.plusDays(1) }
        }
    }
    val ovulationDates = starts.mapNotNull { parseIso(it)?.plusDays(14)?.toString() }.toSet()

    val cells = mutableListOf<CalCell>()
    repeat(leading) { cells.add(CalCell(null, "", false, false, false)) }
    for (d in 1..days) {
        val ds = now.withDayOfMonth(d).toString()
        cells.add(
            CalCell(
                day = d,
                date = ds,
                period = ds in periodDates,
                ovulation = ds in ovulationDates,
                wellness = ds in wellnessDates,
            )
        )
    }
    return cells
}

/** Port of CycleDashboard's buildFertileMap: projects anchors forward, windows around ovulation. */
private fun buildFertileMap(starts: List<String>, avgCycleLen: Int, windowDays: Int): Map<String, String> {
    val map = linkedMapOf<String, String>()
    val cycleLen = avgCycleLen.coerceIn(20, 45)
    val horizon = LocalDate.now().plusMonths(2)
    val anchors = starts.mapNotNull { parseIso(it) }.sorted().toMutableList()
    if (anchors.isNotEmpty()) {
        var last = anchors.last()
        while (last.isBefore(horizon)) {
            last = last.plusDays(cycleLen.toLong())
            anchors.add(last)
        }
    }
    val w = windowDays.coerceIn(3, 10)
    for (a in anchors) {
        val ov = a.plusDays((cycleLen - 14).toLong())
        for (off in (1 - w)..1) {
            val key = ov.plusDays(off.toLong()).toString()
            if (key !in map) map[key] = "fertile"
        }
        map[ov.toString()] = "ovulation"
    }
    return map
}

private fun cycleLengthSeries(starts: List<String>): List<Pair<String, Float>> {
    val asc = starts.sorted()
    val out = mutableListOf<Pair<String, Float>>()
    for (i in 1 until asc.size) {
        val d = CycleMath.daysBetween(asc[i - 1], asc[i])
        if (d in 11..89) out.add(asc[i].substring(5) to d.toFloat())
    }
    return out
}

private fun energySeries(w: List<WellnessLog>): List<Pair<String, Float>> =
    w.filter { (it.energyLevel ?: 0) > 0 }.map { it.logDate.substring(5) to (it.energyLevel ?: 0).toFloat() }

private fun sleepSeries(w: List<WellnessLog>): List<Pair<String, Float>> =
    w.filter { (it.sleepHours ?: 0.0) > 0.0 }.map { it.logDate.substring(5) to (it.sleepHours ?: 0.0).toFloat() }

private fun waterSeries(w: List<WellnessLog>): List<Pair<String, Float>> =
    w.filter { it.waterGlasses != null }.map { it.logDate.substring(5) to (it.waterGlasses ?: 0).toFloat() }

@Composable
private fun TrendChartCard(title: String, series: List<Pair<String, Float>>, unit: String) {
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    SectionCard(title, titleSize = 18.sp) {
        if (series.isEmpty()) {
            Helper("Not enough data yet.")
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Canvas(Modifier.fillMaxWidth().height(80.dp)) {
                    val w = 320f
                    val h = 120f
                    val pad = 16f
                    val sx = size.width / w
                    val sy = size.height / h
                    val max = series.maxOf { it.second }
                    val min = series.minOf { it.second }
                    fun xs(i: Int) = if (series.size <= 1) pad + (w - pad * 2) / 2f else pad + (i * (w - pad * 2)) / (series.size - 1)
                    fun ys(v: Float) = h - pad - ((v - min) / maxOf(0.0001f, max - min)) * (h - pad * 2)

                    val path = Path()
                    series.forEachIndexed { i, s ->
                        val px = xs(i) * sx
                        val py = ys(s.second) * sy
                        if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
                    }
                    drawPath(path, color = Earth, style = Stroke(width = 2f * sx, cap = StrokeCap.Round, join = StrokeJoin.Round))
                    series.forEachIndexed { i, s ->
                        drawCircle(Earth, radius = 2.5f * sx, center = Offset(xs(i) * sx, ys(s.second) * sy))
                    }
                }
                val lo = series.minOf { it.second }
                val hi = series.maxOf { it.second }
                val fmt = { v: Float -> if (v % 1f == 0f) "${v.toInt()}" else "%.1f".format(v) }
                Text(
                    "Range: ${fmt(lo)}$unit — ${fmt(hi)}$unit",
                    fontSize = 11.sp,
                    color = muted,
                )
            }
        }
    }
}

@Composable
private fun DashboardPanel(entries: List<CycleEntry>, repo: HealthRepository) {
    var range by remember { mutableStateOf(DashRange.MONTH) }
    var wellness by remember { mutableStateOf(listOf<WellnessLog>()) }
    var loading by remember { mutableStateOf(true) }
    var overlayMode by remember { mutableStateOf("both") }
    var windowDays by remember { mutableStateOf(6f) }
    var showOverlay by remember { mutableStateOf(false) }
    var note by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(range) {
        loading = true
        wellness = runCatching { repo.recentWellness(400) }.getOrDefault(emptyList())
        loading = false
    }

    val cutoff = remember(range) { CycleMath.addDays(todayIso(), -range.days) }
    val cycles = remember(entries, cutoff) { entries.filter { it.entryDate >= cutoff } }
    val stats = remember(cycles) { summarize(cycles) }
    val starts = remember(cycles) { periodStartsOf(cycles).sorted() }
    val wellnessInRange = remember(wellness, cutoff) { wellness.filter { it.logDate >= cutoff } }

    val calendar = remember(cycles, wellnessInRange, starts) {
        buildCalendarCells(cycles, wellnessInRange.map { it.logDate }.toSet(), starts)
    }
    val avgCycleLen = stats.avgCycle?.takeIf { it > 0 } ?: 28
    val fertileMap = remember(starts, avgCycleLen, windowDays) { buildFertileMap(starts, avgCycleLen, windowDays.toInt()) }
    val showFertile = overlayMode != "ovulation"
    val showOvulation = overlayMode != "fertile"

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.weight(1f)) {
                DashRange.values().forEach { r ->
                    Pill(r.label, range == r, uppercase = true, onClick = { range = r })
                }
            }
            MiniPillButton(if (note == null) "Download PDF report" else "Downloaded") {
                note = "PDF reports are built on the HerSpace server, which the Android app can't reach yet. $SERVER_NOTE"
            }
        }
        if (note != null) Helper(note!!)

        if (loading) LoadingRow()

        // Stats
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            StatTile("Cycles", "${stats.cycleCount}", modifier = Modifier.weight(1f))
            StatTile("Avg cycle", stats.avgCycle?.let { "${it}d" } ?: "—", modifier = Modifier.weight(1f))
            StatTile("Avg period", stats.avgPeriod?.let { "${it}d" } ?: "—", modifier = Modifier.weight(1f))
            StatTile("Regularity", stats.regularity ?: "—", modifier = Modifier.weight(1f))
        }

        // Calendar
        SectionCard(
            "Calendar",
            trailing = {
                MiniPillButton(if (showOverlay) "Hide overlay" else "Overlay") { showOverlay = !showOverlay }
            },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (showOverlay) {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    ) {
                        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Kicker("Show")
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Pill("Both", overlayMode == "both", onClick = { overlayMode = "both" })
                                Pill("Fertile", overlayMode == "fertile", onClick = { overlayMode = "fertile" })
                                Pill("Ovulation", overlayMode == "ovulation", onClick = { overlayMode = "ovulation" })
                            }
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Kicker("Fertile window length")
                                Text("${windowDays.toInt()} days", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Slider(
                                value = windowDays,
                                onValueChange = { windowDays = it },
                                valueRange = 3f..10f,
                                steps = 6,
                                enabled = overlayMode != "ovulation",
                                colors = sliderColors(),
                            )
                            Helper("Centered slightly before ovulation, ending the day after.")
                        }
                    }
                }

                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf("S", "M", "T", "W", "T", "F", "S").forEach { d ->
                        Text(
                            d,
                            Modifier.weight(1f),
                            textAlign = TextAlign.Center,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                calendar.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        week.forEach { c ->
                            val isOv = c.ovulation && showOvulation
                            val isFert = fertileMap[c.date] == "fertile" && showFertile && !c.ovulation
                            val bg = when {
                                c.period -> Rose200
                                isOv -> Emerald200
                                isFert -> Emerald50
                                c.wellness -> Sand.copy(alpha = 0.6f)
                                c.day == null -> Color.Transparent
                                else -> MaterialTheme.colorScheme.background
                            }
                            val border = when {
                                c.period -> Rose300
                                isOv -> Emerald400
                                isFert -> Emerald200
                                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
                            }
                            val fg = when {
                                c.period -> Rose900
                                isOv || isFert -> Emerald900
                                c.day == null -> Color.Transparent
                                c.wellness -> MaterialTheme.colorScheme.onSurface
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            }
                            Box(
                                Modifier
                                    .weight(1f)
                                    .aspectRatio(1f)
                                    .background(bg, RoundedCornerShape(6.dp))
                                    .border(1.dp, border, RoundedCornerShape(6.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text("${c.day ?: ""}", fontSize = 11.sp, color = fg)
                                if (isOv) {
                                    Box(
                                        Modifier
                                            .align(Alignment.BottomEnd)
                                            .padding(3.dp)
                                            .size(5.dp)
                                            .clip(RoundedCornerShape(50))
                                            .background(Color(0xFF059669))
                                    )
                                }
                            }
                        }
                        repeat(7 - week.size) { Spacer(Modifier.weight(1f)) }
                    }
                }

                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    LegendItem(Rose300, "Period")
                    if (showFertile) LegendItem(Emerald100, "Fertile window", outline = Emerald200)
                    if (showOvulation) LegendItem(Emerald500, "Est. ovulation")
                    LegendItem(Sand, "Wellness logged")
                }
            }
        }

        // Trend charts
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f)) { TrendChartCard("Cycle length", cycleLengthSeries(starts), "d") }
            Box(Modifier.weight(1f)) { TrendChartCard("Mood (energy 1–5)", energySeries(wellnessInRange), "") }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.weight(1f)) { TrendChartCard("Sleep hours", sleepSeries(wellnessInRange), "h") }
            Box(Modifier.weight(1f)) { TrendChartCard("Water (glasses)", waterSeries(wellnessInRange), "") }
        }
    }
}

@Composable
private fun LegendItem(color: Color, label: String, outline: Color? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(
            Modifier
                .size(10.dp)
                .clip(RoundedCornerShape(50))
                .background(color)
                .then(if (outline != null) Modifier.border(1.dp, outline, RoundedCornerShape(50)) else Modifier)
        )
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 6 — Symptom Assistant (port of SymptomAssistant in health.tsx)
// ─────────────────────────────────────────────────────────────────────────────

private val SYMPTOM_EXAMPLES_WEB = SYMPTOM_EXAMPLES

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SymptomQuickAdd(symptoms: String, onChange: (String) -> Unit) {
    var activeCategory by remember { mutableStateOf("All") }
    val categories = remember { listOf("All") + SYMPTOM_EXAMPLES_WEB.map { it.first } }
    val visible = if (activeCategory == "All") {
        SYMPTOM_EXAMPLES_WEB.flatMap { it.second }
    } else {
        SYMPTOM_EXAMPLES_WEB.firstOrNull { it.first == activeCategory }?.second.orEmpty()
    }

    fun add(example: String) {
        val trimmed = symptoms.trim()
        if (trimmed.isEmpty()) { onChange(example); return }
        if (trimmed.lowercase().contains(example.lowercase())) return
        val sep = if (trimmed.last() == ',' || trimmed.last() == '.') " " else ", "
        onChange("$trimmed$sep$example")
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
        Kicker("Start faster")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            categories.forEach { cat ->
                Pill(cat, activeCategory == cat, selectedBg = Earth, selectedFg = OnEarth, onClick = { activeCategory = cat })
            }
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            visible.forEach { ex ->
                Box(
                    Modifier
                        .clip(RoundedCornerShape(50))
                        .background(Sand.copy(alpha = 0.5f))
                        .clickable { add(ex) }
                        .padding(horizontal = 10.dp, vertical = 5.dp)
                ) { Text("+ $ex", fontSize = 12.sp, color = Earth) }
            }
        }
    }
}

@Composable
private fun SymptomAssistantPanel() {
    var symptoms by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var attempted by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun run() {
        if (symptoms.trim().length < 3) { error = "Describe your symptoms first."; return }
        error = null
        attempted = true
    }

    BoxWithConstraints {
        if (maxWidth >= 600.dp) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                DescribeCard(
                    Modifier.weight(2f),
                    symptoms, { symptoms = it },
                    age, { age = it },
                    error,
                    ::run,
                )
                ResultPane(Modifier.weight(3f), attempted)
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                DescribeCard(
                    Modifier.fillMaxWidth(),
                    symptoms, { symptoms = it },
                    age, { age = it },
                    error,
                    ::run,
                )
                ResultPane(Modifier.fillMaxWidth(), attempted)
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DescribeCard(
    modifier: Modifier,
    symptoms: String,
    onSymptoms: (String) -> Unit,
    age: String,
    onAge: (String) -> Unit,
    error: String?,
    onRun: () -> Unit,
) {
    SectionCard("Describe what you're experiencing", modifier = modifier, titleSize = 24.sp) {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                FieldLabel("Symptoms")
                OutlinedTextField(
                    symptoms,
                    { onSymptoms(it.take(2000)) },
                    Modifier.fillMaxWidth(),
                    minLines = 6,
                    placeholder = { Text("e.g. irregular periods for 3 months, acne on jaw, hair thinning…", style = MaterialTheme.typography.bodySmall) },
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
                SymptomQuickAdd(symptoms, onSymptoms)
            }

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                FieldLabel("Age", optional = true)
                OutlinedTextField(
                    age,
                    { onAge(it.filter(Char::isDigit).take(3)) },
                    Modifier.width(120.dp),
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
            }

            PillButton("Analyze symptoms", onClick = onRun)

            if (error != null) Helper(error)

            Text(
                "HerSpace AI is an educational tool. It does not diagnose. For emergencies, call your local emergency number.",
                fontSize = 11.sp,
                lineHeight = 15.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ResultPane(modifier: Modifier, attempted: Boolean) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!attempted) {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            ) {
                Text(
                    "Your structured analysis will appear here.",
                    Modifier.fillMaxWidth().padding(32.dp),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            EmptyCard("Thinking carefully…")
            EmptyCard(
                "The Symptom Assistant analyzes your description on the HerSpace AI server, which the Android app " +
                    "can't reach yet. Once connected you'll get a summary, possible conditions to discuss with a " +
                    "clinician, questions for your doctor, gentle self-care tips, and red flags to watch for."
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 7 — Research (port of ResearchSimplifier in health.tsx)
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun ResearchPanel() {
    var topic by remember { mutableStateOf("") }
    var attempted by remember { mutableStateOf(false) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    topic,
                    { topic = it.take(200) },
                    Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("e.g. PCOS, endometriosis, perimenopause sleep, breast self-exam…", style = MaterialTheme.typography.bodySmall) },
                    textStyle = MaterialTheme.typography.bodyMedium,
                )
                PillButton(if (attempted) "Reading…" else "Simplify research") {
                    if (topic.isNotBlank()) attempted = true
                }
            }
        }

        if (attempted) {
            EmptyCard(
                "Research simplification runs on the HerSpace server, which the Android app can't reach yet. " +
                    "When it's connected you'll get a beginner explanation, key findings, practical takeaways, " +
                    "myth vs fact, FAQs, and suggested PubMed/NIH searches."
            )
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 9 — Settings (port of src/components/health/HealthSettings.tsx)
// ─────────────────────────────────────────────────────────────────────────────

private class NotifyToggle(val key: String, val label: String, val desc: String)

private val NOTIFY_TOGGLES = listOf(
    NotifyToggle("notify_period", "Upcoming period", "Heads-up before your expected start"),
    NotifyToggle("notify_ovulation", "Ovulation window", "On estimated ovulation day"),
    NotifyToggle("notify_logging", "Daily logging", "Gentle reminder to log mood + symptoms"),
    NotifyToggle("notify_hydration", "Hydration", "Mid-day water nudge"),
    NotifyToggle("notify_sleep", "Sleep", "Wind-down reminder in the evening"),
    NotifyToggle("notify_medication", "Medication", "Custom medication reminders"),
    NotifyToggle("notify_doctor", "Doctor follow-ups", "Track upcoming appointments"),
)

private val NOTIFY_DEFAULTS = mapOf(
    "notify_period" to true, "notify_ovulation" to true, "notify_hydration" to false, "notify_sleep" to false,
    "notify_logging" to true, "notify_medication" to false, "notify_doctor" to false,
)

@Composable
private fun HealthSettingsPanel() {
    var prefs by remember { mutableStateOf(NOTIFY_DEFAULTS) }
    var leadDays by remember { mutableStateOf("2") }
    var aiEnabled by remember { mutableStateOf(true) }
    var note by remember { mutableStateOf<String?>(null) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard(
            "Smart notifications",
            titleSize = 24.sp,
            trailing = { Icon(Icons.Filled.Notifications, contentDescription = null, Modifier.size(20.dp), tint = Earth) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AlertCard("Notifications", "Reminders will show in-app — this build doesn't post system notifications yet.")
                NOTIFY_TOGGLES.chunked(2).forEach { pair ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        pair.forEach { t ->
                            Row(
                                Modifier
                                    .weight(1f)
                                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(10.dp))
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(t.label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                    Text(t.desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Switch(
                                    checked = prefs[t.key] ?: false,
                                    onCheckedChange = { v -> prefs = prefs + (t.key to v) },
                                    colors = SwitchDefaults.colors(checkedThumbColor = OnEarth, checkedTrackColor = Earth),
                                )
                            }
                        }
                        if (pair.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Period reminder — days ahead:", style = MaterialTheme.typography.bodySmall)
                    OutlinedTextField(
                        leadDays,
                        { leadDays = it.filter(Char::isDigit).take(1) },
                        Modifier.width(72.dp),
                        singleLine = true,
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        textStyle = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        SectionCard(
            "Privacy & data",
            titleSize = 24.sp,
            trailing = { Icon(Icons.Filled.Security, contentDescription = null, Modifier.size(20.dp), tint = Earth) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Helper(
                    "All of your cycle, wellness, and journal data is private to you, encrypted in transit and at rest, " +
                        "and never sold or shared. You're in full control.",
                )
                Row(
                    Modifier.fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(10.dp))
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text("AI analysis", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                        Text(
                            "When off, AI prediction and pattern detection are disabled.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = aiEnabled,
                        onCheckedChange = { aiEnabled = it },
                        colors = SwitchDefaults.colors(checkedThumbColor = OnEarth, checkedTrackColor = Earth),
                    )
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { note = "JSON export is prepared on the HerSpace server, which the Android app can't reach yet. $SERVER_NOTE" },
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Filled.Download, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Export my data (JSON)", fontSize = 12.sp, maxLines = 1)
                    }
                    Button(
                        onClick = { note = "Deleting all health data needs the HerSpace server, which the Android app can't reach yet. $SERVER_NOTE" },
                        shape = RoundedCornerShape(50),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.error,
                            contentColor = MaterialTheme.colorScheme.onError,
                        ),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(Icons.Filled.Delete, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Delete all health data", fontSize = 12.sp, maxLines = 1)
                    }
                }
                if (note != null) Helper(note!!)
            }
        }
    }
}
