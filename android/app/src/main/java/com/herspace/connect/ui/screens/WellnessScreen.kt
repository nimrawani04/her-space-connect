package com.herspace.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.JournalEntry
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/** The web `analyzeJournal` result shape — kept local (see gap note on [submit]). */
private data class LocalInsight(
    val reflection: String,
    val emotionalThemes: List<String>,
    val gentlePrompt: String,
    val copingSuggestions: List<String>,
    val escalationSuggested: Boolean,
    val escalationReason: String?
)

/**
 * Android twin of `src/routes/_authenticated/wellness.tsx`.
 *
 * Entries are read/written through [ContentViewModel] (`journals` /
 * [ContentViewModel.addJournal], which reloads on success) — same
 * `journal_entries` table as web, newest first.
 *
 * GAP (shared files must not be edited): the web "Save & reflect" first calls
 * the `analyzeJournal` server fn and renders the escalation alert + "A gentle
 * mirror" panel from its result, then stores `ai_insight`. [ContentViewModel]
 * exposes no AI method, so this screen saves directly and keeps the full
 * insight UI behind local [LocalInsight] state (null until an AI backend is
 * wired) — no fake reflections are fabricated.
 */
@Composable
fun WellnessScreen(vm: ContentViewModel = viewModel()) {
    val journals by vm.journals.collectAsState()
    val msg by vm.msg.collectAsState()

    var content by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var errorText by remember { mutableStateOf<String?>(null) }
    var insight by remember { mutableStateOf<LocalInsight?>(null) }
    var pendingCount by remember { mutableStateOf(-1) }

    LaunchedEffect(Unit) { vm.loadAll() }

    // addJournal() has no completion callback: wait for the reload (or an
    // error) so "Reflecting…" resolves like the web's awaited submit.
    LaunchedEffect(saving) {
        if (!saving) return@LaunchedEffect
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            journals.size == pendingCount && vm.msg.value == null
        ) delay(100)
        saving = false
    }

    fun submit() {
        if (content.trim().length < 10) { // toast.error(...)
            errorText = "Write at least a sentence or two."
            return
        }
        errorText = null
        insight = null
        saving = true
        pendingCount = journals.size
        // Web: analyze → insert { content, mood, ai_insight }. No AI method on
        // the shared ViewModel, so we insert directly (ai_insight stays null).
        vm.addJournal(content, mood.ifBlank { null })
    }

    // web loads 20 newest entries
    val entries = journals.take(20)
    // web `md:grid-cols-2` (768px): composer left, insights/entries right.
    val wide = LocalConfiguration.current.screenWidthDp >= 768

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp)
    ) {
        item {
            ScreenHeader(
                "09 · Inner life",
                "Mental Wellness",
                "Write to think. The AI listens, never judges, and surfaces gentle insights. Entries are private to you."
            )
            if (msg != null) {
                Text(
                    msg!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error
                )
            }
            Spacer(Modifier.height(16.dp)) // space-y-8 (header already has 16 bottom)
        }

        if (wide) {
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(24.dp) // grid gap-6
                ) {
                    EntryComposer(
                        content = content, onContent = { content = it.take(8000) },
                        mood = mood, onMood = { mood = it.take(40) },
                        saving = saving, errorText = errorText,
                        onSubmit = { submit() },
                        modifier = Modifier.weight(1f)
                    )
                    RightColumn(
                        entries = entries, insight = insight,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
        } else {
            item {
                EntryComposer(
                    content = content, onContent = { content = it.take(8000) },
                    mood = mood, onMood = { mood = it.take(40) },
                    saving = saving, errorText = errorText,
                    onSubmit = { submit() },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(24.dp)) // grid gap-6
            }
            item { RightColumn(entries, insight, Modifier.fillMaxWidth()) }
        }
    }
}

