package com.herspace.connect.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Flight
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Place
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.TravelConnection
import com.herspace.connect.data.model.TravelRequest
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
 * Android twin of `src/routes/_authenticated/travel.tsx` + `travel.inbox.tsx`.
 * The inbox is the second section of this screen, opened from the "Your inbox"
 * card (web: separate `/travel/inbox` route).
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

private fun initials(name: String?): String {
    if (name.isNullOrBlank()) return "S"
    return name.trim().split(Regex("\\s+"))
        .mapNotNull { it.firstOrNull() }
        .take(2)
        .joinToString("")
        .uppercase()
        .ifBlank { "S" }
}

private fun contactPlaceholder(type: String): String = when (type) {
    "instagram" -> "@yourhandle"
    "whatsapp", "phone" -> "+91 98xxxxxxxx"
    "email" -> "you@example.com"
    else -> "handle or link"
}

private fun vettingLink(type: String?, handle: String): String? = when {
    type.isNullOrBlank() -> null
    type == "instagram" -> "https://instagram.com/${handle.removePrefix("@")}"
    type == "whatsapp" || type == "phone" ->
        "https://wa.me/${handle.filter { it.isDigit() || it == '+' }.removePrefix("+")}"
    type == "telegram" -> "https://t.me/${handle.removePrefix("@")}"
    type == "email" -> "mailto:$handle"
    handle.startsWith("http://", true) || handle.startsWith("https://", true) -> handle
    else -> null
}

@Composable
private fun HsCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(modifier.fillMaxWidth(), shape = CardShape) {
        Column(Modifier.padding(16.dp)) { content() }
    }
}

@Composable
private fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier,
        style = MaterialTheme.typography.titleLarge,
        fontStyle = FontStyle.Italic
    )
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
private fun SageBadge(text: String) {
    Box(
        Modifier
            .background(HerSpaceColors.Sage, PillShape)
            .padding(horizontal = 10.dp, vertical = 3.dp)
    ) {
        Text(text, fontSize = 11.sp, color = MaterialTheme.colorScheme.background)
    }
}

/** Web's `bg-muted/40 border border-dashed p-3` block. */
@Composable
private fun DashedPanel(filled: Boolean = true, content: @Composable () -> Unit) {
    val outline = MaterialTheme.colorScheme.outline
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .then(if (filled) Modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)) else Modifier)
            .drawBehind {
                val stroke = 1.dp.toPx()
                val inset = stroke / 2f
                val box = Size(size.width - stroke, size.height - stroke)
                drawRoundRect(
                    color = outline,
                    topLeft = Offset(inset, inset),
                    size = box,
                    cornerRadius = CornerRadius(8.dp.toPx()),
                    style = Stroke(width = stroke, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 12f)))
                )
            }
            .padding(12.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) { content() }
}

