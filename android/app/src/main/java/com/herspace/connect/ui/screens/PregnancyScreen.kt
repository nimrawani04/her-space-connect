package com.herspace.connect.ui.screens

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.core.util.CycleMath
import com.herspace.connect.core.util.PregnancyMath
import com.herspace.connect.data.model.*
import com.herspace.connect.data.repository.AuthRepository
import com.herspace.connect.data.repository.HealthRepository
import com.herspace.connect.data.repository.PregnancyRepository
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.PregnancyViewModel
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName
import kotlinx.serialization.json.*
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.time.temporal.ChronoUnit
import java.util.Locale

/**
 * Native twin of `src/routes/_authenticated/pregnancy.tsx` + every component under
 * `src/components/pregnancy/` (Planning, StageSetup, Journey, HealthTracking, KnowledgeHub).
 *
 * All copy, math and empty states match the web screen. Domain maths comes from
 * `PregnancyMath` (port of `src/lib/pregnancy.ts`); the long-form educational content
 * (week-by-week, trimester tables, knowledge hub …) is inlined here 1:1 from that file
 * because no shared Kotlin file may be touched for this port.
 *
 * Known gap vs web: the sixth "Companion" (AI) tab is not ported — it calls the TanStack
 * server function `pregnancyCompanion` (`src/lib/ai.functions.ts`) which has no native
 * counterpart yet (see `android/README.md`, "AI … Native path").
 */
