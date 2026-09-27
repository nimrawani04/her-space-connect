package com.herspace.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.SafePlace
import com.herspace.connect.data.model.SafetyAlert
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/**
 * Android twin of `src/routes/_authenticated/safety.tsx` — Safe Places,
 * Alerts and Female Professionals as pill tabs on one scrollable screen.
 */

// ── File-local atoms (private → no cross-file name clashes) ────────────────

private val PillShape = RoundedCornerShape(50)
private val CardShape = RoundedCornerShape(16)

private fun prettyDate(iso: String?): String {
    if (iso.isNullOrBlank()) return iso ?: ""
    val fmt = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
    return runCatching { OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()).format(fmt) }.getOrNull()
        ?: runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).format(fmt) }.getOrNull()
        ?: runCatching { LocalDateTime.parse(iso).format(fmt) }.getOrNull()
        ?: iso
}

@Composable
private fun HsCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(modifier.fillMaxWidth(), shape = CardShape) {
        Column(Modifier.padding(16.dp)) { content() }
    }
}

@Composable
private fun CardTitle(text: String, withIcon: androidx.compose.ui.graphics.vector.ImageVector? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (withIcon != null) {
            Icon(withIcon, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Text(text, style = MaterialTheme.typography.titleMedium, fontStyle = FontStyle.Italic)
    }
}

@Composable
private fun OutlineBadge(text: String) {
    Box(
        Modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, PillShape)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(bottom = 4.dp)
    )
}

/** Pill tab row — active pill uses the web accent (#AFDDFF) with black text. */
@Composable
private fun PillTabs(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEachIndexed { i, label ->
            val active = selected == i
            Box(
                Modifier
                    .clip(PillShape)
                    .background(if (active) HerSpaceColors.Accent else MaterialTheme.colorScheme.surfaceVariant)
                    .clickable { onSelect(i) }
                    .padding(horizontal = 14.dp, vertical = 8.dp)
            ) {
                Text(
                    label,
                    fontSize = 13.sp,
                    color = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectField(
    value: String,
    options: List<String>,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }
    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable)
        )
        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = { onSelected(option); expanded = false }
                )
            }
        }
    }
}

// ── Screen ─────────────────────────────────────────────────────────────────