/** Pill tab row — active pill uses the web accent (#AFDDFF) with black text. */
@Composable
private fun PillTabs(
    options: List<String>,
    selected: Int,
    counts: List<Int> = emptyList(),
    onSelect: (Int) -> Unit
) {
    Row(
        Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEachIndexed { i, label ->
            val active = selected == i
            Row(
                Modifier
                    .clip(PillShape)
                    .background(if (active) HerSpaceColors.Accent else MaterialTheme.colorScheme.surfaceVariant)
                    .clickable { onSelect(i) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    label,
                    fontSize = 13.sp,
                    color = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
                )
                val count = counts.getOrNull(i) ?: 0
                if (count > 0) {
                    Spacer(Modifier.width(6.dp))
                    Box(
                        Modifier
                            .background(
                                if (active) Color.Black.copy(alpha = 0.15f) else MaterialTheme.colorScheme.secondaryContainer,
                                PillShape
                            )
                            .padding(horizontal = 6.dp, vertical = 1.dp)
                    ) {
                        Text(
                            "$count",
                            fontSize = 11.sp,
                            color = if (active) Color.Black else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
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
                DropdownMenuItem(text = { Text(option) }, onClick = { onSelected(option); expanded = false })
            }
        }
    }
}

// ── Local inbox model ──────────────────────────────────────────────────────

/**
 * The web reads `travel_connections` (+ profiles / request contacts) for the
 * inbox. This is the same row set, flattened for the inbox UI: the requester's
 * profile, her post, and the contact released with it.
 */
private data class InboxConn(
    val id: String,
    val requestId: String,
    val fromUser: String,
    val toUser: String,
    val status: String,
    val message: String? = null,
    val createdAt: String? = null,
    val contactType: String? = null,
    val contactHandle: String? = null,
    val requesterName: String? = null,
    val requesterCity: String? = null,
    val requesterCountry: String? = null,
    val post: TravelRequest? = null,
    val postContact: String? = null
)

private data class CityGroup(
    val city: String,
    val country: String,
    val hosts: Int,
    val verified: Boolean
)

// ── Screen ─────────────────────────────────────────────────────────────────

@Composable
fun TravelScreen(vm: ContentViewModel = viewModel()) {
    val requests by vm.requests.collectAsState()
    val hosts by vm.hosts.collectAsState()
    val connections by vm.connections.collectAsState()
    val connectionProfiles by vm.connectionProfiles.collectAsState()
    val connectionRequests by vm.connectionRequests.collectAsState()
    val requestContacts by vm.requestContacts.collectAsState()
    val msg by vm.msg.collectAsState()

    var bootstrapped by remember { mutableStateOf(false) }
    var meId by remember { mutableStateOf<String?>(null) }
    var inboxOpen by remember { mutableStateOf(false) }

    // "Become a local sister" form
    var hostCity by remember { mutableStateOf("") }
    var hostCountry by remember { mutableStateOf("") }
    var hostNote by remember { mutableStateOf("") }
    var hostNotice by remember { mutableStateOf<String?>(null) }
    var hostError by remember { mutableStateOf(false) }
    var hostPending by remember { mutableStateOf(false) }

    // "Post what you need" form
    var reqCity by remember { mutableStateOf("") }
    var reqCountry by remember { mutableStateOf("") }
    var reqNeed by remember { mutableStateOf("") }
    var reqContact by remember { mutableStateOf("") }
    var reqError by remember { mutableStateOf<String?>(null) }
    var reqNotice by remember { mutableStateOf<String?>(null) }
    var postPending by remember { mutableStateOf(false) }

    // Search (web: URL search params; Android: local applied filters)
    var draftCity by remember { mutableStateOf("") }
    var draftCountry by remember { mutableStateOf("") }
    var draftNeed by remember { mutableStateOf("") }
    var filterCity by remember { mutableStateOf("") }
    var filterCountry by remember { mutableStateOf("") }
    var filterNeed by remember { mutableStateOf("") }

    // Dialogs
    var connectFor by remember { mutableStateOf<TravelRequest?>(null) }
    var revealFor by remember { mutableStateOf<TravelRequest?>(null) }
    var revealed by remember { mutableStateOf(setOf<String>()) }
    var removeNotice by remember { mutableStateOf<String?>(null) }

    // Inbox section
    var inboxTab by remember { mutableStateOf(0) }
    var inboxNotice by remember { mutableStateOf<String?>(null) }
    var confirmFor by remember { mutableStateOf<InboxConn?>(null) }
    var confirmAction by remember { mutableStateOf("accepted") }
    var respondPending by remember { mutableStateOf(false) }
    var respondError by remember { mutableStateOf<String?>(null) }
    var inboxRevealFor by remember { mutableStateOf<InboxConn?>(null) }
    var inboxRevealed by remember { mutableStateOf(setOf<String>()) }

    // travel_connections rows I sent or received (+ profiles/requests/contacts)
    val conns = remember(connections, connectionProfiles, connectionRequests, requestContacts, meId) {
        val profileById = connectionProfiles.associateBy { it.id }
        val requestById = connectionRequests.associateBy { it.id }
        val contactByRequest = requestContacts.associate { it.requestId to it.contact }
        connections
            .filter { it.toUser == meId }
            .map { c ->
                val profile = profileById[c.fromUser]
                InboxConn(
                    id = c.id ?: c.requestId,
                    requestId = c.requestId,
                    fromUser = c.fromUser,
                    toUser = c.toUser,
                    status = c.status,
                    message = c.message,
                    createdAt = c.createdAt,
                    contactType = c.contactType,
                    contactHandle = c.contactHandle,
                    requesterName = profile?.displayName,
                    requesterCity = profile?.city,
                    requesterCountry = profile?.country,
                    post = requestById[c.requestId],
                    postContact = contactByRequest[c.requestId]
                )
            }
    }

    // Web connByRequest: prefer the record where I'm the sender for a request.
    val connByRequest = remember(connections, meId) {
        val map = mutableMapOf<String, TravelConnection>()
        connections.forEach { c ->
            val existing = map[c.requestId]
            if (existing == null || c.fromUser == meId) map[c.requestId] = c
        }
        map
    }

    // contactByRequest: hidden contact released with each post (RLS-gated).
    val contactByRequest = remember(requestContacts) {
        requestContacts.associate { it.requestId to it.contact }
    }

    LaunchedEffect(Unit) {
        vm.loadAll()
        vm.loadTravelInbox()
        meId = runCatching { SupabaseProvider.currentUserId() }.getOrNull()
        bootstrapped = true
    }

    val visibleRequests = remember(requests, filterCity, filterCountry, filterNeed) {
        requests.filter { r ->
            (filterCity.isBlank() || r.city.contains(filterCity.trim(), ignoreCase = true)) &&
                (filterCountry.isBlank() || r.country.contains(filterCountry.trim(), ignoreCase = true)) &&
                (filterNeed.isBlank() || r.need.contains(filterNeed.trim(), ignoreCase = true))
        }
    }

    val cityGroups = remember(hosts) {
        hosts
            .groupBy { "${it.city}|${it.country}" }
            .map { (_, list) ->
                CityGroup(
                    city = list.first().city,
                    country = list.first().country,
                    hosts = list.size,
                    verified = list.any { it.verified }
                )
            }
            .sortedByDescending { it.hosts }
    }

    val inboxPendingCount = conns.count { it.toUser == meId && it.status == "pending" }
    val pendingConns = conns.filter { it.status == "pending" }
    val acceptedConns = conns.filter { it.status == "accepted" }
    val declinedConns = conns.filter { it.status == "declined" }

    val submitHost: () -> Unit = {
        if (hostCity.isBlank() || hostCountry.isBlank()) {
            hostError = true
            hostNotice = "City and country required"
        } else if (!hostPending) {
            hostError = false
            hostNotice = null
            hostPending = true
            vm.becomeHost(hostCity.trim(), hostCountry.trim(), hostNote) { ok, notice ->
                hostPending = false
                vm.msg.value = null // consumed here: the card would repeat it
                hostError = !ok
                hostNotice = notice
                if (ok) { // toast.success("You're listed as a local sister")
                    hostCity = ""
                    hostCountry = ""
                    hostNote = ""
                }
            }
        }
    }

    val submitRequest: () -> Unit = {
        when {
            reqCity.isBlank() || reqCountry.isBlank() || reqNeed.isBlank() || reqContact.isBlank() ->
                reqError = "City, country, need and contact are required"
            reqNeed.length > 500 ->
                reqError = "Keep your need under 500 characters"
            reqContact.length > 200 ->
                reqError = "Contact too long"
            postPending -> Unit
            else -> {
                reqError = null
                reqNotice = null
                postPending = true
                vm.postTravelRequest(
                    reqCity.trim(),
                    reqCountry.trim(),
                    reqNeed.trim(),
                    reqContact.trim()
                ) { ok, notice ->
                    postPending = false
                    vm.msg.value = null // consumed here: the card would repeat it
                    if (ok) { // toast.success("Shared — sisters nearby can reach you")
                        reqCity = ""
                        reqCountry = ""
                        reqNeed = ""
                        reqContact = ""
                        reqNotice = notice
                    } else {
                        reqError = notice
                    }
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
        if (!inboxOpen) {
            // ── /travel ──
            item {
                ScreenHeader(
                    "08 · Sisterhood on the road",
                    "Travel Sisterhood",
                    "Women locals across the world. Stranded in a new city? Find a sister, a safe stay, and trusted transport."
                )
            }

            // Trust & safety alert
            item {
                HsCard {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(Icons.Filled.Flight, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Trust & safety", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "Your contact and exact location are never public. Sisters must request to connect — you choose who to trust before any details are exchanged. Start with a call before meeting, and if you're in immediate danger, call local emergency services first.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // "Your inbox" card → opens the inbox section
            item {
                HsCard {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Filled.Inbox, null,
                                Modifier.size(20.dp),
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text("Your inbox", style = MaterialTheme.typography.titleSmall)
                            Text(
                                if (inboxPendingCount > 0)
                                    "$inboxPendingCount sister${if (inboxPendingCount == 1) "" else "s"} waiting for you to review"
                                else
                                    "Review sisters requesting to connect on your posts",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (inboxPendingCount > 0) {
                            Badge { Text("$inboxPendingCount pending") }
                        }
                        OutlinedButton(onClick = { inboxOpen = true }, shape = PillShape) {
                            Text("Open inbox")
                        }
                    }
                }
            }

            // Become a local sister
            item {
                HsCard {
                    CardTitle("Become a local sister")
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        hostCity, { hostCity = it },
                        Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text("City") }
                    )
                    OutlinedTextField(
                        hostCountry, { hostCountry = it },
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        singleLine = true,
                        placeholder = { Text("Country") }
                    )
                    OutlinedTextField(
                        hostNote, { hostNote = it },
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        singleLine = true,
                        placeholder = { Text("A line about how you can help (optional)") }
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = submitHost,
                        enabled = !hostPending,
                        modifier = Modifier.fillMaxWidth(),
                        shape = PillShape
                    ) {
                        Text("List me")
                    }
                    hostNotice?.let {
                        Text(
                            it,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (hostError) MaterialTheme.colorScheme.error
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 6.dp)
                        )
                    }
                }
            }

            // Post what you need
            item {
                HsCard {
                    CardTitle("Post what you need", Icons.Filled.Place)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            reqCity, { reqCity = it },
                            Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("City you're in") }
                        )
                        OutlinedTextField(
                            reqCountry, { reqCountry = it },
                            Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("Country") }
                        )
                    }
                    OutlinedTextField(
                        reqNeed,
                        { if (it.length <= 500) reqNeed = it },
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        minLines = 3,
                        placeholder = {
                            Text("What do you need? (e.g. safe stay for 2 nights, trusted ride from airport, a sister to walk with)")
                        }
                    )
                    OutlinedTextField(
                        reqContact,
                        { if (it.length <= 200) reqContact = it },
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        singleLine = true,
                        placeholder = {
                            Text("Contact for accepted sisters only (WhatsApp, Signal, IG). Hidden until you accept a request.")
                        }
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = submitRequest,
                        enabled = !postPending,
                        modifier = Modifier.fillMaxWidth(),
                        shape = PillShape
                    ) {
                        Text("Post to the sisterhood")
                    }
                    Text(
                        "Posts are visible to every signed-in woman on HerSpace — that's \"the sisterhood\". Your contact stays hidden; sisters send a connection request with their Insta/WhatsApp so you can vet them, then you choose who to trust.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    reqError?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
                    }
                    reqNotice?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                    }
                    msg?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                    }
                }
            }

            // Sisters reaching out now
            item { SectionTitle("Sisters reaching out now") }

            item {
                HsCard {
                    CardTitle("Find sisters near you", Icons.Filled.Search)
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            draftCity, { draftCity = it },
                            Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("City") }
                        )
                        OutlinedTextField(
                            draftCountry, { draftCountry = it },
                            Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("Country") }
                        )
                    }
                    OutlinedTextField(
                        draftNeed, { draftNeed = it },
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        singleLine = true,
                        placeholder = { Text("Search need (e.g. stay, ride, walk)") }
                    )
                    Row(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = {
                                filterCity = draftCity
                                filterCountry = draftCountry
                                filterNeed = draftNeed
                            },
                            modifier = Modifier.weight(1f),
                            shape = PillShape
                        ) {
                            Icon(Icons.Filled.Search, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Search")
                        }
                        IconButton(
                            onClick = {
                                draftCity = ""
                                draftCountry = ""
                                draftNeed = ""
                                filterCity = ""
                                filterCountry = ""
                                filterNeed = ""
                            }
                        ) {
                            Icon(Icons.Filled.Close, "Clear", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            if (visibleRequests.isEmpty()) {
                item {
                    Text(
                        "No matching requests. Try widening your filters or be the first to share.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                item {
                    Text(
                        "${visibleRequests.size} sister${if (visibleRequests.size == 1) "" else "s"} found",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                items(visibleRequests) { r ->
                    // Connection state + the (RLS-released) contact both come from
                    // travel_connections / travel_request_contacts, like the web.
                    RequestCard(
                        request = r,
                        mine = meId != null && meId == r.userId,
                        connStatus = r.id?.let { connByRequest[it] }?.status,
                        revealed = r.id != null && revealed.contains(r.id!!),
                        contact = r.id?.let { contactByRequest[it] },
                        onConnect = { connectFor = r },
                        onReveal = { revealFor = r },
                        onRemove = {
                            val id = r.id
                            if (id != null) {
                                vm.removeTravelRequest(id) { ok, notice ->
                                    vm.msg.value = null
                                    removeNotice = if (ok) null else notice
                                }
                            }
                        }
                    )
                }
                removeNotice?.let { notice ->
                    item {
                        Text(
                            notice,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Local sister (host) cities
            when {
                !bootstrapped -> item { LoadingRow() }
                cityGroups.isEmpty() -> item {
                    Text(
                        "No hosts yet — be the first to list your city.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                else -> items(cityGroups) { c -> HostCard(c) }
            }
        } else {
            // ── /travel/inbox ──
            item {
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            "Travel Sisterhood",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Filled.Inbox, null, Modifier.size(28.dp))
                            Text("Inbox", style = MaterialTheme.typography.headlineMedium, fontStyle = FontStyle.Italic)
                        }
                    }
                    TextButton(onClick = { inboxOpen = false }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack, null,
                            Modifier.size(16.dp)
                        )
                        Spacer(Modifier.width(4.dp))
                        Text("Back")
                    }
                }
            }

            item {
                HsCard {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Icon(
                            Icons.Filled.VerifiedUser, null,
                            Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.primary
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("You're in control", style = MaterialTheme.typography.titleSmall)
                            Text(
                                "Every sister who wants to reach you shows up here. Accept only the ones you trust — your contact stays hidden until you do.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    PillTabs(
                        options = listOf("Pending", "Accepted", "Declined"),
                        selected = inboxTab,
                        counts = listOf(pendingConns.size, acceptedConns.size, declinedConns.size),
                        onSelect = { inboxTab = it }
                    )
                    inboxNotice?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            when (inboxTab) {
                0 -> {
                    when {
                        !bootstrapped -> item { LoadingRow() }
                        pendingConns.isEmpty() -> item {
                            EmptyCard("No pending requests. When a sister asks to connect, she'll appear here.")
                        }
                        else -> items(pendingConns, key = { it.id ?: it.requestId }) { c ->
                            InboxRow(
                                c = c,
                                revealed = c.id in inboxRevealed,
                                onAccept = {
                                    confirmFor = c
                                    confirmAction = "accepted"
                                    respondError = null
                                },
                                onDecline = {
                                    confirmFor = c
                                    confirmAction = "declined"
                                    respondError = null
                                },
                                onReveal = { inboxRevealFor = c }
                            )
                        }
                    }
                }
                1 -> {
                    if (acceptedConns.isEmpty()) {
                        item { EmptyCard("No accepted connections yet.") }
                    } else {
                        items(acceptedConns, key = { it.id ?: it.requestId }) { c ->
                            InboxRow(
                                c = c,
                                revealed = c.id in inboxRevealed,
                                onAccept = {
                                    confirmFor = c
                                    confirmAction = "accepted"
                                    respondError = null
                                },
                                onDecline = {
                                    confirmFor = c
                                    confirmAction = "declined"
                                    respondError = null
                                },
                                onReveal = { inboxRevealFor = c }
                            )
                        }
                    }
                }
                else -> {
                    if (declinedConns.isEmpty()) {
                        item { EmptyCard("No declined requests.") }
                    } else {
                        items(declinedConns, key = { it.id ?: it.requestId }) { c ->
                            InboxRow(
                                c = c,
                                revealed = c.id in inboxRevealed,
                                onAccept = {
                                    confirmFor = c
                                    confirmAction = "accepted"
                                    respondError = null
                                },
                                onDecline = {
                                    confirmFor = c
                                    confirmAction = "declined"
                                    respondError = null
                                },
                                onReveal = { inboxRevealFor = c }
                            )
                        }
                    }
                }
            }
        }
    }

    // ── Dialogs ──
    connectFor?.let { request ->
        ConnectDialog(
            request = request,
            vm = vm,
            onDismiss = { connectFor = null },
            onSent = { connectFor = null }
        )
    }
    revealFor?.let { request ->
        RevealDialog(
            request = request,
            onDismiss = { revealFor = null },
            onReveal = {
                request.id?.let { id -> revealed = revealed + id }
                revealFor = null
            }
        )
    }
    confirmFor?.let { conn ->
        ConfirmRespondDialog(
            conn = conn,
            action = confirmAction,
            pending = respondPending,
            error = respondError,
            onDismiss = { confirmFor = null },
            onConfirm = {
                if (!respondPending) {
                    respondPending = true
                    respondError = null
                    vm.respondTravelConnection(conn.id, confirmAction) { ok, notice ->
                        respondPending = false
                        vm.msg.value = null // consumed here
                        if (ok) {
                            inboxNotice = notice // "Contact shared — talk safe." / "Declined."
                            confirmFor = null
                        } else {
                            respondError = notice // web keeps the dialog open and toasts
                        }
                    }
                }
            }
        )
    }
    inboxRevealFor?.let { conn ->
        InboxRevealDialog(
            onDismiss = { inboxRevealFor = null },
            onReveal = {
                inboxRevealed = inboxRevealed + conn.id
                inboxRevealFor = null
            }
        )
    }
}

// ── Request card (web: request grid card) ──────────────────────────────────

@Composable
private fun RequestCard(
    request: TravelRequest,
    mine: Boolean,
    connStatus: String?,
    revealed: Boolean,
    contact: String?,
    onConnect: () -> Unit,
    onReveal: () -> Unit,
    onRemove: () -> Unit
) {
    val accepted = mine || connStatus == "accepted"
    val pending = !mine && connStatus == "pending"
    val declined = !mine && connStatus == "declined"

    HsCard {
        CardTitle("${request.city}, ${request.country}", withIcon = Icons.Filled.Place)
        Spacer(Modifier.height(8.dp))
        Text(request.need, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(10.dp))

        when {
            accepted && (mine || revealed) -> {
                Text(
                    "Reach her",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(contact ?: "Hidden", style = MaterialTheme.typography.titleSmall)
                if (!mine) {
                    Text(
                        "Start with a voice or video call before meeting. Never share your home address.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            accepted -> {
                DashedPanel {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.Lock, null,
                            Modifier.size(14.dp).padding(top = 2.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "She accepted your request. Her contact is hidden until you confirm you're ready to reach out safely.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            OutlinedButton(onClick = onReveal, shape = PillShape) {
                                Icon(Icons.Filled.Visibility, null, Modifier.size(14.dp))
                                Spacer(Modifier.width(6.dp))
                                Text("Reveal contact")
                            }
                        }
                    }
                }
            }
            else -> {
                DashedPanel {
                    Row(
                        verticalAlignment = Alignment.Top,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            Icons.Filled.Lock, null,
                            Modifier.size(14.dp).padding(top = 2.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Contact is hidden. " + when {
                                    pending -> "Your request is pending."
                                    declined -> "Your request was declined."
                                    else -> "Send a note to ask her to connect — she'll decide whether to share her contact."
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (!pending && !declined) {
                                OutlinedButton(onClick = onConnect, shape = PillShape) {
                                    Icon(Icons.Filled.Forum, null, Modifier.size(14.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Request to connect")
                                }
                            }
                            if (pending) OutlineBadge("Pending")
                            if (declined) OutlineBadge("Declined")
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(8.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                prettyDate(request.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (mine) {
                TextButton(onClick = onRemove) { Text("Remove") }
            }
        }
    }
}

// ── Host city card ─────────────────────────────────────────────────────────

@Composable
private fun HostCard(group: CityGroup) {
    HsCard {
        Text(
            "${group.city}, ${group.country}",
            style = MaterialTheme.typography.titleMedium,
            fontStyle = FontStyle.Italic
        )
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlineBadge("${group.hosts} hosts")
            if (group.verified) SageBadge("verified")
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth(), shape = PillShape) {
            Text("View sisters")
        }
    }
}

// ── Inbox row (web: Row in travel.inbox.tsx) ───────────────────────────────

@Composable
private fun InboxRow(
    c: InboxConn,
    revealed: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onReveal: () -> Unit
) {
    val post = c.post
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        initials(c.requesterName),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            c.requesterName ?: "A sister",
                            style = MaterialTheme.typography.titleSmall,
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            prettyDate(c.createdAt),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    val loc = listOfNotNull(c.requesterCity, c.requesterCountry)
                        .joinToString(", ")
                        .ifBlank { null }
                    if (loc != null) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Icon(
                                Icons.Filled.Place, null,
                                Modifier.size(12.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                loc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    if (post != null) {
                        val need = post.need.let { if (it.length > 80) "${it.take(80)}…" else it }
                        Text(
                            "On your post · ${post.city}, ${post.country} — $need",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
            }

            val message = c.message
            if (!message.isNullOrBlank()) {
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                    Box(
                        Modifier
                            .width(2.dp)
                            .fillMaxHeight()
                            .background(HerSpaceColors.Earth)
                    )
                    Text(
                        "\"$message\"",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(start = 12.dp)
                    )
                }
            }

            if (c.status == "pending" || c.status == "accepted") {
                VetBlock(c)
            }

            if (c.status == "pending") {
                Text(
                    "Accepting shares her contact with you and yours with her. Start on a voice or video call before meeting. Never share your home address.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onAccept, shape = PillShape) {
                        Icon(Icons.Filled.Check, null, Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Accept")
                    }
                    OutlinedButton(onClick = onDecline, shape = PillShape) {
                        Icon(Icons.Filled.Close, null, Modifier.size(14.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Decline")
                    }
                }
            }

            if (c.status == "accepted" && post != null) {
                if (revealed) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            .padding(12.dp)
                    ) {
                        Text(
                            "Contact you shared with her",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(c.postContact ?: "Hidden", style = MaterialTheme.typography.titleSmall)
                        Text(
                            "Talk on a call first. Never share your home address.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    DashedPanel {
                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(
                                Icons.Filled.VerifiedUser, null,
                                Modifier.size(14.dp).padding(top = 2.dp),
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    "Contact hidden. Reveal it only when you're ready to reach out.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                OutlinedButton(onClick = onReveal, shape = PillShape) {
                                    Icon(Icons.Filled.Visibility, null, Modifier.size(14.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Reveal contact")
                                }
                            }
                        }
                    }
                }
            }

            if (c.status == "declined") OutlineBadge("Declined")
        }
    }
}

/** "Vet her before accepting" block from travel.inbox.tsx. */
@Composable
private fun VetBlock(c: InboxConn) {
    val handle = c.contactHandle?.trim().orEmpty()
    if (handle.isEmpty()) return
    val link = vettingLink(c.contactType, handle)
    val label = (c.contactType ?: "contact").replaceFirstChar { it.uppercase() }
    val context = LocalContext.current

    DashedPanel(filled = false) {
        Text(
            "Vet her before accepting",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            OutlineBadge(label)
            Text(handle, style = MaterialTheme.typography.titleSmall)
            if (link != null) {
                Text(
                    "Open",
                    style = MaterialTheme.typography.bodySmall,
                    color = HerSpaceColors.Earth,
                    textDecoration = TextDecoration.Underline,
                    modifier = Modifier.clickable {
                        runCatching {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(link)))
                        }
                    }
                )
                Icon(
                    Icons.AutoMirrored.Filled.OpenInNew, null,
                    Modifier.size(12.dp),
                    tint = HerSpaceColors.Earth
                )
            }
        }
        Text(
            "Check that the profile looks real — actual name, photos, mutuals, posts. If it feels off, decline.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

// ── Dialogs ────────────────────────────────────────────────────────────────

@Composable
private fun ConnectDialog(
    request: TravelRequest,
    vm: ContentViewModel,
    onDismiss: () -> Unit,
    onSent: () -> Unit
) {
    var typeLabel by remember { mutableStateOf("Instagram") }
    var handle by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var sending by remember { mutableStateOf(false) }
    val type = typeLabel.lowercase()

    val send: () -> Unit = {
        if (handle.isBlank()) {
            error = "Add your contact so she can vet you before accepting."
        } else if (!sending) {
            val requestId = request.id
            if (requestId == null) {
                error = "Not ready"
            } else {
                error = null
                sending = true
                vm.sendTravelConnection(
                    requestId = requestId,
                    toUser = request.userId,
                    message = note,
                    contactType = type,
                    contactHandle = handle.trim()
                ) { ok, notice ->
                    sending = false
                    vm.msg.value = null // consumed here: the dialog/toast carries it
                    if (ok) {
                        onSent() // toast.success("Request sent. She'll see it in her inbox.")
                    } else {
                        error = notice
                    }
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Request to connect", fontStyle = FontStyle.Italic) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Share a public handle (Instagram, WhatsApp, etc.) with your note. She'll be able to look you up before accepting — real profile, real name, real posts build trust.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    SelectField(
                        value = typeLabel,
                        options = listOf("Instagram", "WhatsApp", "Phone", "Telegram", "Email", "Other"),
                        onSelected = { typeLabel = it },
                        modifier = Modifier.weight(1f)
                    )
                    OutlinedTextField(
                        handle,
                        { if (it.length <= 120) handle = it },
                        Modifier.weight(2f),
                        singleLine = true,
                        placeholder = { Text(contactPlaceholder(type)) }
                    )
                }
                OutlinedTextField(
                    note,
                    { if (it.length <= 300) note = it },
                    Modifier.fillMaxWidth(),
                    minLines = 3,
                    placeholder = { Text("Hi sister, I'm nearby and I can help with…") }
                )
                Text(
                    "She'll see this handle before deciding. Use one you're comfortable being looked up on.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                error?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            Button(onClick = send, enabled = !sending, shape = PillShape) {
                Text(if (sending) "Sending…" else "Send request")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
private fun RevealDialog(
    request: TravelRequest,
    onDismiss: () -> Unit,
    onReveal: () -> Unit
) {
    val bullets = listOf(
        "Start with a voice or video call — never meet before you've heard her voice.",
        "Meet in a public place first. Share the plan with a trusted person.",
        "Never share your home address, ID, or financial details over chat.",
        "If anything feels off, block and report immediately."
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    Icons.Filled.Shield, null,
                    Modifier.size(20.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Text("Reveal her contact?", fontStyle = FontStyle.Italic)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .padding(12.dp)
                ) {
                    Text(
                        "Her post".uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        "${request.city}, ${request.country}",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        request.need,
                        style = MaterialTheme.typography.bodySmall,
                        fontStyle = FontStyle.Italic,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    bullets.forEach { bullet ->
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                "• ",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                bullet,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
                Text(
                    "Only reveal if you're ready to reach out now.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            Button(onClick = onReveal, shape = PillShape) { Text("I understand — reveal contact") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Keep hidden") }
        }
    )
}

@Composable
private fun ConfirmRespondDialog(
    conn: InboxConn,
    action: String,
    pending: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    val isAccept = action == "accepted"
    AlertDialog(
        // travel.inbox.tsx keeps the dialog up while respond.isPending (Cancel disabled too).
        onDismissRequest = { if (!pending) onDismiss() },
        title = {
            Text(
                if (isAccept) "Accept this sister?" else "Decline this request?",
                fontStyle = FontStyle.Italic
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(
                        Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            initials(conn.requesterName),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    Column {
                        Text(conn.requesterName ?: "A sister", style = MaterialTheme.typography.titleSmall)
                        val loc = listOfNotNull(conn.requesterCity, conn.requesterCountry)
                            .joinToString(", ")
                            .ifBlank { null }
                        if (loc != null) {
                            Text(
                                loc,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Text(
                            "Sent ${prettyDate(conn.createdAt)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                conn.post?.let { post ->
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            .padding(12.dp)
                    ) {
                        Text(
                            "On your post".uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text("${post.city}, ${post.country}", style = MaterialTheme.typography.bodyMedium)
                        Text(post.need, style = MaterialTheme.typography.bodySmall, fontStyle = FontStyle.Italic)
                    }
                }
                val noteText = conn.message
                if (!noteText.isNullOrBlank()) {
                    Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min)) {
                        Box(
                            Modifier
                                .width(2.dp)
                                .fillMaxHeight()
                                .background(HerSpaceColors.Earth)
                        )
                        Column(Modifier.padding(start = 12.dp)) {
                            Text(
                                "Her note".uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text("\"$noteText\"", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                VetBlock(conn)
                Text(
                    if (isAccept)
                        "Open her handle above and check it looks like a real person before accepting. Accepting shares her full contact and yours — meet on a call first, never share your home address."
                    else
                        "She won't be notified with a reason. You can't undo this.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                error?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            }
        },
        confirmButton = {
            Button(onClick = onConfirm, enabled = !pending, shape = PillShape) {
                Text(
                    if (pending) "Saving…"
                    else if (isAccept) "Yes, accept & share contact"
                    else "Yes, decline"
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !pending) { Text("Cancel") }
        }
    )
}

@Composable
private fun InboxRevealDialog(onDismiss: () -> Unit, onReveal: () -> Unit) {
    val bullets = listOf(
        "Start on a voice or video call — never before you've heard her voice.",
        "Meet in a public place first. Tell a trusted person your plan.",
        "Never share your home address, ID, or financial details.",
        "If anything feels off, block and report immediately."
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Reveal contact?", fontStyle = FontStyle.Italic) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "You accepted this sister. Before reaching out, remember:",
                    style = MaterialTheme.typography.bodyMedium
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    bullets.forEach { bullet ->
                        Row(verticalAlignment = Alignment.Top) {
                            Text(
                                "• ",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                bullet,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(onClick = onReveal, shape = PillShape) { Text("I understand — reveal") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Keep hidden") }
        }
    )
}
