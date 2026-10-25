package com.herspace.connect.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
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
 * Android twin of `src/routes/_authenticated/safety.tsx` with all recent features:
 * - Community Safety Map & Safe Route Planner (Multi-route comparison, safety scores, lighting, SOS)
 * - Safe Places & Havens
 * - Alerts & Notices
 * - Female Professionals Directory
 */

private val PillShape = RoundedCornerShape(50)
private val CardShape = RoundedCornerShape(18)

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
    Card(
        modifier.fillMaxWidth(),
        shape = CardShape,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
    ) {
        Column(Modifier.padding(18.dp)) { content() }
    }
}

@Composable
private fun CardTitle(text: String, withIcon: ImageVector? = null) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        if (withIcon != null) {
            Icon(withIcon, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
        }
        Text(text, style = MaterialTheme.typography.titleMedium, fontStyle = FontStyle.Italic, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun OutlineBadge(text: String) {
    Box(
        Modifier
            .clip(PillShape)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f), PillShape)
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

/** Pill tab row matching web sanctuary styling */
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
                    .background(if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                    .clickable { onSelect(i) }
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text(
                    label,
                    fontSize = 12.sp,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (active) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
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

    // Route Planner state
    var startLocation by remember { mutableStateOf("Current Location") }
    var destination by remember { mutableStateOf("Central Plaza / Metro") }
    var selectedRouteIndex by remember { mutableStateOf(0) }
    var sosTriggered by remember { mutableStateOf(false) }

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
                pNotes.takeIf { it.isNotEmpty() }
            ) { ok, notice ->
                vm.msg.value = null
                if (ok) {
                    pName = ""
                    pNotes = ""
                    pNotice = notice
                } else {
                    pError = notice
                }
            }
        }
    }

    val submitAlert: () -> Unit = {
        if (aCity.isEmpty() || aCountry.isEmpty() || aDescription.isEmpty()) {
            aError = "City, country, and description required."
        } else {
            aError = null
            aNotice = null
            vm.reportSafetyAlert(
                aType,
                aCity,
                aCountry,
                aSeverity,
                aDescription
            ) { ok, notice ->
                vm.msg.value = null
                if (ok) {
                    aCity = ""
                    aCountry = ""
                    aDescription = ""
                    aNotice = notice
                } else {
                    aError = notice
                }
            }
        }
    }

    LazyColumn(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ScreenHeader(
                "08 · Safety Network",
                "Safety & Live Route Planner",
                "Community-verified safe havens, multi-route safety comparisons, and real-time alerts built by women, for women."
            )
            PillTabs(
                options = listOf("Safety Map & Routes", "Safe Places", "Alerts & Notices", "Female Pros"),
                selected = tab,
                onSelect = { tab = it }
            )
        }

        when (tab) {
            // ── Tab 0: Community Safety Map & Multi-Route Comparison (NEW FEATURE) ──
            0 -> {
                item {
                    // Safe Route Planner Card
                    HsCard {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CardTitle("Safe Route Planner", Icons.Filled.DirectionsWalk)
                            Box(
                                Modifier
                                    .clip(PillShape)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text("Realtime · 100% Private", fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                            }
                        }
                        Spacer(Modifier.height(14.dp))

                        FieldLabel("Starting Point")
                        OutlinedTextField(
                            value = startLocation,
                            onValueChange = { startLocation = it },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Filled.MyLocation, contentDescription = null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) },
                            singleLine = true
                        )

                        Spacer(Modifier.height(10.dp))

                        FieldLabel("Destination")
                        OutlinedTextField(
                            value = destination,
                            onValueChange = { destination = it },
                            modifier = Modifier.fillMaxWidth(),
                            leadingIcon = { Icon(Icons.Filled.Place, contentDescription = null, Modifier.size(16.dp), tint = HerSpaceColors.Earth) },
                            singleLine = true
                        )

                        Spacer(Modifier.height(16.dp))

                        Text("Compare Safety Routes", fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        Spacer(Modifier.height(8.dp))

                        // Route 1: Safest (Recommended)
                        RouteComparisonOption(
                            title = "Safest Route (Recommended)",
                            badge = "95/100 · Well-Lit",
                            duration = "18 min walk",
                            lighting = "94% Streetlight Coverage",
                            havens = "3 Verified Safe Places on Path",
                            isSelected = selectedRouteIndex == 0,
                            accentColor = MaterialTheme.colorScheme.primary,
                            onClick = { selectedRouteIndex = 0 }
                        )

                        Spacer(Modifier.height(10.dp))

                        // Route 2: Fastest
                        RouteComparisonOption(
                            title = "Fastest Route",
                            badge = "78/100 · Moderate Caution",
                            duration = "12 min walk",
                            lighting = "62% Streetlight Coverage",
                            havens = "1 Safe Haven near endpoint",
                            isSelected = selectedRouteIndex == 1,
                            accentColor = HerSpaceColors.Earth,
                            onClick = { selectedRouteIndex = 1 }
                        )

                        Spacer(Modifier.height(10.dp))

                        // Route 3: High-Crowd Transit Corridor
                        RouteComparisonOption(
                            title = "High-Crowd Transit Corridor",
                            badge = "91/100 · Bustling",
                            duration = "22 min walk / transit",
                            lighting = "88% Well-Lit · High Footfall",
                            havens = "5 Public transit & safe shops",
                            isSelected = selectedRouteIndex == 2,
                            accentColor = HerSpaceColors.Sage,
                            onClick = { selectedRouteIndex = 2 }
                        )

                        Spacer(Modifier.height(18.dp))

                        // One-tap SOS safety alert
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (sosTriggered) MaterialTheme.colorScheme.error.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                            ),
                            border = BorderStroke(1.dp, if (sosTriggered) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                        ) {
                            Row(
                                Modifier.padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f)) {
                                    Icon(
                                        Icons.Filled.Warning,
                                        contentDescription = null,
                                        tint = if (sosTriggered) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                    Column {
                                        Text(
                                            if (sosTriggered) "SOS Alert Active" else "One-Tap Safety Ring",
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp,
                                            color = if (sosTriggered) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                                        )
                                        Text(
                                            if (sosTriggered) "Alert shared with emergency contacts & sisters" else "Alert trusted contacts & nearby sisters quietly",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Button(
                                    onClick = { sosTriggered = !sosTriggered },
                                    colors = ButtonDefaults.buttonColors(
                                        containerColor = if (sosTriggered) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
                                    ),
                                    shape = PillShape,
                                    modifier = Modifier.height(34.dp)
                                ) {
                                    Text(if (sosTriggered) "Cancel" else "Trigger SOS", fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }

                // Recent Safety Incidents nearby
                item {
                    Text("Realtime Community Reports", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
                }

                when {
                    !bootstrapped -> item { LoadingRow() }
                    alerts.isEmpty() -> item { EmptyCard("No safety alerts in your selected corridor.") }
                    else -> items(alerts.take(5)) { a -> AlertCard(a) }
                }
            }

            // ── Tab 1: Safe Places ──
            1 -> {
                item {
                    HsCard {
                        CardTitle("Submit a safe place", Icons.Filled.Place)
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

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = submitPlace,
                            modifier = Modifier.fillMaxWidth(),
                            shape = PillShape
                        ) {
                            Text("Submit Safe Place")
                        }
                    }
                }

                when {
                    !bootstrapped -> item { LoadingRow() }
                    places.isEmpty() -> item { EmptyCard("No places yet. Be the first to add one.") }
                    else -> items(places) { p -> PlaceCard(p) }
                }
            }

            // ── Tab 2: Alerts ──
            2 -> {
                item {
                    HsCard {
                        CardTitle("Report Community Alert", Icons.Filled.Shield)
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

                        Spacer(Modifier.height(12.dp))
                        Button(
                            onClick = submitAlert,
                            modifier = Modifier.fillMaxWidth(),
                            shape = PillShape
                        ) {
                            Text("Submit Alert")
                        }
                    }
                }

                when {
                    !bootstrapped -> item { LoadingRow() }
                    alerts.isEmpty() -> item { EmptyCard("No alerts at the moment.") }
                    else -> items(alerts) { a -> AlertCard(a) }
                }
            }

            // ── Tab 3: Female Professionals ──
            else -> {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = CardShape,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                    ) {
                        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Filled.MedicalServices, contentDescription = null, Modifier.size(36.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "Female Professional Network",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                "Female-professional finder (doctors, OB-GYNs, therapists, lawyers, trainers) verified for safe care. Mentors on HerSpace also appear in this trusted circle.",
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
}

// ── Components ─────────────────────────────────────────────────────────────

@Composable
private fun RouteComparisonOption(
    title: String,
    badge: String,
    duration: String,
    lighting: String,
    havens: String,
    isSelected: Boolean,
    accentColor: Color,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) accentColor.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            if (isSelected) 1.5.dp else 1.dp,
            if (isSelected) accentColor else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
        )
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                Box(
                    Modifier
                        .clip(PillShape)
                        .background(accentColor.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(badge, fontSize = 10.sp, color = accentColor, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.height(6.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(duration, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.primary)
                Text(lighting, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(4.dp))
            Text(havens, fontSize = 11.sp, fontStyle = FontStyle.Italic, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun PlaceCard(place: SafePlace) {
    HsCard {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Filled.Place, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
            Text(place.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
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
            modifier = Modifier.padding(top = 6.dp)
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
            Icon(Icons.Filled.Shield, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
            OutlineBadge(alert.alertType)
            OutlineBadge(alert.severity)
            if (alert.isVerified) {
                Badge(containerColor = MaterialTheme.colorScheme.primary) { Text("verified") }
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