@Composable
fun SafetyScreen(vm: ContentViewModel = viewModel()) {
    val places by vm.places.collectAsState()
    val alerts by vm.alerts.collectAsState()
    val msg by vm.msg.collectAsState()

    var bootstrapped by remember { mutableStateOf(false) }
    var tab by remember { mutableStateOf(0) }

    // Submit a safe place
    var pName by remember { mutableStateOf("") }
    var pType by remember { mutableStateOf("cafe") }
    var pCity by remember { mutableStateOf("") }
    var pCountry by remember { mutableStateOf("") }
    var pNotes by remember { mutableStateOf("") }
    var pError by remember { mutableStateOf<String?>(null) }
    var pNotice by remember { mutableStateOf<String?>(null) }

    // Report an alert
    var aType by remember { mutableStateOf("unsafe-area") }
    var aCity by remember { mutableStateOf("") }
    var aCountry by remember { mutableStateOf("") }
    var aSeverity by remember { mutableStateOf("moderate") }
    var aDescription by remember { mutableStateOf("") }
    var aError by remember { mutableStateOf<String?>(null) }
    var aNotice by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        vm.loadAll()
        bootstrapped = true
    }

    val submitPlace: () -> Unit = {
        // safety.tsx: `if (!name || !city || !country)` — empty check, raw values inserted.
        if (pName.isEmpty() || pCity.isEmpty() || pCountry.isEmpty()) {
            pError = "Name, city, and country required."
        } else {
            pError = null
            pNotice = null
            vm.addSafePlace(
                pName,
                pType,
                pCity,
                pCountry,
                pNotes.takeIf { it.isNotEmpty() } // web: notes: notes || null
            ) { ok, notice ->
                vm.msg.value = null // consumed here: the card would repeat it
                if (ok) {
                    pName = ""
                    pNotes = ""
                    pNotice = notice // toast.success("Added.")
                } else {
                    pError = notice
                }
            }
        }
    }

    val submitAlert: () -> Unit = {
        // safety.tsx: `if (!city || !country || description.length < 10)` — raw values inserted.
        if (aCity.isEmpty() || aCountry.isEmpty() || aDescription.length < 10) {
            aError = "Add city, country and a clear description."
        } else {
            aError = null
            aNotice = null
            vm.reportSafetyAlert(aType, aCity, aCountry, aSeverity, aDescription) { ok, notice ->
                vm.msg.value = null // consumed here: the card would repeat it
                if (ok) {
                    aDescription = ""
                    aNotice = notice // toast.success("Reported. A moderator will verify.")
                } else {
                    aError = notice
                }
            }
        }
    }

    LazyColumn(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ScreenHeader(
                "07 · Safety",
                "Safety Network",
                "Verified safe places, reviews by women for women, and real-time alerts. For active danger, call your local emergency number first."
            )
        }

        item {
            PillTabs(
                options = listOf("Safe Places", "Alerts", "Female Professionals"),
                selected = tab,
                onSelect = { tab = it }
            )
        }

        when (tab) {
            // ── Safe Places ──
            0 -> {
                item {
                    HsCard {
                        CardTitle("Submit a safe place")
                        Spacer(Modifier.height(12.dp))

                        FieldLabel("Name")
                        OutlinedTextField(
                            pName, { pName = it },
                            Modifier.fillMaxWidth(),
                            singleLine = true
                        )

                        Spacer(Modifier.height(12.dp))
                        FieldLabel("Type")
                        SelectField(
                            value = pType,
                            options = listOf("cafe", "hostel", "library", "gym", "clinic", "coworking"),
                            onSelected = { pType = it },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Column(Modifier.weight(1f)) {
                                FieldLabel("City")
                                OutlinedTextField(
                                    pCity, { pCity = it },
                                    Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                            }
                            Column(Modifier.weight(1f)) {
                                FieldLabel("Country")
                                OutlinedTextField(
                                    pCountry, { pCountry = it },
                                    Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        FieldLabel("Notes")
                        OutlinedTextField(
                            pNotes, { pNotes = it },
                            Modifier.fillMaxWidth(),
                            minLines = 3
                        )

                        pError?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                        pNotice?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                        }
                        msg?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                        }

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = submitPlace,
                            modifier = Modifier.fillMaxWidth(),
                            shape = PillShape
                        ) {
                            Text("Submit")
                        }
                    }
                }

                when {
                    !bootstrapped -> item { LoadingRow() }
                    places.isEmpty() -> item { EmptyCard("No places yet. Be the first to add one.") }
                    else -> items(places) { p -> PlaceCard(p) }
                }
            }

            // ── Alerts ──
            1 -> {
                item {
                    HsCard {
                        CardTitle("Report")
                        Spacer(Modifier.height(12.dp))

                        FieldLabel("Type")
                        SelectField(
                            value = aType,
                            options = listOf("unsafe-area", "harassment", "scam", "stalking", "other"),
                            onSelected = { aType = it },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Column(Modifier.weight(1f)) {
                                FieldLabel("City")
                                OutlinedTextField(
                                    aCity, { aCity = it },
                                    Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                            }
                            Column(Modifier.weight(1f)) {
                                FieldLabel("Country")
                                OutlinedTextField(
                                    aCountry, { aCountry = it },
                                    Modifier.fillMaxWidth(),
                                    singleLine = true
                                )
                            }
                        }

                        Spacer(Modifier.height(12.dp))
                        FieldLabel("Severity")
                        SelectField(
                            value = aSeverity,
                            options = listOf("low", "moderate", "high", "critical"),
                            onSelected = { aSeverity = it },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(Modifier.height(12.dp))
                        FieldLabel("What happened")
                        OutlinedTextField(
                            aDescription,
                            { if (it.length <= 2000) aDescription = it },
                            Modifier.fillMaxWidth(),
                            minLines = 4
                        )

                        aError?.let {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error,
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }
                        aNotice?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                        }
                        msg?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                        }

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = submitAlert,
                            modifier = Modifier.fillMaxWidth(),
                            shape = PillShape
                        ) {
                            Text("Submit report")
                        }
                    }
                }

                when {
                    !bootstrapped -> item { LoadingRow() }
                    alerts.isEmpty() -> item { EmptyCard("No alerts at the moment.") }
                    else -> items(alerts) { a -> AlertCard(a) }
                }
            }

            // ── Female Professionals ──
            else -> {
                item {
                    Card(Modifier.fillMaxWidth(), shape = CardShape) {
                        Text(
                            "Female-professional finder (doctors, lawyers, therapists, trainers) launches next. Add a mentor profile under Mentorship — those will populate this directory.",
                            Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

// ── Cards ──────────────────────────────────────────────────────────────────

@Composable
private fun PlaceCard(place: SafePlace) {
    HsCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Filled.Place, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
            Text(place.name, style = MaterialTheme.typography.titleMedium)
        }
        Spacer(Modifier.height(8.dp))
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlineBadge(place.placeType)
            OutlineBadge("${place.city}, ${place.country}")
        }
        val notes = place.notes
        if (!notes.isNullOrBlank()) {
            Text(
                notes,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
        Text(
            "${place.reviewCount} reviews",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 8.dp)
        )
    }
}

@Composable
private fun AlertCard(alert: SafetyAlert) {
    HsCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Filled.Shield, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary)
            OutlineBadge(alert.alertType)
            OutlineBadge(alert.severity)
            if (alert.isVerified) {
                Badge { Text("verified") }
            } else {
                OutlineBadge("unverified")
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(alert.description, style = MaterialTheme.typography.bodyMedium)
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                prettyDate(alert.createdAt),
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
            Text(
                "${alert.city}, ${alert.country}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
        }
    }
}
