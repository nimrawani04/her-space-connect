package com.herspace.connect.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.Mentor
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay

/**
 * Android twin of `src/routes/_authenticated/mentorship.tsx`.
 *
 * Mentors are read from Supabase through [ContentViewModel.loadAll]. The
 * "Become a mentor" form keeps the web copy and validation and upserts into
 * `mentors` through [ContentViewModel.becomeMentor]; the local list is only
 * used when that write fails, so the entry is never silently dropped.
 */
@Composable
fun MentorshipScreen(vm: ContentViewModel = viewModel()) {
    val mentors by vm.mentors.collectAsState()
    val msg by vm.msg.collectAsState()

    var loading by remember { mutableStateOf(true) }
    var headline by remember { mutableStateOf("") }
    var expertise by remember { mutableStateOf("") }
    var rate by remember { mutableStateOf("") }
    var bio by remember { mutableStateOf("") }
    var formMsg by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf(false) }
    val localMentors = remember { mutableStateListOf<Mentor>() }

    // Web `sm` breakpoint (640px) — two mentor cards per row.
    val wide = LocalConfiguration.current.screenWidthDp >= 600

    LaunchedEffect(Unit) {
        vm.loadAll()
        // loadAll() has no completion callback: wait for data (or an error) so
        // the spinner doesn't hang forever on an empty table.
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            vm.mentors.value.isEmpty() && vm.msg.value == null
        ) delay(100)
        loading = false
    }

    // Web upserts on conflict of user_id; a failed write is mirrored into this list.
    val shown = localMentors + mentors

    fun listMe() {
        if (headline.length < 5) { // toast.error("Write a headline.")
            formError = true
            formMsg = "Write a headline."
            return
        }
        val headlineValue = headline
        val expertises = expertise.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        val rateValue = rate.trim().toDoubleOrNull()
        val bioValue = bio.ifBlank { null }
        vm.becomeMentor(headlineValue, bioValue, expertises, rateValue) { ok, notice ->
            vm.msg.value = null // consumed here: the header line would repeat it in red
            formError = !ok
            formMsg = notice // toast.error(...) / toast.success("You're listed as a mentor.")
            if (ok) {
                headline = ""; expertise = ""; rate = ""; bio = ""
            } else {
                // Web has no local list — keep the entry only when Supabase refused it.
                localMentors.add(
                    0,
                    Mentor(
                        userId = "local",
                        headline = headlineValue.trim(),
                        bio = bioValue,
                        expertise = expertises,
                        hourlyRate = rateValue
                    )
                )
            }
        }
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp)
    ) {
        item {
            ScreenHeader(
                "04 · Growth",
                "Mentorship",
                "Connect with verified women leaders across engineering, medicine, research, AI, entrepreneurship, design, UPSC, and freelancing."
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

        // ── Become a mentor (web Card, 1/3 column → stacked on phone) ──
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        "Become a mentor",
                        style = MaterialTheme.typography.titleLarge,
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic
                    )
                    Spacer(Modifier.height(12.dp))

                    FieldLabel("Headline")
                    OutlinedTextField(
                        headline, { headline = it }, Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text("Senior PM at Stripe · ex-Google") }
                    )
                    Spacer(Modifier.height(12.dp))

                    FieldLabel("Expertise (comma separated)")
                    OutlinedTextField(
                        expertise, { expertise = it }, Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text("product, AI, careers") }
                    )
                    Spacer(Modifier.height(12.dp))

                    FieldLabel("Hourly rate (optional, USD)")
                    OutlinedTextField(
                        rate, { rate = it }, Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    Spacer(Modifier.height(12.dp))

                    FieldLabel("Bio")
                    OutlinedTextField(bio, { bio = it }, Modifier.fillMaxWidth(), minLines = 4)
                    Spacer(Modifier.height(12.dp))

                    Button(
                        onClick = { listMe() },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(50)
                    ) { Text("List me") }

                    if (formMsg != null) {
                        Text(
                            formMsg!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (formError) MaterialTheme.colorScheme.error
                                    else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp)
                        )
                    }
                }
            }
            Spacer(Modifier.height(24.dp)) // grid gap-6
        }

        // ── Mentor grid (web `sm:grid-cols-2 gap-4`) ──
        if (loading) {
            item { LoadingRow() }
        } else if (shown.isEmpty()) {
            item { EmptyCard("No mentors listed yet. Be the first.") }
        } else if (wide) {
            items(shown.chunked(2)) { pair ->
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    MentorCard(pair[0], Modifier.weight(1f))
                    if (pair.size > 1) MentorCard(pair[1], Modifier.weight(1f))
                    else Spacer(Modifier.weight(1f))
                }
            }
        } else {
            items(shown) { m -> MentorCard(m, Modifier.fillMaxWidth().padding(bottom = 16.dp)) }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurface
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MentorCard(m: Mentor, modifier: Modifier = Modifier) {
    val bio = m.bio
    Card(modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(
                m.headline,
                style = MaterialTheme.typography.titleMedium,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic
            )
            if (!bio.isNullOrBlank()) {
                Text(
                    bio,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 6.dp)
                )
            }
            if (m.expertise.isNotEmpty()) {
                FlowRow(
                    Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) { m.expertise.forEach { TagChip(it) } }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    rateLabel(m.hourlyRate),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                // Web renders this outline button with no handler yet.
                OutlinedButton(onClick = {}, shape = RoundedCornerShape(50)) {
                    Text("Request session", fontSize = 12.sp)
                }
            }
        }
    }
}

/** `$60/hr` / `Free intro` — same copy as the web card footer. */
private fun rateLabel(rate: Double?): String = when {
    rate == null -> "Free intro"
    rate % 1.0 == 0.0 -> "\$${rate.toLong()}/hr"
    else -> "\$${rate}/hr"
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