/** Web Card "Tonight's entry" — mood input, textarea, "Save & reflect". */
@Composable
private fun EntryComposer(
    content: String,
    onContent: (String) -> Unit,
    mood: String,
    onMood: (String) -> Unit,
    saving: Boolean,
    errorText: String?,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "Tonight's entry",
                style = MaterialTheme.typography.titleLarge,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic
            )
            Spacer(Modifier.height(12.dp)) // CardContent space-y-3

            FieldLabel("Mood (optional)")
            OutlinedTextField(
                mood, onMood, Modifier.fillMaxWidth(),
                singleLine = true,
                placeholder = { Text("anxious, hopeful, flat…") }
            )
            Spacer(Modifier.height(12.dp))

            FieldLabel("Write freely")
            OutlinedTextField(
                content, onContent, Modifier.fillMaxWidth(),
                minLines = 10, // web <Textarea rows={10}>
                placeholder = { Text("What's been on your mind today?") }
            )
            Spacer(Modifier.height(12.dp))

            Button(
                onClick = onSubmit,
                enabled = !saving,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(50) // rounded-full bg-earth
            ) { Text(if (saving) "Reflecting…" else "Save & reflect") }

            if (errorText != null) {
                Text(
                    errorText,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }
        }
    }
}

/** Right grid column: insight panel (when present) + "Recent entries". */
@Composable
private fun RightColumn(
    entries: List<JournalEntry>,
    insight: LocalInsight?,
    modifier: Modifier = Modifier
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(16.dp)) { // space-y-4
        InsightSection(insight)
        RecentEntries(entries, Modifier.fillMaxWidth())
    }
}

/** Escalation alert + "A gentle mirror" card — same copy as the web. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun InsightSection(insight: LocalInsight?) {
    if (insight == null) return
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (insight.escalationSuggested) {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                )
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp)) {
                    Icon(
                        Icons.Filled.LocalHospital,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text(
                            "Please consider reaching out",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            (insight.escalationReason
                                ?: "What you wrote suggests you could use professional support.") +
                                " If you're in crisis, contact a local helpline or trusted person immediately.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }
        }

        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(
                Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    "A gentle mirror",
                    style = MaterialTheme.typography.titleLarge,
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic
                )
                Text(
                    insight.reflection,
                    style = MaterialTheme.typography.bodyMedium
                )
                if (insight.emotionalThemes.isNotEmpty()) {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) { insight.emotionalThemes.forEach { TagChip(it) } }
                }
                // web: font-serif italic text-lg border-l-2 border-earth pl-4
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                    Box(
                        Modifier
                            .width(2.dp)
                            .fillMaxHeight()
                            .background(HerSpaceColors.Earth)
                    )
                    Text(
                        insight.gentlePrompt,
                        style = MaterialTheme.typography.titleMedium,
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                        fontSize = 18.sp, // web text-lg
                        modifier = Modifier.padding(start = 16.dp)
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    insight.copingSuggestions.forEach { Text("• $it", style = MaterialTheme.typography.bodyMedium) }
                }
            }
        }
    }
}

/** Web Card "Recent entries" — 400px scroll box, empty state, 3-line entries. */
@Composable
private fun RecentEntries(entries: List<JournalEntry>, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "Recent entries",
                style = MaterialTheme.typography.titleLarge,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic
            )
            Spacer(Modifier.height(12.dp))
            if (entries.isEmpty()) {
                Text(
                    "Your journal is empty.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .heightIn(max = 400.dp) // web max-h-[400px] overflow-auto
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) { entries.forEach { JournalEntryRow(it) } }
            }
        }
    }
}

/** One entry: date + mood badge, content clamped to 3 lines. */
@Composable
private fun JournalEntryRow(e: JournalEntry) {
    val entryMood = e.mood
    Box(
        Modifier
            .fillMaxWidth()
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    webDate(e.createdAt),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                if (!entryMood.isNullOrBlank()) TagChip(entryMood)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                e.content,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.9f),
                maxLines = 3, // web line-clamp-3
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

/** `new Date(iso).toLocaleDateString()` for the entry row. */
private fun webDate(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return runCatching {
        LocalDate
            .parse(iso.take(10))
            .format(DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM))
    }.getOrDefault(iso.take(10))
}

/** Web `<Label>` above each field. */
@Composable
private fun FieldLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurface
    )
}

/** shadcn `Badge variant="outline"`. */
@Composable
private fun TagChip(text: String) {
    Box(
        Modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