@Composable
fun PregnancyScreen(vm: PregnancyViewModel = viewModel()) {
    val profile by vm.profile.collectAsState()
    val logs by vm.logs.collectAsState()
    val appts by vm.appointments.collectAsState()
    val msg by vm.msg.collectAsState()
    val scope = rememberCoroutineScope()
    val pregnancyRepo = remember { PregnancyRepository() }

    var loading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableStateOf<String?>(null) }

    // Web shows `<Skeleton/>` while `usePregnancyProfile` runs — mirror that first round trip.
    LaunchedEffect(Unit) {
        vm.refresh()
        withTimeoutOrNull(1_500) {
            snapshotFlow {
                vm.profile.value != null || vm.msg.value != null ||
                    vm.logs.value.isNotEmpty() || vm.appointments.value.isNotEmpty()
            }.first { it }
        }
        loading = false
    }

    val ga = remember(profile) { vm.gestational() }
    val isPregnant = profile?.stage == "pregnant"
    val tabKey = selectedTab ?: if (isPregnant) "journey" else "planning"

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
            .padding(bottom = 24.dp)
    ) {
        // ── Header (web <header>) ──
        Row(verticalAlignment = Alignment.Top) {
            Icon(
                Icons.Filled.ChildCare,
                contentDescription = null,
                modifier = Modifier
                    .size(14.dp)
                    .padding(top = 4.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(Modifier.width(6.dp))
            Box(Modifier.weight(1f)) {
                ScreenHeader(
                    kicker = "Women's journey",
                    title = "Pregnancy",
                    subtitle = "Period tracking flows naturally into pregnancy: plan, test, then follow week 1 to 40 with your own health data and an AI companion beside you."
                )
            }
        }

        if (isPregnant && ga != null) {
            val due = profile?.dueDate
            Text(
                buildString {
                    append("You're ${ga.weeks} weeks ${ga.days} days pregnant")
                    if (!due.isNullOrBlank()) append(" · due ${fmtDate(due)}")
                    append(".")
                },
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                fontSize = 20.sp,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        if (!msg.isNullOrBlank()) {
            Text(
                msg!!,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }

        if (loading) {
            LoadingRow()
        } else {
            // ── Tabs (web <TabsList> — scrollable pill row, active = #AFDDFF + black) ──
            Row(
                Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                PREGNANCY_TABS.forEach { tab ->
                    val active = tab.key == tabKey
                    Row(
                        Modifier
                            .clip(RoundedCornerShape(50))
                            .background(if (active) HerSpaceColors.Accent else Color.Transparent)
                            .clickable { selectedTab = tab.key }
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            tab.icon,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            tab.label.uppercase(Locale.getDefault()),
                            fontSize = 12.sp,
                            letterSpacing = 0.4.sp,
                            color = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            when (tabKey) {
                "planning" -> PlanningTab(vm)
                "test" -> TestTab(vm = vm, profile = profile, scope = scope, repo = pregnancyRepo)
                "journey" -> JourneyTab(vm = vm, profile = profile, gaWeeks = ga?.weeks, scope = scope, repo = pregnancyRepo)
                "tracking" -> HealthTab(vm = vm, profile = profile, logs = logs, appts = appts, scope = scope, repo = pregnancyRepo)
                else -> KnowledgeTab()
            }
        }
    }
}

// ───────────────────────────── tab specs ─────────────────────────────

private data class TabSpec(val key: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val PREGNANCY_TABS = listOf(
    TabSpec("planning", "Planning", Icons.Filled.LocalFlorist),
    TabSpec("test", "Test", Icons.Filled.Science),
    TabSpec("journey", "Journey", Icons.Filled.ChildCare),
    TabSpec("tracking", "Health", Icons.Filled.MonitorHeart),
    TabSpec("learn", "Knowledge", Icons.Filled.MenuBook),
)

// ───────────────────────────── Planning (web Planning.tsx) ─────────────────────────────

@Composable
private fun PlanningTab(vm: PregnancyViewModel) {
    val scope = rememberCoroutineScope()
    val healthRepo = remember { HealthRepository() }
    val pregRepo = remember { PregnancyRepository() }

    var rows by remember { mutableStateOf<List<FertilityLog>>(emptyList()) }
    var checklistRows by remember { mutableStateOf<List<PreconceptionItem>>(emptyList()) }
    var lastPeriod by remember { mutableStateOf<String?>(null) }
    var loaded by remember { mutableStateOf(false) }

    // daily fertility log form
    var date by remember { mutableStateOf(todayIso()) }
    var bbt by remember { mutableStateOf("") }
    var mucus by remember { mutableStateOf("") }
    var ovTest by remember { mutableStateOf("not tested") }
    var intercourse by remember { mutableStateOf(false) }
    var notes by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }

    // fertility window inputs
    var cycleLength by remember { mutableStateOf("28") }

    suspend fun loadAll() {
        rows = runCatching { healthRepo.recentFertility(60) }
            .getOrElse { vm.msg.value = it.message; emptyList() }
        lastPeriod = runCatching { healthRepo.recentCycleEntries(1).firstOrNull()?.entryDate }
            .getOrNull()
        checklistRows = runCatching { pregRepo.checklist() }
            .getOrElse { vm.msg.value = it.message; emptyList() }
    }

    LaunchedEffect(Unit) {
        loadAll()
        loaded = true
    }

    // web: useEffect([date, rows]) → hydrate the form for the selected day
    LaunchedEffect(date, rows) {
        val row = rows.firstOrNull { it.logDate == date }
        bbt = row?.bbtCelsius?.toString() ?: ""
        mucus = row?.cervicalMucus ?: ""
        ovTest = row?.ovulationTest ?: "not tested"
        intercourse = row?.intercourse ?: false
        notes = row?.notes ?: ""
    }

    LaunchedEffect(notice) {
        if (notice != null) {
            delay(3000)
            notice = null
        }
    }

    val cycleLen = cycleLength.filter { it.isDigit() }.toIntOrNull()?.coerceIn(20, 45) ?: 28
    val window = lastPeriod?.let { runCatching { CycleMath.fertileWindow(it, cycleLen) }.getOrNull() }
    val chance = window?.let { conceptionChanceToday(it.ovulation, todayIso()) }

    val checked = checklistRows.associate { it.itemKey to it.done }
    val doneCount = PRECONCEPTION_ITEMS.count { checked[it.key] == true }
    val groups = PRECONCEPTION_ITEMS.map { it.group }.distinct()
    val bbtPoints = rows.filter { it.bbtCelsius != null }.take(21).reversed()

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // ── Fertility tracker ──
        PregnancyCard {
            CardTitle("Fertility tracker")

            DateField(label = "Last period started", value = lastPeriod ?: "", onValueChange = { lastPeriod = it.ifBlank { null } })
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = cycleLength,
                onValueChange = { cycleLength = it.filter(Char::isDigit).take(2) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Typical cycle length (days)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )
            Text(
                "Pulled from your Health Hub period log — adjust here to explore.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(Modifier.height(16.dp))

            if (window != null && chance != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatBox("Ovulation", fmtShort(window.ovulation), Modifier.weight(1f))
                    StatBox("Fertile window", "${fmtShort(window.start)} – ${fmtShort(window.end)}", Modifier.weight(1f))
                }
                Spacer(Modifier.height(8.dp))
                PregnancyCard(secondary = true) {
                    Caption("Chance today")
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "${chance.label} · ~${chance.pct}%",
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                        fontSize = 20.sp
                    )
                    LinearProgressIndicator(
                        progress = { (chance.pct * 3 / 100f).coerceIn(0f, 1f) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .padding(top = 8.dp)
                    )
                }
            } else {
                Text(
                    "Add your last period date to see ovulation, fertile window and today's chance of conception.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(20.dp))

            // ── log form ──
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                DateField(label = "Date", value = date, onValueChange = { if (it.isNotBlank()) date = it }, modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = bbt,
                    onValueChange = { bbt = it },
                    modifier = Modifier.weight(1f),
                    label = { Text("BBT (°C)") },
                    placeholder = { Text("36.50") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }

            Spacer(Modifier.height(12.dp))
            Caption("Cervical mucus")
            Spacer(Modifier.height(6.dp))
            ChoiceRow(options = MUCUS_OPTIONS, selected = mucus, onSelect = { mucus = it ?: "" }, capitalize = true)

            Spacer(Modifier.height(12.dp))
            Caption("Ovulation test")
            Spacer(Modifier.height(6.dp))
            ChoiceRow(options = OV_TEST_OPTIONS, selected = ovTest, onSelect = { ovTest = it ?: "not tested" }, allowClear = false)

            Spacer(Modifier.height(12.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Intercourse logged", Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                Switch(checked = intercourse, onCheckedChange = { intercourse = it })
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = notes,
                onValueChange = { if (it.length <= 500) notes = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Notes") },
                minLines = 2,
                maxLines = 4
            )

            Spacer(Modifier.height(16.dp))
            PillButton(
                text = if (saving) "Saving…" else "Save today's fertility log",
                enabled = !saving,
                onClick = {
                    saving = true
                    vm.msg.value = null
                    scope.launch {
                        try {
                            val uid = SupabaseProvider.currentUserId()
                            if (uid == null) {
                                vm.msg.value = "Sign in required"
                            } else {
                                healthRepo.logFertility(
                                    FertilityLog(
                                        userId = uid,
                                        logDate = date,
                                        bbtCelsius = bbt.toDoubleOrNull(),
                                        cervicalMucus = mucus.ifBlank { null },
                                        ovulationTest = ovTest,
                                        intercourse = intercourse,
                                        notes = notes.ifBlank { null }
                                    )
                                )
                                notice = "Fertility log saved."
                                loadAll()
                            }
                        } catch (e: Exception) {
                            vm.msg.value = e.message
                        }
                        saving = false
                    }
                }
            )
            notice?.let { NoticeText(it) }

            Spacer(Modifier.height(20.dp))

            // ── BBT chart + cycle history ──
            Text(
                "BBT chart (last ${bbtPoints.size} readings)",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(Modifier.height(8.dp))
            if (bbtPoints.size >= 2) {
                BbtChart(bbtPoints.map { it.logDate to (it.bbtCelsius ?: 0.0) })
            } else {
                Text(
                    "Log your temperature each morning before getting up — a sustained rise of 0.3–0.5 °C suggests ovulation happened.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(16.dp))
            Text("Cycle history", style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(8.dp))
            when {
                !loaded -> LoadingRow()
                rows.isEmpty() -> EmptyCard("No fertility logs yet.")
                else -> rows.forEach { r ->
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            fmtShort(r.logDate),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.width(64.dp)
                        )
                        if (r.bbtCelsius != null) {
                            Text("${r.bbtCelsius}°C", style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.width(8.dp))
                        }
                        if (!r.cervicalMucus.isNullOrBlank()) {
                            BadgePill(r.cervicalMucus!!)
                            Spacer(Modifier.width(8.dp))
                        }
                        if (r.ovulationTest == "positive") {
                            BadgePill("LH+")
                            Spacer(Modifier.width(8.dp))
                        }
                        if (r.intercourse) Text("💞", style = MaterialTheme.typography.bodySmall)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
                }
            }
        }

        // ── Pre-conception health checklist ──
        PregnancyCard {
            CardTitle("Pre-conception health checklist")
            Text(
                "$doneCount of ${PRECONCEPTION_ITEMS.size} complete",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { doneCount.toFloat() / PRECONCEPTION_ITEMS.size },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
            )

            groups.forEach { group ->
                Spacer(Modifier.height(16.dp))
                Caption(group)
                Spacer(Modifier.height(6.dp))
                PRECONCEPTION_ITEMS.filter { it.group == group }.forEach { item ->
                    val on = checked[item.key] == true
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable {
                                val next = !on
                                checklistRows = checklistRows.map {
                                    if (it.itemKey == item.key) it.copy(done = next) else it
                                }
                                scope.launch {
                                    try {
                                        val uid = SupabaseProvider.currentUserId() ?: return@launch
                                        // `toggleChecklist` flips `done`, so pre-invert the value.
                                        pregRepo.toggleChecklist(
                                            PreconceptionItem(
                                                id = checklistRows.firstOrNull { it.itemKey == item.key }?.id,
                                                userId = uid,
                                                itemKey = item.key,
                                                done = !next
                                            )
                                        )
                                    } catch (e: Exception) {
                                        vm.msg.value = e.message
                                    }
                                }
                            }
                            .padding(vertical = 6.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Checkbox(checked = on, onCheckedChange = null)
                        Spacer(Modifier.width(10.dp))
                        Text(
                            item.label,
                            style = MaterialTheme.typography.bodyMedium,
                            color = if (on) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                            textDecoration = if (on) TextDecoration.LineThrough else null,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }
        }

        // ── Learn ──
        PregnancyCard {
            CardTitle("Learn")
            LEARN_PRECONCEPTION.forEach { item -> AccordionItem(item.title, item.body) }
        }
    }
}

// ───────────────────────────── Test (web StageSetup.tsx) ─────────────────────────────

@Composable
private fun TestTab(vm: PregnancyViewModel, profile: PregnancyProfile?, scope: CoroutineScope, repo: PregnancyRepository) {
    var stageNotice by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf<String?>(null) }

    var lmp by remember(profile) { mutableStateOf(profile?.lmpDate ?: "") }
    var conception by remember(profile) { mutableStateOf(profile?.conceptionDate ?: "") }
    var testDate by remember(profile) { mutableStateOf(profile?.testDate ?: todayIso()) }
    var nextAppt by remember(profile) { mutableStateOf(profile?.nextAppointment ?: "") }

    LaunchedEffect(stageNotice) {
        if (stageNotice != null) {
            delay(3000)
            stageNotice = null
        }
    }

    val stageKey = profile?.stage ?: "planning"
    val derivedDue = when {
        conception.isNotBlank() -> runCatching { PregnancyMath.dueDateFromConception(conception) }.getOrNull()
        lmp.isNotBlank() -> runCatching { PregnancyMath.dueDateFromLmp(lmp) }.getOrNull()
        else -> null
    }
    val ga = if (lmp.isNotBlank()) runCatching { PregnancyMath.gestationalAge(lmp, todayIso()) }.getOrNull() else null

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        PregnancyCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Science, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Box(Modifier.weight(1f)) { CardTitle("Where are you right now?") }
            }
            ChoiceRow(
                options = STAGES.map { it.label },
                selected = STAGES.firstOrNull { it.key == stageKey }?.label,
                onSelect = { picked ->
                    val key = STAGES.firstOrNull { it.label == picked }?.key ?: return@ChoiceRow
                    vm.msg.value = null
                    vm.saveStage(key, profile?.lmpDate, profile?.dueDate)
                    stageNotice = "Journey updated."
                },
                allowClear = false
            )
            Spacer(Modifier.height(8.dp))
            Text(
                STAGES.firstOrNull { it.key == stageKey }?.hint ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            stageNotice?.let { NoticeText(it) }
        }

        PregnancyCard {
            CardTitle("Missed a period? Have you taken a pregnancy test?")

            DateField(label = "Last period started (LMP)", value = lmp, onValueChange = { lmp = it })
            Spacer(Modifier.height(12.dp))
            DateField(label = "Conception date (if known)", value = conception, onValueChange = { conception = it })
            Spacer(Modifier.height(12.dp))
            DateField(label = "Test taken on", value = testDate, onValueChange = { if (it.isNotBlank()) testDate = it })

            if (derivedDue != null) {
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatBox("Weeks pregnant", if (ga != null) "${ga.weeks}w ${ga.days}d" else "—", Modifier.weight(1f))
                    StatBox("Estimated due date", fmtDate(derivedDue), Modifier.weight(1f))
                    StatBox(
                        "Suggested first visit",
                        if (lmp.isNotBlank()) runCatching { fmtDate(PregnancyMath.addDays(lmp, 56)) }.getOrDefault("—") else "—",
                        Modifier.weight(1f)
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.Event,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.width(6.dp))
                Text("Next doctor's visit", style = MaterialTheme.typography.labelLarge)
            }
            Spacer(Modifier.height(6.dp))
            DateField(label = "", value = nextAppt, onValueChange = { nextAppt = it })

            Spacer(Modifier.height(16.dp))
            PillButton(
                text = "Test was positive — start Pregnancy Mode",
                onClick = {
                    if (lmp.isBlank() && conception.isBlank()) {
                        formError = "Add your last period or conception date first."
                        return@PillButton
                    }
                    formError = null
                    vm.msg.value = null
                    persistProfile(scope, repo, vm, profile,
                        patch = {
                            copy(
                                stage = "pregnant",
                                lmpDate = lmp.ifBlank { null },
                                conceptionDate = conception.ifBlank { null },
                                dueDate = derivedDue,
                                testResult = "positive",
                                testDate = testDate,
                                nextAppointment = nextAppt.ifBlank {
                                    if (lmp.isNotBlank()) PregnancyMath.addDays(lmp, 56) else null
                                }
                            )
                        },
                        onSaved = { stageNotice = "Journey updated." }
                    )
                }
            )
            Spacer(Modifier.height(12.dp))
            PillButton(
                text = "Test was negative — keep tracking periods",
                outline = true,
                onClick = {
                    formError = null
                    vm.msg.value = null
                    persistProfile(scope, repo, vm, profile,
                        patch = { copy(stage = "not_pregnant", testResult = "negative", testDate = testDate) },
                        onSaved = { stageNotice = "Journey updated." }
                    )
                }
            )

            formError?.let {
                Spacer(Modifier.height(8.dp))
                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }

            if (profile?.testResult == "negative") {
                Spacer(Modifier.height(16.dp))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                        .padding(14.dp)
                ) {
                    Text("Period tracking continues", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        buildAnnotatedString {
                            append("Your cycle log is untouched. Head back to the ")
                            pushStyle(SpanStyle(textDecoration = TextDecoration.Underline, color = MaterialTheme.colorScheme.primary))
                            append("Health Hub")
                            pop()
                            append(
                                " for predictions, or keep charting BBT in Planning. A negative test taken very early " +
                                    "can turn positive a few days later — retest if your period still hasn't arrived."
                            )
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// ───────────────────────────── Journey (web Journey.tsx) ─────────────────────────────

@Composable
private fun JourneyTab(
    vm: PregnancyViewModel,
    profile: PregnancyProfile?,
    gaWeeks: Int?,
    scope: CoroutineScope,
    repo: PregnancyRepository
) {
    val currentWeek = (gaWeeks ?: 1).coerceIn(1, 40)
    var week by remember { mutableStateOf(currentWeek) }
    LaunchedEffect(currentWeek) { week = currentWeek }

    val info = weekInfo(week)
    val tri = TRIMESTERS.first { it.n == info.trimester }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        PregnancyCard {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.weight(1f)) {
                    CardTitle("Week ${info.week} · ${tri.emoji} ${tri.label}", bottomPadding = 0)
                }
                BadgePill(tri.range)
            }

            Spacer(Modifier.height(16.dp))
            LinearProgressIndicator(
                progress = { info.week / 40f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
            )

            Spacer(Modifier.height(16.dp))
            FlowRowContainer {
                (1..40).forEach { w ->
                    WeekDot(
                        w = w,
                        selected = w == week,
                        current = w == currentWeek,
                        inTrimester = PregnancyMath.trimesterOf(w) == info.trimester,
                        onClick = { week = w }
                    )
                }
            }

            if (info.size != null) {
                Spacer(Modifier.height(16.dp))
                Text(
                    buildAnnotatedString {
                        append("Your baby is about the size of a ")
                        pushStyle(SpanStyle(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium))
                        append(info.size)
                        pop()
                        append(".")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(Modifier.height(16.dp))
            val sections = listOf(
                "Baby development" to info.baby,
                "Your body" to info.mother,
            )
            val lists = listOf(
                "Symptoms you may notice" to info.symptoms,
                "Nutrition focus" to info.nutrition,
                "Exercises" to info.exercise,
                "Medical tests" to info.tests,
                "Do's" to info.dos,
                "Don'ts" to info.donts,
                "Medicines & supplements" to info.meds,
            )

            sections.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { (title, body) -> SectionBox(title, body, Modifier.weight(1f)) }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(12.dp))
            }
            val allLists = lists
            var index = 0
            while (index < allLists.size) {
                val pair = allLists.subList(index, minOf(index + 2, allLists.size))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { (title, items) -> ListSection(title, items, Modifier.weight(1f)) }
                    if (pair.size == 1) Spacer(Modifier.weight(1f))
                }
                index += 2
            }

            Spacer(Modifier.height(8.dp))
            Text(
                MEDICAL_DISCLAIMER,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (info.trimester >= 2) KickCounter(week = info.week)
        if (info.trimester == 3) {
            ContractionTimer()
            BirthPlan(vm = vm, profile = profile, scope = scope, repo = repo)
        }

        PregnancyCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Filled.Warning,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.error
                )
                Spacer(Modifier.width(8.dp))
                Box(Modifier.weight(1f)) { CardTitle("Emergency warning signs") }
            }
            FlowRowContainer {
                LABOR_WARNING_SIGNS.forEach { sign ->
                    Box(
                        Modifier
                            .padding(bottom = 8.dp, end = 8.dp)
                            .border(
                                1.dp,
                                MaterialTheme.colorScheme.error.copy(alpha = 0.3f),
                                RoundedCornerShape(12.dp)
                            )
                            .background(
                                MaterialTheme.colorScheme.error.copy(alpha = 0.05f),
                                RoundedCornerShape(12.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Text(sign, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            Text(
                "Any of these means: contact your maternity unit immediately.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun KickCounter(week: Int) {
    val scope = rememberCoroutineScope()
    val client = SupabaseProvider.client
    var start by remember { mutableStateOf<Long?>(null) }
    var kicks by remember { mutableStateOf(0) }
    var sessions by remember { mutableStateOf<List<KickCount>>(emptyList()) }
    var now by remember { mutableStateOf(System.currentTimeMillis()) }
    var notice by remember { mutableStateOf<String?>(null) }

    suspend fun load() {
        sessions = runCatching {
            client.postgrest["kick_counts"]
                .select { order("started_at", Order.DESCENDING); limit(8) }
                .decodeList<KickCount>()
        }.getOrElse { emptyList() }
    }

    LaunchedEffect(Unit) { load() }
    LaunchedEffect(start) {
        if (start != null) {
            while (true) {
                delay(15_000)
                now = System.currentTimeMillis()
            }
        }
    }
    LaunchedEffect(notice) {
        if (notice != null) {
            delay(3000)
            notice = null
        }
    }

    val runningSince = start

    PregnancyCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.DirectionsWalk, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) { CardTitle("Kick counter") }
        }
        Text(
            "Most clinicians suggest counting 10 movements; many people feel them within two hours. Fewer movements than usual? Call your maternity unit.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(12.dp))

        if (runningSince != null) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Button(
                    onClick = { kicks++ },
                    modifier = Modifier.size(80.dp),
                    shape = RoundedCornerShape(50),
                    contentPadding = PaddingValues(0.dp)
                ) { Text("$kicks", fontSize = 18.sp) }
                Spacer(Modifier.width(12.dp))
                Text(
                    "started ~${(now - runningSince) / 60_000} min ago",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PillButton(
                    text = "Finish & save",
                    outline = true,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        val sessionStart = runningSince
                        scope.launch {
                            try {
                                val uid = SupabaseProvider.currentUserId()
                                if (uid == null) {
                                    notice = "Sign in required"
                                } else {
                                    client.postgrest["kick_counts"].insert(
                                        KickCount(
                                            userId = uid,
                                            startedAt = Instant.ofEpochMilli(sessionStart).toString(),
                                            endedAt = Instant.now().toString(),
                                            kicks = kicks,
                                            week = week
                                        )
                                    )
                                    notice = "Session saved — $kicks movements."
                                    start = null
                                    kicks = 0
                                    load()
                                }
                            } catch (e: Exception) {
                                notice = e.message
                            }
                        }
                    }
                )
                PillButton(
                    text = "Cancel",
                    outline = true,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        start = null
                        kicks = 0
                    }
                )
            }
            notice?.let { NoticeText(it) }
        } else {
            PillButton(text = "Start counting", onClick = {
                start = System.currentTimeMillis()
                kicks = 0
            })
        }

        if (sessions.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            sessions.forEach { s ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        fmtInstant(s.startedAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text("${s.kicks} movements", style = MaterialTheme.typography.bodySmall)
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
private fun ContractionTimer() {
    val scope = rememberCoroutineScope()
    val client = SupabaseProvider.client
    var runningSince by remember { mutableStateOf<Long?>(null) }
    var intensity by remember { mutableStateOf(5f) }
    var rows by remember { mutableStateOf<List<Contraction>>(emptyList()) }

    suspend fun load() {
        rows = runCatching {
            client.postgrest["contractions"]
                .select { order("started_at", Order.DESCENDING); limit(10) }
                .decodeList<Contraction>()
        }.getOrElse { emptyList() }
    }

    LaunchedEffect(Unit) { load() }

    val gaps = rows.take(5).mapIndexedNotNull { i, r ->
        val next = rows.getOrNull(i + 1) ?: return@mapIndexedNotNull null
        val a = parseInstant(r.startedAt) ?: return@mapIndexedNotNull null
        val b = parseInstant(next.startedAt) ?: return@mapIndexedNotNull null
        (ChronoUnit.MINUTES.between(b, a)).toInt()
    }
    val pattern = gaps.takeIf { it.isNotEmpty() }?.let { (it.sum().toDouble() / it.size).toInt() }

    PregnancyCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Timer, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(8.dp))
            Box(Modifier.weight(1f)) { CardTitle("Contraction timer") }
        }

        Text(
            "Intensity (1–10): ${intensity.toInt()}",
            style = MaterialTheme.typography.bodyMedium
        )
        Slider(
            value = intensity,
            onValueChange = { intensity = it },
            valueRange = 1f..10f,
            steps = 8,
            modifier = Modifier.fillMaxWidth()
        )

        val running = runningSince
        if (running != null) {
            PillButton(text = "Stop contraction", onClick = {
                val duration = ((System.currentTimeMillis() - running) / 1000).toInt()
                scope.launch {
                    try {
                        val uid = SupabaseProvider.currentUserId()
                        if (uid != null) {
                            client.postgrest["contractions"].insert(
                                Contraction(
                                    userId = uid,
                                    startedAt = Instant.ofEpochMilli(running).toString(),
                                    durationSeconds = duration,
                                    intensity = intensity.toInt()
                                )
                            )
                            runningSince = null
                            load()
                        }
                    } catch (_: Exception) {
                    }
                }
            })
        } else {
            PillButton(text = "Start contraction", onClick = { runningSince = System.currentTimeMillis() })
        }

        if (pattern != null) {
            Spacer(Modifier.height(12.dp))
            Column(
                Modifier
                    .fillMaxWidth()
                    .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                    .padding(14.dp)
            ) {
                Text("Pattern", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(4.dp))
                Text(
                    "About $pattern minutes apart. Call your maternity unit when contractions are ~5 minutes apart, lasting a minute, for an hour — or sooner if advised.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        if (rows.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            rows.forEach { r ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        fmtTime(r.startedAt),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "${r.durationSeconds}s · intensity ${r.intensity ?: "—"}",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
            }
        }
    }
}

@Composable
private fun BirthPlan(vm: PregnancyViewModel, profile: PregnancyProfile?, scope: CoroutineScope, repo: PregnancyRepository) {
    var text by remember(profile) { mutableStateOf(profile?.birthPlan ?: "") }
    var saving by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(notice) {
        if (notice != null) {
            delay(3000)
            notice = null
        }
    }

    PregnancyCard {
        CardTitle("Birth plan & hospital preparation")
        BIRTH_PLAN_PROMPTS.forEach { prompt ->
            Row {
                Text("•  ", style = MaterialTheme.typography.bodySmall)
                Text(
                    prompt,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f)
                )
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = text,
            onValueChange = { if (it.length <= 5000) text = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Write your preferences here…") },
            minLines = 5,
            maxLines = 8
        )
        Spacer(Modifier.height(12.dp))
        PillButton(
            text = if (saving) "Saving…" else "Save birth plan",
            enabled = !saving,
            onClick = {
                saving = true
                vm.msg.value = null
                persistProfile(scope, repo, vm, profile,
                    patch = { copy(birthPlan = text) },
                    onSaved = {
                        notice = "Birth plan saved."
                        saving = false
                    }
                )
                // persistProfile reports failures through vm.msg; always release the button.
                scope.launch {
                    delay(1500)
                    saving = false
                }
            }
        )
        notice?.let { NoticeText(it) }
    }
}

// ───────────────────────────── Health (web HealthTracking.tsx) ─────────────────────────────

@Serializable
private data class PregnancyRecord(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val title: String,
    @SerialName("record_type") val recordType: String,
    @SerialName("record_date") val recordDate: String,
    val summary: String? = null
)

@Composable
private fun HealthTab(
    vm: PregnancyViewModel,
    profile: PregnancyProfile?,
    logs: List<PregnancyHealthLog>,
    appts: List<PregnancyAppointment>,
    scope: CoroutineScope,
    repo: PregnancyRepository
) {
    val context = LocalContext.current
    val client = SupabaseProvider.client

    var records by remember { mutableStateOf<List<PregnancyRecord>>(emptyList()) }
    var date by remember { mutableStateOf(todayIso()) }

    var weight by remember { mutableStateOf("") }
    var bloodSugar by remember { mutableStateOf("") }
    var bpSys by remember { mutableStateOf("") }
    var bpDia by remember { mutableStateOf("") }
    var water by remember { mutableStateOf("") }
    var sleep by remember { mutableStateOf("") }
    var exercise by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf<String?>(null) }
    var symptoms by remember { mutableStateOf<Map<String, Int>>(emptyMap()) }
    var healthNotes by remember { mutableStateOf("") }

    var savingLog by remember { mutableStateOf(false) }
    var exporting by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<String?>(null) }

    var aTitle by remember { mutableStateOf("") }
    var aDate by remember { mutableStateOf(todayIso()) }
    var aTime by remember { mutableStateOf("") }
    var aKind by remember { mutableStateOf("checkup") }

    var rTitle by remember { mutableStateOf("") }
    var rType by remember { mutableStateOf("lab") }
    var rDate by remember { mutableStateOf(todayIso()) }
    var rSummary by remember { mutableStateOf("") }

    suspend fun loadRecords() {
        records = runCatching {
            client.postgrest["pregnancy_records"]
                .select { order("record_date", Order.DESCENDING); limit(30) }
                .decodeList<PregnancyRecord>()
        }.getOrElse { vm.msg.value = it.message; emptyList() }
    }

    LaunchedEffect(Unit) { loadRecords() }

    // web: useEffect([date, rows]) → hydrate the form from the log saved for that day
    LaunchedEffect(date, logs) {
        val row = logs.firstOrNull { it.logDate == date }
        weight = row?.weightKg?.toString() ?: ""
        bloodSugar = row?.bloodSugar?.toString() ?: ""
        bpSys = row?.bpSystolic?.toString() ?: ""
        bpDia = row?.bpDiastolic?.toString() ?: ""
        water = row?.waterGlasses?.toString() ?: ""
        sleep = row?.sleepHours?.toString() ?: ""
        exercise = row?.exercise ?: ""
        mood = row?.mood
        symptoms = symptomsOf(row?.symptoms)
        healthNotes = row?.notes ?: ""
    }

    LaunchedEffect(notice) {
        if (notice != null) {
            delay(3500)
            notice = null
        }
    }

    val weights = logs.filter { it.weightKg != null }.take(12).reversed()
    val upcoming = appts.none { !it.done && it.apptDate >= todayIso() }
    val highBp = (bpSys.toIntOrNull() ?: 0) >= 140 || (bpDia.toIntOrNull() ?: 0) >= 90

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        // ── Daily health tracking ──
        PregnancyCard {
            CardTitle("Daily health tracking")
            Text(
                "Select any date to export its Monday–Sunday clinician summary.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = {
                    exporting = true
                    vm.msg.value = null
                    scope.launch {
                        try {
                            val sel = runCatching { LocalDate.parse(date) }.getOrElse { LocalDate.now() }
                            val start = sel.minusDays(((sel.dayOfWeek.value + 6) % 7).toLong())
                            val end = start.plusDays(6)
                            val startIso = start.toString()
                            val endIso = end.toString()
                            val weekRows = logs.filter { it.logDate >= startIso && it.logDate <= endIso }
                            if (weekRows.isEmpty()) {
                                vm.msg.value = "Log at least one day in this week before exporting."
                                return@launch
                            }
                            val name = runCatching { AuthRepository().me()?.displayName }
                                .getOrNull()
                                ?.takeIf { it.isNotBlank() } ?: "HerSpace member"
                            val lmp = profile?.lmpDate
                            val age = lmp?.let { PregnancyMath.gestationalAge(it, endIso) }
                            val gaLine = age?.let { "${it.weeks} weeks ${it.days} days gestation at week end" }
                                ?: "Gestational age not set"
                            val lines = reportLines(name, startIso, endIso, gaLine, profile?.dueDate, weekRows)
                            val bytes = buildPdf(paginate(lines))
                            val saved = savePdfToDownloads(context, "herspace-pregnancy-week-$startIso.pdf", bytes)
                            notice = if (saved != null) {
                                "Weekly pregnancy summary downloaded."
                            } else {
                                vm.msg.value = "Could not create the report."
                                null
                            }
                        } catch (e: Exception) {
                            vm.msg.value = e.message ?: "Could not create the report."
                        }
                        exporting = false
                    }
                },
                enabled = !exporting,
                shape = RoundedCornerShape(50)
            ) {
                Icon(
                    Icons.Filled.Download,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp)
                )
                Spacer(Modifier.width(6.dp))
                Text(if (exporting) "Preparing…" else "Weekly PDF")
            }

            Spacer(Modifier.height(16.dp))
            DateField(label = "Date", value = date, onValueChange = { if (it.isNotBlank()) date = it })

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField("Weight (kg)", weight, { weight = it }, Modifier.weight(1f))
                NumberField("Blood sugar (mg/dL)", bloodSugar, { bloodSugar = it }, Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField("BP systolic", bpSys, { bpSys = it }, Modifier.weight(1f))
                NumberField("BP diastolic", bpDia, { bpDia = it }, Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField("Water (glasses)", water, { water = it }, Modifier.weight(1f))
                NumberField("Sleep (hours)", sleep, { sleep = it }, Modifier.weight(1f))
            }
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = exercise,
                onValueChange = { exercise = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Exercise") },
                placeholder = { Text("walk 20 min") },
                singleLine = true
            )

            Spacer(Modifier.height(12.dp))
            Caption("Mood")
            Spacer(Modifier.height(6.dp))
            ChoiceRow(
                options = MOODS,
                selected = mood,
                onSelect = { mood = it },
                capitalize = true
            )

            Spacer(Modifier.height(12.dp))
            Caption("Symptoms and severity")
            Spacer(Modifier.height(6.dp))
            SYMPTOMS.forEach { symptom ->
                val label = symptom.replaceFirstChar { it.uppercaseChar() }
                Row(
                    Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(label, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                    (1..3).forEach { severity ->
                        val on = symptoms[symptom] == severity
                        Spacer(Modifier.width(4.dp))
                        if (on) {
                            Button(
                                onClick = {
                                    symptoms = if (symptoms[symptom] == severity) symptoms - symptom
                                    else symptoms + (symptom to severity)
                                },
                                modifier = Modifier
                                    .height(32.dp)
                                    .width(38.dp),
                                contentPadding = PaddingValues(0.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = HerSpaceColors.Accent,
                                    contentColor = Color.Black
                                )
                            ) { Text("$severity") }
                        } else {
                            OutlinedButton(
                                onClick = { symptoms = symptoms + (symptom to severity) },
                                modifier = Modifier
                                    .height(32.dp)
                                    .width(38.dp),
                                contentPadding = PaddingValues(0.dp)
                            ) { Text("$severity") }
                        }
                    }
                }
            }

            OutlinedTextField(
                value = healthNotes,
                onValueChange = { if (it.length <= 1000) healthNotes = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Notes") },
                minLines = 2,
                maxLines = 4
            )

            Spacer(Modifier.height(16.dp))
            PillButton(
                text = if (savingLog) "Saving…" else "Save entry",
                enabled = !savingLog,
                onClick = {
                    savingLog = true
                    vm.msg.value = null
                    scope.launch {
                        try {
                            val uid = SupabaseProvider.currentUserId()
                            if (uid == null) {
                                vm.msg.value = "Sign in required"
                            } else {
                                val existing = logs.firstOrNull { it.logDate == date }
                                repo.saveHealthLog(
                                    PregnancyHealthLog(
                                        id = existing?.id,
                                        userId = uid,
                                        logDate = date,
                                        weightKg = weight.toDoubleOrNull(),
                                        bpSystolic = bpSys.toIntOrNull(),
                                        bpDiastolic = bpDia.toIntOrNull(),
                                        bloodSugar = bloodSugar.toDoubleOrNull(),
                                        sleepHours = sleep.toDoubleOrNull(),
                                        waterGlasses = water.toIntOrNull(),
                                        exercise = exercise.ifBlank { null },
                                        mood = mood,
                                        symptoms = JsonObject(symptoms.mapValues { JsonPrimitive(it.value) }),
                                        notes = healthNotes.ifBlank { null }
                                    )
                                )
                                notice = "Saved."
                                vm.refresh()
                            }
                        } catch (e: Exception) {
                            vm.msg.value = e.message
                        }
                        savingLog = false
                    }
                }
            )
            notice?.let { NoticeText(it) }

            if (highBp) {
                Spacer(Modifier.height(8.dp))
                Text(
                    "That blood pressure reading is high — please contact your clinician today.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }

            if (weights.size >= 2) {
                Spacer(Modifier.height(16.dp))
                Text("Weight trend", style = MaterialTheme.typography.bodyMedium)
                Spacer(Modifier.height(8.dp))
                val values = weights.mapNotNull { it.weightKg }
                val minV = (values.minOrNull() ?: 0.0) - 1
                val maxV = (values.maxOrNull() ?: 1.0) + 1
                val range = (maxV - minV).takeIf { it > 0 } ?: 1.0
                Row(
                    Modifier
                        .fillMaxWidth()
                        .height(96.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    weights.forEach { w ->
                        val value = w.weightKg ?: minV
                        val fraction = ((value - minV) / range).coerceIn(0.0, 1.0)
                        val barHeight = 6.dp + (90.dp * fraction.toFloat())
                        Box(
                            Modifier
                                .weight(1f)
                                .height(barHeight)
                                .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.7f))
                        )
                    }
                }
            }
        }

        // ── Appointments & medication reminders ──
        PregnancyCard {
            CardTitle("Appointments & medication reminders")

            OutlinedTextField(
                value = aTitle,
                onValueChange = { aTitle = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("e.g. Anomaly scan") },
                singleLine = true
            )
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                DateField(label = "", value = aDate, onValueChange = { if (it.isNotBlank()) aDate = it }, modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = aTime,
                    onValueChange = { aTime = it },
                    modifier = Modifier.weight(1f),
                    label = { Text("Time") },
                    placeholder = { Text("14:30") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                )
            }
            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                DropdownField(
                    options = APPOINTMENT_KINDS,
                    value = aKind,
                    onSelect = { aKind = it },
                    modifier = Modifier.weight(1f)
                )
                Spacer(Modifier.width(8.dp))
                Button(onClick = {
                    if (aTitle.isBlank()) {
                        vm.msg.value = "Give the appointment a name."
                        return@Button
                    }
                    vm.msg.value = null
                    scope.launch {
                        try {
                            val uid = SupabaseProvider.currentUserId()
                            if (uid != null) {
                                repo.saveAppointment(
                                    PregnancyAppointment(
                                        userId = uid,
                                        apptDate = aDate,
                                        apptTime = aTime.ifBlank { null },
                                        title = aTitle.trim(),
                                        kind = aKind
                                    )
                                )
                                aTitle = ""
                                aTime = ""
                                vm.refresh()
                            }
                        } catch (e: Exception) {
                            vm.msg.value = e.message
                        }
                    }
                }, shape = RoundedCornerShape(50)) { Text("Add") }
            }

            Spacer(Modifier.height(12.dp))
            if (upcoming) {
                Text(
                    "Nothing scheduled yet.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            appts.forEach { a ->
                Spacer(Modifier.height(8.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .alpha(if (a.done) 0.6f else 1f)
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BadgePill(a.kind)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        a.title,
                        style = MaterialTheme.typography.bodyMedium,
                        textDecoration = if (a.done) TextDecoration.LineThrough else null,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        fmtDate(a.apptDate) + (a.apptTime?.let { " · $it" } ?: ""),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                repo.saveAppointment(a.copy(done = !a.done))
                                vm.refresh()
                            } catch (e: Exception) {
                                vm.msg.value = e.message
                            }
                        }
                    }) { Text(if (a.done) "Undo" else "Done") }
                    TextButton(onClick = {
                        scope.launch {
                            try {
                                val id = a.id ?: return@launch
                                client.postgrest["pregnancy_appointments"].delete { filter { eq("id", id) } }
                                vm.refresh()
                            } catch (e: Exception) {
                                vm.msg.value = e.message
                            }
                        }
                    }) { Text("Delete") }
                }
            }
        }

        // ── Lab reports & ultrasound records ──
        PregnancyCard {
            CardTitle("Lab reports & ultrasound records")

            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = rTitle,
                    onValueChange = { rTitle = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Title (e.g. Hb 11.2)") },
                    singleLine = true
                )
                Spacer(Modifier.width(8.dp))
                Button(onClick = {
                    if (rTitle.isBlank()) {
                        vm.msg.value = "Give the record a title."
                        return@Button
                    }
                    vm.msg.value = null
                    scope.launch {
                        try {
                            val uid = SupabaseProvider.currentUserId()
                            if (uid != null) {
                                client.postgrest["pregnancy_records"].insert(
                                    PregnancyRecord(
                                        userId = uid,
                                        title = rTitle.trim(),
                                        recordType = rType,
                                        recordDate = rDate,
                                        summary = rSummary.ifBlank { null }
                                    )
                                )
                                rTitle = ""
                                rSummary = ""
                                loadRecords()
                            }
                        } catch (e: Exception) {
                            vm.msg.value = e.message
                        }
                    }
                }, shape = RoundedCornerShape(50)) { Text("Save record") }
            }

            Spacer(Modifier.height(12.dp))
            DropdownField(
                options = RECORD_TYPES,
                value = rType,
                onSelect = { rType = it },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(Modifier.height(12.dp))
            DateField(label = "Record date", value = rDate, onValueChange = { if (it.isNotBlank()) rDate = it })
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = rSummary,
                onValueChange = { if (it.length <= 2000) rSummary = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Summary / findings") },
                minLines = 2,
                maxLines = 4
            )

            Spacer(Modifier.height(12.dp))
            if (records.isEmpty()) {
                EmptyCard("No records saved yet.")
            }
            records.forEach { r ->
                Spacer(Modifier.height(8.dp))
                Column(
                    Modifier
                        .fillMaxWidth()
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            r.title,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f)
                        )
                        Text(
                            fmtDate(r.recordDate),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    BadgePill(r.recordType)
                    if (!r.summary.isNullOrBlank()) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            r.summary,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

// ───────────────────────────── Knowledge (web KnowledgeHub.tsx) ─────────────────────────────

@Composable
private fun KnowledgeTab() {
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf<String?>(null) }

    val term = query.trim().lowercase(Locale.getDefault())
    val sections = KNOWLEDGE_HUB
        .filter { category == null || it.category == category }
        .map { section ->
            section.copy(
                items = section.items.filter {
                    term.isBlank() || it.title.lowercase(Locale.getDefault()).contains(term) ||
                        it.body.lowercase(Locale.getDefault()).contains(term)
                }
            )
        }
        .filter { it.items.isNotEmpty() }

    PregnancyCard {
        CardTitle("Knowledge hub")

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Search topics — iron, preeclampsia, breastfeeding…") },
            singleLine = true,
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) }
        )

        Spacer(Modifier.height(12.dp))
        @OptIn(ExperimentalLayoutApi::class)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            FilterChip(
                selected = category == null,
                onClick = { category = null },
                label = { Text("All") },
                colors = chipColors()
            )
            KNOWLEDGE_HUB.forEach { section ->
                FilterChip(
                    selected = category == section.category,
                    onClick = { category = section.category },
                    label = { Text("${section.emoji} ${section.category}") },
                    colors = chipColors()
                )
            }
        }

        if (sections.isEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text(
                "No topics match \"$query\".",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        sections.forEach { section ->
            Spacer(Modifier.height(16.dp))
            Caption("${section.emoji} ${section.category}")
            section.items.forEach { item -> AccordionItem(item.title, item.body) }
        }

        Spacer(Modifier.height(16.dp))
        Text(
            MEDICAL_DISCLAIMER,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

// ───────────────────────────── shared UI ─────────────────────────────

@Composable
private fun PregnancyCard(secondary: Boolean = false, content: @Composable ColumnScope.() -> Unit) {
    if (secondary) {
        Card(
            Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(Modifier.fillMaxWidth().padding(14.dp), content = content)
        }
    } else {
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth().padding(16.dp), content = content)
        }
    }
}

/** Web card titles are `font-serif italic text-2xl`. */
@Composable
private fun CardTitle(text: String, bottomPadding: Int = 12) {
    Text(
        text,
        fontFamily = FontFamily.Serif,
        fontStyle = FontStyle.Italic,
        fontSize = 22.sp,
        modifier = Modifier.padding(bottom = bottomPadding.dp)
    )
}

@Composable
private fun Caption(text: String) {
    Text(
        text.uppercase(Locale.getDefault()),
        fontSize = 11.sp,
        letterSpacing = 1.5.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
}

/** Web `rounded-2xl border p-4` stat tile. */
@Composable
private fun StatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Box(
        modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .padding(12.dp)
    ) {
        Column {
            Caption(label)
            Spacer(Modifier.height(6.dp))
            Text(
                value,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                fontSize = 19.sp
            )
        }
    }
}

@Composable
private fun SectionBox(title: String, body: String, modifier: Modifier = Modifier) {
    Box(
        modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column {
            Caption(title)
            Spacer(Modifier.height(8.dp))
            Text(body, style = MaterialTheme.typography.bodyMedium, lineHeight = 20.sp)
        }
    }
}

@Composable
private fun ListSection(title: String, items: List<String>, modifier: Modifier = Modifier) {
    Box(
        modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .padding(14.dp)
    ) {
        Column {
            Caption(title)
            Spacer(Modifier.height(8.dp))
            items.forEach { item ->
                Row {
                    Text("•  ", style = MaterialTheme.typography.bodyMedium)
                    Text(
                        item,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        }
    }
}

/** Full-width pill button (`rounded-full`) used all over the web screen. */
@Composable
private fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    outline: Boolean = false
) {
    val shape = RoundedCornerShape(50)
    if (outline) {
        OutlinedButton(
            onClick = onClick,
            modifier = modifier.fillMaxWidth().height(48.dp),
            enabled = enabled,
            shape = shape
        ) { Text(text) }
    } else {
        Button(
            onClick = onClick,
            modifier = modifier.fillMaxWidth().height(48.dp),
            enabled = enabled,
            shape = shape
        ) { Text(text) }
    }
}

/** Native stand-in for `<input type="date">` — text entry plus a Material date picker. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var showPicker by remember { mutableStateOf(false) }
    val labelContent: (@Composable () -> Unit)? = if (label.isBlank()) null else ({ Text(label) })
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = labelContent,
        placeholder = { Text("YYYY-MM-DD") },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        trailingIcon = {
            IconButton(onClick = { showPicker = true }) {
                Icon(Icons.Filled.Event, contentDescription = "Pick a date")
            }
        }
    )
    if (showPicker) {
        val state = rememberDatePickerState(
            initialSelectedDateMillis = isoToMillis(value) ?: isoToMillis(todayIso())
        )
        DatePickerDialog(
            onDismissRequest = { showPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { onValueChange(millisToIso(it)) }
                    showPicker = false
                }) { Text("OK") }
            },
            dismissButton = {
                TextButton(onClick = { showPicker = false }) { Text("Cancel") }
            }
        ) { DatePicker(state = state) }
    }
}

@Composable
private fun NumberField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value = value,
        onValueChange = { onValueChange(it.filter { c -> c.isDigit() || c == '.' }.take(7)) },
        modifier = modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
    )
}

/** Web `<Badge>`-style selectable options (mucus, ovulation test, moods, stages). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ChoiceRow(
    options: List<String>,
    selected: String?,
    onSelect: (String?) -> Unit,
    allowClear: Boolean = true,
    capitalize: Boolean = false
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        options.forEach { option ->
            val on = option == selected
            FilterChip(
                selected = on,
                onClick = { onSelect(if (on && allowClear) null else option) },
                label = {
                    Text(if (capitalize) option.replaceFirstChar { it.uppercaseChar() } else option)
                },
                colors = chipColors()
            )
        }
    }
}

@Composable
private fun chipColors(): SelectableChipColors = FilterChipDefaults.filterChipColors(
    selectedContainerColor = HerSpaceColors.Accent,
    selectedLabelColor = Color.Black,
    selectedLeadingIconColor = Color.Black
)

@Composable
private fun BadgePill(text: String) {
    Box(
        Modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun AccordionItem(title: String, body: String) {
    var open by remember { mutableStateOf(false) }
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable { open = !open }
                .padding(vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(title, Modifier.weight(1f), style = MaterialTheme.typography.titleSmall)
            Icon(
                if (open) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        if (open) {
            Text(
                body,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 12.dp)
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.6f))
    }
}

@Composable
private fun NoticeText(text: String) {
    Spacer(Modifier.height(8.dp))
    Text(text, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FlowRowContainer(content: @Composable androidx.compose.foundation.layout.FlowRowScope.() -> Unit) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
        content = content
    )
}

@Composable
private fun WeekDot(w: Int, selected: Boolean, current: Boolean, inTrimester: Boolean, onClick: () -> Unit) {
    val bg = when {
        selected -> MaterialTheme.colorScheme.primary
        inTrimester -> MaterialTheme.colorScheme.surfaceVariant
        else -> Color.Transparent
    }
    val fg = when {
        selected -> MaterialTheme.colorScheme.onPrimary
        current -> MaterialTheme.colorScheme.primary
        inTrimester -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    Box(
        Modifier
            .size(32.dp)
            .then(
                if (current && !selected) Modifier.border(1.dp, MaterialTheme.colorScheme.primary, CircleShape)
                else Modifier
            )
            .background(bg, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) { Text(w.toString(), fontSize = 12.sp, color = fg) }
}

/** Web `<select>` stand-in for appointment kinds / record types. */
@Composable
private fun DropdownField(
    options: List<Pair<String, String>>,
    value: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth().height(48.dp),
            shape = RoundedCornerShape(4.dp)
        ) {
            Text(
                options.firstOrNull { it.first == value }?.second ?: value,
                Modifier.weight(1f),
                maxLines = 1
            )
            Icon(Icons.Filled.ArrowDropDown, contentDescription = null)
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { (key, text) ->
                DropdownMenuItem(
                    text = { Text(text) },
                    onClick = {
                        onSelect(key)
                        expanded = false
                    }
                )
            }
        }
    }
}

/** Web `BbtChart` — basal body temperature polyline of the last readings. */
@Composable
private fun BbtChart(points: List<Pair<String, Double>>) {
    val primary = MaterialTheme.colorScheme.primary
    val outline = MaterialTheme.colorScheme.outline
    val surface = MaterialTheme.colorScheme.surface
    Box(
        Modifier
            .fillMaxWidth()
            .height(120.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(surface)
            .border(1.dp, outline, RoundedCornerShape(12.dp))
    ) {
        Canvas(
            Modifier
                .fillMaxSize()
                .padding(8.dp)
        ) {
            val values = points.map { it.second }
            val minV = (values.minOrNull() ?: 0.0) - 0.1
            val maxV = (values.maxOrNull() ?: 1.0) + 0.1
            val range = (maxV - minV).takeIf { it > 0 } ?: 1.0
            val stepX = if (points.size > 1) size.width / (points.size - 1) else 0f
            val xs = points.indices.map { i -> i * stepX }
            val ys = points.map { (_, v) ->
                (size.height - ((v - minV) / range) * size.height).toFloat()
            }
            for (i in 1 until points.size) {
                drawLine(
                    color = primary,
                    start = Offset(xs[i - 1], ys[i - 1]),
                    end = Offset(xs[i], ys[i]),
                    strokeWidth = 6f,
                    cap = StrokeCap.Round
                )
            }
            points.indices.forEach { i -> drawCircle(primary, radius = 6f, center = Offset(xs[i], ys[i])) }
        }
    }
}

// ───────────────────────────── profile save helper ─────────────────────────────

/**
 * Web `usePregnancyProfile().save()` — merge a patch into the loaded profile and upsert it.
 * The shared ViewModel only exposes `saveStage(stage, lmp, due)`, so richer patches
 * (test result, conception date, birth plan …) go through the repository directly and then
 * refresh the ViewModel so every screen keeps the same source of truth.
 */
private fun persistProfile(
    scope: CoroutineScope,
    repo: PregnancyRepository,
    vm: PregnancyViewModel,
    current: PregnancyProfile?,
    patch: PregnancyProfile.() -> PregnancyProfile,
    onSaved: () -> Unit = {}
) {
    scope.launch {
        try {
            val uid = SupabaseProvider.currentUserId()
            if (uid == null) {
                vm.msg.value = "Sign in required"
                return@launch
            }
            val base = (current ?: PregnancyProfile(userId = uid)).copy(userId = uid)
            repo.saveProfile(base.patch())
            vm.refresh()
            onSaved()
        } catch (e: Exception) {
            vm.msg.value = e.message
        }
    }
}

// ───────────────────────────── content (1:1 from src/lib/pregnancy.ts) ─────────────────────────────

private val MEDICAL_DISCLAIMER =
    "Educational information only — not a substitute for advice from your doctor or midwife. " +
        "Always confirm anything that concerns you with your clinician."

private data class TrimesterInfo(val n: Int, val label: String, val range: String, val emoji: String)

private val TRIMESTERS = listOf(
    TrimesterInfo(1, "First trimester", "Weeks 1–13", "🌼"),
    TrimesterInfo(2, "Second trimester", "Weeks 14–27", "🌸"),
    TrimesterInfo(3, "Third trimester", "Weeks 28–40", "🌻"),
)

private val BABY: Map<Int, String> = mapOf(
    1 to "Your body is preparing to release an egg — dating starts from your last period.",
    2 to "Ovulation approaches; the uterine lining thickens for a possible implantation.",
    3 to "Fertilisation may occur and the tiny cluster of cells travels to the uterus.",
    4 to "Implantation happens. The embryo starts forming the placenta and yolk sac.",
    5 to "The neural tube (brain and spine) begins to close. The heart tube forms.",
    6 to "A heartbeat can often be detected. Facial features and limb buds appear.",
    7 to "The brain grows rapidly; arm and leg buds lengthen into paddles.",
    8 to "Fingers and toes begin to separate. All major organs are forming.",
    9 to "The embryo becomes a fetus. Tiny muscles allow the first movements.",
    10 to "Vital organs are in place and starting to function. Nails begin to form.",
    11 to "The head is about half the body length; tooth buds and bones harden.",
    12 to "Reflexes develop — your baby can curl fingers and toes.",
    13 to "Vocal cords form and fingerprints appear on tiny fingertips.",
    14 to "Facial muscles work: squinting, frowning and grimacing practice.",
    15 to "Bones harden further; baby can sense light through closed eyelids.",
    16 to "Tiny ears are positioned; baby may begin to hear muffled sounds.",
    17 to "Fat stores begin to develop and the umbilical cord thickens.",
    18 to "Hearing is developing well — talking or reading aloud is lovely bonding.",
    19 to "Vernix caseosa, a protective coating, covers the skin.",
    20 to "Halfway. Your baby swallows amniotic fluid and produces meconium.",
    21 to "Movements become more coordinated; sleep–wake cycles emerge.",
    22 to "Eyebrows and lashes appear; grip strengthens.",
    23 to "Lungs practise breathing movements; hearing sharpens.",
    24 to "Viability milestone; the inner ear controls balance.",
    25 to "Baby responds to your voice and touch on the belly.",
    26 to "Eyes begin to open; lungs make surfactant.",
    27 to "Brain activity increases sharply; baby may hiccup.",
    28 to "Baby dreams (REM sleep) and can blink.",
    29 to "Bones fully developed but soft; muscle and fat build.",
    30 to "Amniotic fluid decreases as baby takes up more room.",
    31 to "All five senses are working; rapid brain growth continues.",
    32 to "Baby often settles head-down; toenails complete.",
    33 to "Skull bones stay soft and separate for birth.",
    34 to "Central nervous system and lungs mature steadily.",
    35 to "Fat rounds out the limbs; kidneys are fully developed.",
    36 to "Baby may drop into the pelvis (lightening).",
    37 to "Early term. Practising sucking, blinking and breathing.",
    38 to "Firm grasp; organs ready for life outside.",
    39 to "Full term. Baby continues adding fat for warmth.",
    40 to "Your due date. Labour can begin any day now."
)

private val MOTHER: Map<Int, String> = mapOf(
    1 to "You are menstruating; nothing has been conceived yet.",
    4 to "You may notice implantation spotting or a missed period.",
    6 to "Nausea, sore breasts and fatigue often peak around now.",
    9 to "Frequent urination and food aversions are common.",
    12 to "Nausea often begins to ease; the uterus rises above the pelvis.",
    14 to "Energy returns for many — the classic 'honeymoon' phase begins.",
    16 to "A small bump is often visible; round ligament twinges start.",
    20 to "Anatomy scan time. You may feel the first flutters (quickening).",
    24 to "Glucose screening window; back ache and leg cramps can appear.",
    28 to "Third trimester begins: heartburn, breathlessness and Braxton Hicks.",
    32 to "Visits become more frequent; swelling in feet and hands is common.",
    36 to "Weekly checks begin; pelvic pressure increases.",
    40 to "Watch for regular contractions, waters breaking or a show."
)

private val T_SYMPTOMS = mapOf(
    1 to listOf("Nausea / morning sickness", "Fatigue", "Breast tenderness", "Food aversions", "Frequent urination", "Mood swings"),
    2 to listOf("Round ligament pain", "Nasal congestion", "Leg cramps", "Skin changes", "Increased appetite", "Backache"),
    3 to listOf("Heartburn", "Braxton Hicks", "Shortness of breath", "Swollen ankles", "Trouble sleeping", "Pelvic pressure")
)

private val T_NUTRITION = mapOf(
    1 to listOf("400–800 mcg folic acid daily", "Small frequent meals for nausea", "Ginger, dry crackers, plenty of fluids", "Avoid raw fish, unpasteurised cheese, alcohol"),
    2 to listOf("Iron-rich foods: lentils, spinach, red meat, fortified cereal", "Calcium + vitamin D for bones", "Protein at every meal", "Fibre and water to ease constipation"),
    3 to listOf("Smaller meals to reduce heartburn", "Omega-3 (DHA) for brain development", "Keep iron and calcium steady", "Limit caffeine and very salty foods")
)

private val T_EXERCISE = mapOf(
    1 to listOf("Walking 20–30 min", "Prenatal yoga", "Pelvic floor (Kegel) exercises", "Rest whenever you need it"),
    2 to listOf("Swimming and water aerobics", "Stationary cycling", "Light strength work", "Stretching for back relief"),
    3 to listOf("Gentle walking", "Birth-ball hip circles", "Pelvic tilts and squats (if cleared)", "Breathing practice for labour")
)

private val T_DOS = mapOf(
    1 to Pair(
        listOf("Book your first antenatal visit", "Take prenatal vitamins", "Sleep as much as you can", "Stay hydrated"),
        listOf("Smoke or drink alcohol", "Take medicines without asking your clinician", "Use hot tubs or saunas", "Handle cat litter")
    ),
    2 to Pair(
        listOf("Attend the anatomy scan", "Start sleeping on your side", "Moisturise your bump", "Plan maternity leave"),
        listOf("Lie flat on your back for long", "Lift heavy objects", "Skip meals", "Ignore severe headaches")
    ),
    3 to Pair(
        listOf("Pack your hospital bag", "Write a birth plan", "Count kicks daily", "Learn labour signs"),
        listOf("Travel far without clinician approval", "Ignore reduced fetal movement", "Stand for very long periods", "Skip your growth scans")
    )
)

private val T_TESTS = mapOf(
    1 to listOf("Confirmation blood test (beta hCG)", "Blood group and Rh factor", "Full blood count, thyroid, sugar", "Dating scan (6–9 weeks)", "NT scan (11–13 weeks)"),
    2 to listOf("Anomaly / anatomy scan (18–22 weeks)", "Glucose tolerance test (24–28 weeks)", "Haemoglobin recheck", "Urine protein at each visit"),
    3 to listOf("Growth scans", "Group B strep swab (35–37 weeks)", "Blood pressure at every visit", "Non-stress test if advised")
)

private val T_MEDS = mapOf(
    1 to listOf("Folic acid 400–800 mcg", "Vitamin D", "Anti-nausea options only if prescribed"),
    2 to listOf("Iron supplement if advised", "Calcium 1000 mg", "Continue folic acid + vitamin D"),
    3 to listOf("Iron and calcium continue", "DHA / omega-3", "Discuss any pain relief with your clinician")
)

private data class WeekInfo(
    val week: Int,
    val trimester: Int,
    val size: String?,
    val baby: String,
    val mother: String,
    val symptoms: List<String>,
    val nutrition: List<String>,
    val exercise: List<String>,
    val dos: List<String>,
    val donts: List<String>,
    val tests: List<String>,
    val meds: List<String>
)

private fun nearestWeekCopy(map: Map<Int, String>, week: Int): String {
    for (w in week downTo 1) map[w]?.let { return it }
    return ""
}

private fun weekInfo(week: Int): WeekInfo {
    val w = week.coerceIn(1, 40)
    val t = PregnancyMath.trimesterOf(w)
    val dos = T_DOS.getValue(t)
    return WeekInfo(
        week = w,
        trimester = t,
        size = PregnancyMath.babySize(w),
        baby = nearestWeekCopy(BABY, w),
        mother = nearestWeekCopy(MOTHER, w),
        symptoms = T_SYMPTOMS.getValue(t),
        nutrition = T_NUTRITION.getValue(t),
        exercise = T_EXERCISE.getValue(t),
        dos = dos.first,
        donts = dos.second,
        tests = T_TESTS.getValue(t),
        meds = T_MEDS.getValue(t)
    )
}

private data class StageSpec(val key: String, val label: String, val hint: String)

private val STAGES = listOf(
    StageSpec("planning", "Planning", "Learning and preparing"),
    StageSpec("trying", "Trying to conceive", "Tracking fertility"),
    StageSpec("pregnant", "Pregnant", "Week-by-week journey"),
    StageSpec("not_pregnant", "Test was negative", "Back to period tracking"),
    StageSpec("postpartum", "Postpartum", "Baby is here")
)

private data class ChecklistSpec(val key: String, val group: String, val label: String)

private val PRECONCEPTION_ITEMS = listOf(
    ChecklistSpec("folic_acid", "Essentials", "Started folic acid (400–800 mcg daily)"),
    ChecklistSpec("bmi", "Essentials", "Healthy BMI discussed with a clinician"),
    ChecklistSpec("preconception_visit", "Essentials", "Booked a pre-conception check-up"),
    ChecklistSpec("vaccines_rubella", "Vaccinations", "Rubella (MMR) immunity confirmed"),
    ChecklistSpec("vaccines_flu", "Vaccinations", "Flu vaccine up to date"),
    ChecklistSpec("vaccines_tdap", "Vaccinations", "Tdap status reviewed"),
    ChecklistSpec("conditions_reviewed", "Medical conditions", "Thyroid / PCOS / diabetes reviewed"),
    ChecklistSpec("meds_reviewed", "Medical conditions", "Current medicines checked for pregnancy safety"),
    ChecklistSpec("dental", "Medical conditions", "Dental check-up done"),
    ChecklistSpec("no_smoking", "Lifestyle", "No smoking or vaping"),
    ChecklistSpec("no_alcohol", "Lifestyle", "Alcohol stopped or reduced"),
    ChecklistSpec("caffeine", "Lifestyle", "Caffeine under 200 mg/day"),
    ChecklistSpec("sleep_stress", "Lifestyle", "Sleep and stress routine in place"),
    ChecklistSpec("partner_semen", "Partner", "Partner: semen analysis discussed"),
    ChecklistSpec("partner_lifestyle", "Partner", "Partner: smoking / alcohol / heat exposure reduced"),
    ChecklistSpec("partner_health", "Partner", "Partner: general health check done")
)

private data class Article(val title: String, val body: String)

private val LEARN_PRECONCEPTION = listOf(
    Article(
        "How pregnancy happens",
        "Each cycle an ovary releases an egg. If sperm meets it within roughly 24 hours in the fallopian tube, fertilisation can happen. The fertilised egg travels to the uterus over 5–6 days and implants in the thickened lining — that implantation is what starts a pregnancy and triggers hCG, the hormone home tests detect."
    ),
    Article(
        "Best time to conceive",
        "The fertile window is the five days before ovulation plus ovulation day itself. Sperm survive up to five days; the egg only about a day. Having sex every 1–2 days across that window gives the highest chance without needing to time it perfectly."
    ),
    Article(
        "Myths vs facts",
        "Myth: you must lie down for 30 minutes after sex. Fact: sperm reach the cervix within minutes. Myth: irregular cycles mean infertility. Fact: they make timing harder, not impossible — tracking helps. Myth: stopping contraception delays fertility for months. Fact: fertility usually returns within one or two cycles for most methods."
    ),
    Article(
        "Fertility tips",
        "Track cycles for 2–3 months before trying, take folic acid at least a month before conception, keep a stable weight, limit alcohol and caffeine, and see a clinician after 12 months of trying (6 months if you are over 35)."
    )
)

private data class KnowledgeSection(val category: String, val emoji: String, val items: List<Article>)

private val KNOWLEDGE_HUB = listOf(
    KnowledgeSection(
        "Before pregnancy", "🌱",
        listOf(
            Article(
                "Fertility",
                "Fertility depends on ovulation, healthy tubes, sperm quality and timing. Age matters, but so do weight, thyroid function, smoking and stress. Charting BBT and cervical mucus for a few cycles gives you and your clinician real data."
            ),
            Article(
                "Ovulation",
                "Ovulation usually happens 12–16 days before your next period, not necessarily on day 14. Signs include egg-white cervical mucus, a mild one-sided twinge, a rise in basal body temperature of 0.3–0.5 °C, and a positive LH test."
            ),
            Article(
                "Nutrition",
                "Focus on folate (leafy greens, lentils), iron, iodine, vitamin D and omega-3. Start folic acid at least one month before trying — it reduces neural tube defects substantially."
            ),
            Article(
                "Lifestyle",
                "Aim for 150 minutes of moderate activity a week, 7–9 hours of sleep, no smoking, minimal alcohol, and caffeine under 200 mg daily. Ask about any long-term medicines before conceiving."
            )
        )
    ),
    KnowledgeSection(
        "During pregnancy", "🤰",
        listOf(
            Article(
                "Baby growth",
                "Organs form in the first trimester, systems mature in the second, and the third is mainly growth, fat and lung maturity. Growth is tracked by fundal height and scans."
            ),
            Article(
                "Mother's body",
                "Blood volume rises by up to 50%, the heart works harder, ligaments loosen, and the uterus grows from pear-sized to watermelon-sized. Most discomforts come from these normal adaptations."
            ),
            Article(
                "Diet",
                "Roughly 340 extra calories a day in the second trimester and 450 in the third. Avoid raw or undercooked meat and eggs, unpasteurised dairy, high-mercury fish, and unwashed produce."
            ),
            Article(
                "Exercise",
                "Most people can safely continue moderate exercise. Avoid contact sports, scuba diving, hot yoga and anything with fall risk. Stop and call your clinician for bleeding, dizziness or contractions."
            ),
            Article(
                "Mental health",
                "Anxiety and mood swings are common. Perinatal depression affects roughly 1 in 7 people — it is treatable. Talk to your clinician if low mood, panic or intrusive thoughts last more than two weeks."
            ),
            Article(
                "Safe medicines",
                "Paracetamol is generally considered safe; ibuprofen usually is not, especially after 20 weeks. Always confirm any medicine, herb or supplement with your clinician or pharmacist."
            ),
            Article(
                "Common discomforts",
                "Nausea, heartburn, constipation, back pain, swelling and insomnia are typical. Small meals, fibre, side-sleeping with a pillow, and gentle movement help most of them."
            )
        )
    ),
    KnowledgeSection(
        "Complications", "⚠️",
        listOf(
            Article(
                "Gestational diabetes",
                "High blood sugar first appearing in pregnancy, usually screened at 24–28 weeks. Often managed with diet and activity; sometimes insulin. Untreated it raises the risk of a large baby and delivery complications."
            ),
            Article(
                "Preeclampsia",
                "High blood pressure plus protein in urine after 20 weeks. Warning signs: severe headache, vision changes, upper abdominal pain, sudden swelling of face or hands. It needs urgent medical review."
            ),
            Article(
                "High blood pressure",
                "Readings at or above 140/90 need monitoring. Keep a home log, reduce salt, rest on your left side and attend every check."
            ),
            Article(
                "Anemia",
                "Low haemoglobin causes fatigue, breathlessness and dizziness. Iron-rich food plus vitamin C helps absorption; supplements are often prescribed."
            ),
            Article(
                "Preterm labour",
                "Regular contractions, low backache, pelvic pressure, fluid leak or bleeding before 37 weeks. Call your maternity unit immediately — early treatment can delay birth and protect the lungs."
            )
        )
    ),
    KnowledgeSection(
        "Labour & delivery", "🩺",
        listOf(
            Article(
                "Signs of labour",
                "Regular strengthening contractions (5 minutes apart for 1 hour), waters breaking, a bloody show, and persistent low back pain. Practice (Braxton Hicks) contractions are irregular and ease with rest."
            ),
            Article(
                "C-section vs vaginal birth",
                "Vaginal birth generally means faster recovery and a shorter stay. A caesarean may be planned or become necessary for position, placenta, distress or stalled labour. Both are safe, supported routes to meeting your baby."
            ),
            Article(
                "Pain management",
                "Options include breathing and movement, water immersion, TENS, nitrous oxide, opioid injections and epidural. Discuss preferences early, and stay flexible."
            ),
            Article(
                "Hospital checklist",
                "ID and notes, comfortable clothes, toiletries, phone and charger, snacks, nursing bra, going-home outfit, nappies, baby clothes, car seat installed."
            )
        )
    ),
    KnowledgeSection(
        "Newborn basics", "👶",
        listOf(
            Article(
                "Breastfeeding",
                "Feed on demand, 8–12 times in 24 hours. A deep latch takes most of the areola, not just the nipple. Wet nappies and steady weight gain are the best signs of enough milk."
            ),
            Article(
                "Baby sleep",
                "Newborns sleep 14–17 hours in short bursts. Always on the back, on a firm flat surface, in your room, with no loose bedding or toys."
            ),
            Article(
                "Vaccinations",
                "Follow your national schedule — typically BCG, hepatitis B and polio at birth, then a series at 6, 10 and 14 weeks. Keep the card safe."
            ),
            Article(
                "First bath",
                "Sponge-bathe until the cord stump falls off (1–3 weeks). Then short baths 2–3 times a week in water around 37 °C, supporting the head at all times."
            ),
            Article(
                "Umbilical cord care",
                "Keep it clean and dry, fold the nappy below it, and let it fall off naturally. Call your clinician for redness spreading to the skin, pus or a foul smell."
            )
        )
    )
)

private val LABOR_WARNING_SIGNS = listOf(
    "Heavy vaginal bleeding",
    "Severe or persistent headache with vision changes",
    "Sudden swelling of face, hands or feet",
    "Baby moving much less than usual",
    "Fluid leaking before 37 weeks",
    "Fever above 38 °C",
    "Severe upper abdominal pain",
    "Painful or burning urination with back pain"
)

private val BIRTH_PLAN_PROMPTS = listOf(
    "Who do you want with you during labour?",
    "Pain relief preferences (and your backup plan)",
    "Positions and movement during labour",
    "Preferences for monitoring and interventions",
    "Skin-to-skin and delayed cord clamping",
    "Feeding plan for the first hours",
    "If a caesarean becomes necessary, what matters most to you?"
)

private val MUCUS_OPTIONS = listOf("dry", "sticky", "creamy", "watery", "egg-white")
private val OV_TEST_OPTIONS = listOf("not tested", "negative", "positive")
private val MOODS = listOf("great", "good", "okay", "low", "anxious", "exhausted")
private val APPOINTMENT_KINDS = listOf(
    "checkup" to "checkup",
    "ultrasound" to "ultrasound",
    "lab" to "lab",
    "medication" to "medication",
    "class" to "class"
)
private val RECORD_TYPES = listOf(
    "lab" to "lab report",
    "ultrasound" to "ultrasound",
    "other" to "other"
)
private val SYMPTOMS = listOf(
    "nausea", "headache", "back pain", "pelvic pain",
    "swelling", "heartburn", "dizziness", "fatigue"
)

// ───────────────────────────── date / math helpers ─────────────────────────────

private fun todayIso(): String = LocalDate.now().toString()

private fun fmtShort(iso: String): String = runCatching {
    LocalDate.parse(iso).format(DateTimeFormatter.ofPattern("d MMM", Locale.getDefault()))
}.getOrDefault(iso)

private fun fmtDate(iso: String): String = runCatching {
    LocalDate.parse(iso).format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
}.getOrDefault(iso)

private fun isoToMillis(iso: String?): Long? = runCatching {
    LocalDate.parse(iso!!).atStartOfDay(ZoneOffset.UTC).toInstant().toEpochMilli()
}.getOrNull()

private fun millisToIso(millis: Long): String =
    Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString()

private fun parseInstant(iso: String): Instant? =
    runCatching { Instant.parse(iso) }.getOrNull()
        ?: runCatching { OffsetDateTime.parse(iso).toInstant() }.getOrNull()
        ?: runCatching { Instant.parse(iso.replace(" ", "T")) }.getOrNull()

private fun fmtInstant(iso: String): String {
    val instant = parseInstant(iso) ?: return iso
    return runCatching {
        instant.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT))
    }.getOrDefault(iso)
}

private fun fmtTime(iso: String): String {
    val instant = parseInstant(iso) ?: return iso
    return runCatching {
        instant.atZone(ZoneId.systemDefault())
            .format(DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT))
    }.getOrDefault(iso)
}

private data class Chance(val pct: Int, val label: String, val daysToOvulation: Int)

/**
 * Port of `conceptionChanceToday()` from `src/lib/pregnancy.ts`:
 * rough day-by-day conception probability relative to the ovulation day.
 */
private fun conceptionChanceToday(ovulation: String, on: String): Chance {
    val daysToOvulation = CycleMath.daysBetween(on, ovulation)
    val pct = when (daysToOvulation) {
        5 -> 10; 4 -> 16; 3 -> 14; 2 -> 27; 1 -> 31; 0 -> 33; -1 -> 12; else -> 1
    }
    val label = when {
        pct >= 25 -> "High"
        pct >= 12 -> "Moderate"
        else -> "Low"
    }
    return Chance(pct, label, daysToOvulation)
}

private fun symptomsOf(element: JsonElement?): Map<String, Int> =
    (element as? JsonObject)
        ?.mapNotNull { (key, value) -> (value as? JsonPrimitive)?.intOrNull?.let { key to it } }
        ?.toMap()
        ?: emptyMap()

// ───────────────────────────── weekly PDF export (web pregnancy-report.ts) ─────────────────────────────

private data class PdfLine(
    val font: String,
    val size: Float,
    val text: String,
    /** When set the line is drawn at this absolute Y instead of flowing. */
    val absY: Float? = null,
    val gap: Float = 5f
)

/** Layout pass — the web report starts at 44pt and keeps ~50pt of bottom margin. */
private fun paginate(lines: List<PdfLine>): List<List<PdfLine>> {
    val pages = mutableListOf<MutableList<PdfLine>>()
    var page = mutableListOf<PdfLine>()
    var y = 748f

    fun newPage() {
        pages.add(page)
        page = mutableListOf()
        y = 748f
    }

    for (line in lines) {
        if (line.absY == null) {
            val advance = line.size + line.gap
            if (y - advance < 62f && page.isNotEmpty()) newPage()
            y -= advance
        }
        page.add(line)
    }
    if (page.isNotEmpty()) pages.add(page)
    if (pages.isEmpty()) pages.add(mutableListOf())
    return pages
}

/** Maps web copy (en dashes, bullets, middle dots …) onto WinAnsi so PDFs keep the glyphs. */
private fun winAnsi(text: String): String = buildString {
    for (ch in text) {
        when (ch) {
            '\u2013' -> append('\u0096')   // –
            '\u2014' -> append('\u0097')   // —
            '\u2022' -> append('\u0095')   // •
            '\u2026' -> append('\u0085')   // …
            '\u2018' -> append('\u0091')
            '\u2019' -> append('\u0092')
            '\u201C' -> append('\u0093')
            '\u201D' -> append('\u0094')
            else -> if (ch.code in 32..255) append(ch) else append('-')
        }
    }
}

private fun pdfEscape(text: String): String =
    winAnsi(text).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

/** Minimal single-font-stack PDF writer (Helvetica / Helvetica-Bold / Courier, letter size). */
private fun buildPdf(pages: List<List<PdfLine>>): ByteArray {
    val out = StringBuilder("%PDF-1.4\n")
    val objectCount = 5 + 2 * pages.size
    val offsets = IntArray(objectCount + 1)

    fun obj(number: Int, body: String) {
        offsets[number] = out.length
        out.append(number).append(" 0 obj\n").append(body).append("\nendobj\n")
    }

    obj(1, "<< /Type /Catalog /Pages 2 0 R >>")
    val kids = (0 until pages.size).joinToString(" ") { "${6 + it * 2} 0 R" }
    obj(2, "<< /Type /Pages /Kids [$kids] /Count ${pages.size} >>")
    obj(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    obj(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    obj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>")

    pages.forEachIndexed { index, page ->
        val pageNumber = 6 + index * 2
        val contentNumber = pageNumber + 1
        obj(
            pageNumber,
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
                "/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> " +
                "/Contents $contentNumber 0 R >>"
        )

        val stream = StringBuilder()
        var y = 748f
        for (line in page) {
            val textY = line.absY ?: run {
                val current = y
                y -= (line.size + line.gap)
                current
            }
            stream
                .append("BT /").append(line.font).append(' ').append(line.size)
                .append(" Tf 44 ").append(textY).append(" Td (")
                .append(pdfEscape(line.text))
                .append(") Tj ET\n")
        }
        val content = stream.toString()
        obj(contentNumber, "<< /Length ${content.length} >>\nstream\n" + content + "endstream")
    }

    val xrefStart = out.length
    out.append("xref\n0 ").append(objectCount + 1).append("\n0000000000 65535 f \n")
    for (number in 1..objectCount) {
        out.append(String.format(Locale.US, "%010d 00000 n \n", offsets[number]))
    }
    out.append("trailer\n<< /Size ").append(objectCount + 1)
        .append(" /Root 1 0 R >>\nstartxref\n").append(xrefStart).append("\n%%EOF\n")

    return out.toString().toByteArray(Charsets.ISO_8859_1)
}

private fun savePdfToDownloads(context: Context, fileName: String, bytes: ByteArray): String? = try {
    if (Build.VERSION.SDK_INT >= 29) {
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
            put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
        }
        val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: return null
        context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) } ?: return null
        "Downloads/$fileName"
    } else {
        val dir = context.getExternalFilesDir(null) ?: context.filesDir
        val file = java.io.File(dir, fileName)
        file.writeBytes(bytes)
        file.absolutePath
    }
} catch (_: Exception) {
    null
}

private fun wrapText(text: String, width: Int): List<String> {
    val words = text.split(" ")
    val lines = mutableListOf<String>()
    val current = StringBuilder()
    for (word in words) {
        if (current.isNotEmpty() && current.length + 1 + word.length > width) {
            lines.add(current.toString())
            current.clear()
        }
        if (current.isNotEmpty()) current.append(' ')
        current.append(word)
    }
    if (current.isNotEmpty()) lines.add(current.toString())
    return lines
}

private fun cell(value: String, width: Int): String = value.padEnd(width).take(width)

private fun numberText(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

private fun averageText(values: List<Double?>, suffix: String): String {
    val present = values.filterNotNull()
    if (present.isEmpty()) return "-"
    val avg = Math.round(present.average() * 10.0) / 10.0
    return numberText(avg) + suffix
}

/**
 * Content of `herspace-pregnancy-week-<start>.pdf` — mirrors
 * `buildPregnancyWeeklyPdf()` in `src/lib/pregnancy-report.ts`.
 */
private fun reportLines(
    patientName: String,
    weekStart: String,
    weekEnd: String,
    gestationalAgeLine: String,
    dueDate: String?,
    rows: List<PregnancyHealthLog>
): List<PdfLine> {
    val out = mutableListOf<PdfLine>()

    out += PdfLine("F2", 17f, "HerSpace · Weekly Pregnancy Summary", gap = 10f)
    out += PdfLine(
        "F1", 9.5f,
        "Prepared for $patientName · ${fmtDate(weekStart)}–${fmtDate(weekEnd)}"
    )
    out += PdfLine(
        "F1", 9.5f,
        gestationalAgeLine + (dueDate?.let { " · Estimated due date ${fmtDate(it)}" } ?: ""),
        gap = 12f
    )

    // ── Clinical overview ──
    out += PdfLine("F2", 12f, "Clinical overview", gap = 8f)
    out += PdfLine(
        "F3", 8f,
        cell("Days logged", 12) + cell("Avg weight", 14) + cell("Avg blood sugar", 18) +
            cell("Avg sleep", 12) + cell("Avg hydration", 14)
    )
    out += PdfLine(
        "F3", 8f,
        cell(rows.size.toString(), 12) +
            cell(averageText(rows.map { it.weightKg }, " kg"), 14) +
            cell(averageText(rows.map { it.bloodSugar }, " mg/dL"), 18) +
            cell(averageText(rows.map { it.sleepHours }, " hr"), 12) +
            cell(averageText(rows.map { it.waterGlasses?.toDouble() }, " glasses"), 14),
        gap = 12f
    )

    // ── Review flags ──
    val highBp = rows.any { (it.bpSystolic ?: 0) >= 140 || (it.bpDiastolic ?: 0) >= 90 }
    val severeSymptoms = rows
        .flatMap { symptomsOf(it.symptoms).entries }
        .filter { it.value >= 3 }
        .map { it.key }
        .distinct()
    if (highBp || severeSymptoms.isNotEmpty()) {
        out += PdfLine("F2", 11f, "Review flags", gap = 7f)
        if (highBp) out += PdfLine("F1", 9.5f, "• At least one blood pressure reading was at or above 140/90.")
        if (severeSymptoms.isNotEmpty()) {
            wrapText("• Severe symptoms logged: ${severeSymptoms.joinToString(", ")}.", 95)
                .forEach { out += PdfLine("F1", 9.5f, it) }
        }
        out += PdfLine("F1", 9.5f, "", gap = 12f)
    }

    // ── Daily vitals and symptoms ──
    out += PdfLine("F2", 11f, "Daily vitals and symptoms", gap = 7f)
    out += PdfLine(
        "F3", 7.5f,
        cell("Date", 14) + cell("Weight", 9) + cell("BP", 8) + cell("Sugar", 8) +
            cell("Sleep", 7) + cell("Symptoms", 40)
    )
    rows.forEach { row ->
        val bp = if (row.bpSystolic != null && row.bpDiastolic != null) {
            "${row.bpSystolic}/${row.bpDiastolic}"
        } else "-"
        val prefix =
            cell(fmtDate(row.logDate), 14) +
                cell(row.weightKg?.let { numberText(it) } ?: "-", 9) +
                cell(bp, 8) +
                cell(row.bloodSugar?.let { numberText(it) } ?: "-", 8) +
                cell(row.sleepHours?.let { numberText(it) } ?: "-", 7)
        val symptomText = symptomsOf(row.symptoms)
            .entries
            .joinToString(", ") { "${it.key} (${it.value}/3)" }
            .ifBlank { "-" }
        if (symptomText.length <= 40) {
            out += PdfLine("F3", 7.5f, prefix + cell(symptomText, 40))
        } else {
            out += PdfLine("F3", 7.5f, prefix + symptomText.take(40))
            var index = 40
            while (index < symptomText.length) {
                out += PdfLine("F3", 7.5f, " ".repeat(46) + symptomText.substring(index, minOf(index + 40, symptomText.length)))
                index += 40
            }
        }
    }
    out += PdfLine("F1", 9f, "", gap = 12f)

    // ── Symptom pattern ──
    val symptomSummary = linkedMapOf<String, Triple<Int, Int, Int>>() // count / total / highest
    rows.forEach { row ->
        symptomsOf(row.symptoms).forEach { (name, severity) ->
            val current = symptomSummary[name] ?: Triple(0, 0, 0)
            symptomSummary[name] = Triple(current.first + 1, current.second + severity, maxOf(current.third, severity))
        }
    }
    if (symptomSummary.isNotEmpty()) {
        out += PdfLine("F2", 11f, "Symptom pattern", gap = 7f)
        out += PdfLine(
            "F3", 8f,
            cell("Symptom", 24) + cell("Days reported", 14) +
                cell("Average severity", 20) + cell("Highest severity", 18)
        )
        symptomSummary.forEach { (name, value) ->
            val avgSeverity = String.format(Locale.US, "%.1f / 3", value.second.toDouble() / value.first)
            out += PdfLine(
                "F3", 8f,
                cell(name, 24) + cell(value.first.toString(), 14) +
                    cell(avgSeverity, 20) + cell("${value.third} / 3", 18)
            )
        }
        out += PdfLine("F1", 9f, "", gap = 12f)
    }

    // ── Context and notes ──
    val noted = rows.filter {
        !it.mood.isNullOrBlank() || !it.exercise.isNullOrBlank() || !it.notes.isNullOrBlank()
    }
    if (noted.isNotEmpty()) {
        out += PdfLine("F2", 11f, "Context and notes", gap = 7f)
        noted.forEach { row ->
            val detail = listOfNotNull(
                row.mood?.takeIf { it.isNotBlank() }?.let { "Mood: $it" },
                row.exercise?.takeIf { it.isNotBlank() }?.let { "Activity: $it" },
                row.notes?.takeIf { it.isNotBlank() }
            ).joinToString(" · ")
            wrapText("${fmtDate(row.logDate)} — $detail", 95).forEach { line ->
                out += PdfLine("F1", 9f, line, gap = 4f)
            }
            out += PdfLine("F1", 9f, "", gap = 6f)
        }
    }

    return out
}
