package com.herspace.connect.ui.screens

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddReaction
import androidx.compose.material.icons.outlined.AttachFile
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.FileDownload
import androidx.compose.material.icons.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Send
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.LinkInteractionListener
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withLink
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import kotlin.math.roundToInt

private const val MAX_FILE_MB = 20
private val REACTIONS = listOf("\u2764\uFE0F", "\uD83E\uDD17", "\uD83D\uDE4F", "\uD83D\uDCAA", "\uD83D\uDE22", "\u2728")
private val BLOCKED_CLIENT_EXTENSIONS = setOf(
    "exe", "dll", "scr", "com", "bat", "cmd", "msi", "ps1", "vbs", "js", "mjs", "jar", "apk", "sh", "bin", "app",
)
private val URL_RE = Regex("(https?://[^\\s<>\"')]+)", RegexOption.IGNORE_CASE)

private fun prettySize(n: Long?): String {
    if (n == null || n == 0L) return ""
    if (n < 1024) return "$n B"
    if (n < 1024 * 1024) return "${n / 1024} KB"
    return "${(n / 1024.0 / 1024.0 * 10).roundToInt() / 10.0} MB"
}

private data class JourneyUi(
    val id: String,
    val title: String,
    val tags: List<String>,
    val count: Int,
    val joined: Boolean,
)

private data class AttachmentUi(val name: String, val size: Long?, val mime: String?, val uri: String)

private data class ChatMessage(
    val id: String,
    val body: String,
    val mine: Boolean,
    val anonymous: Boolean,
    val attachment: AttachmentUi? = null,
    /** Set when the message never reached Supabase — it only lives on this device. */
    val local: Boolean = false,
    /** Web `scan_detail` shown when an attachment may not be opened. */
    val scanNote: String? = null,
    /** Storage path of a web-posted attachment (for the delete → storage cleanup). */
    val attachmentPath: String? = null,
)

private data class ReactionCount(val count: Int, val mine: Boolean)

private fun queryText(context: Context, uri: Uri, column: String): String? = runCatching {
    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
        val index = cursor.getColumnIndex(column)
        if (index >= 0 && cursor.moveToFirst()) cursor.getString(index) else null
    }
}.getOrNull()

private fun openExternal(context: Context, intent: Intent) {
    runCatching { context.startActivity(intent) }
}

/**
 * Port of `src/routes/_authenticated/experience.tsx`.
 *
 * Circles, membership, chat, reactions and view counts are read/written through
 * [ContentViewModel] (`journeys`, `journey_members`, `journey_messages`,
 * `message_reactions`, `message_views`). Local state only appears as a fallback
 * when a write is refused, and for file attachments: the web scans uploads
 * through a TanStack server function Android cannot call, so those stay here.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ExperienceScreen(vm: ContentViewModel = viewModel()) {
    val context = LocalContext.current
    val serverJourneys by vm.journeys.collectAsState()
    val msg by vm.msg.collectAsState()
    var q by remember { mutableStateOf("") }
    var title by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf<String?>(null) }
    var meId by remember { mutableStateOf<String?>(null) }
    var addPending by remember { mutableStateOf(false) }
    var joinPending by remember { mutableStateOf(false) }
    val journeys = remember { mutableStateListOf<JourneyUi>() }
    var openCircle by remember { mutableStateOf<JourneyUi?>(null) }
    var pendingLink by remember { mutableStateOf<String?>(null) }
    var pendingFile by remember { mutableStateOf<AttachmentUi?>(null) }

    LaunchedEffect(Unit) {
        vm.loadJourneys()
        meId = runCatching { SupabaseProvider.currentUserId() }.getOrNull()
    }

    // Server rows first, then any circle this device is holding because a write failed.
    LaunchedEffect(serverJourneys, meId) {
        val myId = meId // local val → smart-castable (meId itself is written from another lambda)
        val fromServer = serverJourneys.map { j ->
            val members = j.memberIds()
            JourneyUi(
                id = j.id ?: "local-${j.title}",
                title = j.title,
                tags = j.tags,
                count = members.size,
                joined = myId != null && members.contains(myId),
            )
        }
        val heldLocally = journeys.filter { it.id.startsWith("local-") }
        journeys.clear()
        journeys.addAll(fromServer + heldLocally)
    }

    // ViewModel errors surface through the same notice line as the web toasts.
    LaunchedEffect(msg) {
        if (msg != null) {
            notice = msg
            vm.msg.value = null
        }
    }

    val filtered = journeys.filter { it.title.contains(q, ignoreCase = true) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
    ) {
        item {
            ScreenHeader(
                "03 \u00B7 Match",
                "Experience Match",
                "Find women who've lived what you're living. Request a conversation, or join the circle around a shared journey.",
            )
            OutlinedTextField(
                value = q,
                onValueChange = { q = it },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search a journey\u2026") },
            )
            Spacer(Modifier.height(20.dp))

            OutlinedCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Start a new journey circle",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                        ),
                    )
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = title,
                            onValueChange = { title = it },
                            singleLine = true,
                            modifier = Modifier.width(200.dp),
                            placeholder = { Text("Journey title") },
                        )
                        OutlinedTextField(
                            value = tags,
                            onValueChange = { tags = it },
                            singleLine = true,
                            modifier = Modifier.width(200.dp),
                            placeholder = { Text("Tags (comma separated)") },
                        )
                        Button(
                            onClick = {
                                val t = title.trim()
                                if (t.isEmpty()) {
                                    notice = "Title required" // web: toast.error("Title required")
                                } else if (!addPending) {
                                    addPending = true
                                    val parsed = tags.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                                    vm.addJourney(t, tags) { ok, n ->
                                        addPending = false
                                        vm.msg.value = null // consumed here: the notice line would repeat it
                                        notice = n
                                        if (ok) {
                                            title = ""
                                            tags = ""
                                        } else {
                                            // Supabase refused it — keep the circle on this device.
                                            journeys.add(
                                                0,
                                                JourneyUi(
                                                    id = "local-${System.nanoTime()}",
                                                    title = t,
                                                    tags = parsed,
                                                    count = 1,
                                                    joined = true,
                                                ),
                                            )
                                        }
                                    }
                                }
                            },
                            enabled = !addPending,
                            shape = RoundedCornerShape(50.dp),
                        ) {
                            Text("Add")
                        }
                    }
                    notice?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        if (filtered.isEmpty()) {
            item { EmptyCard("No journeys yet. Start a new journey circle above.") }
        }

        items(filtered) { journey ->
            JourneyCard(
                journey = journey,
                pending = joinPending,
                onOpen = { openCircle = journey },
                onToggleJoin = {
                    val index = journeys.indexOfFirst { it.id == journey.id }
                    fun flipLocally() {
                        if (index >= 0) {
                            val current = journeys[index]
                            journeys[index] = current.copy(
                                joined = !current.joined,
                                count = (current.count + if (current.joined) -1 else 1).coerceAtLeast(0),
                            )
                        }
                    }
                    when {
                        journey.id.startsWith("local-") -> flipLocally()
                        meId == null -> notice = "Sign in required"
                        joinPending -> Unit
                        else -> {
                            joinPending = true
                            vm.toggleJourneyMembership(journey.id, journey.joined) { ok, n ->
                                joinPending = false
                                vm.msg.value = null // consumed here: the notice line would repeat it
                                if (!ok) {
                                    notice = n
                                    flipLocally() // Supabase refused it — keep the change here.
                                }
                            }
                        }
                    }
                },
            )
        }
    }

    openCircle?.let { journey ->
        CircleChatDialog(
            journey = journey,
            vm = vm,
            meId = meId,
            onClose = { openCircle = null },
            onLinkClick = { pendingLink = it },
            onFileClick = { pendingFile = it },
        )
    }

    pendingLink?.let { url ->
        LinkConfirmDialog(
            url = url,
            onDismiss = { pendingLink = null },
            onConfirm = {
                openExternal(context, Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                pendingLink = null
            },
        )
    }

    pendingFile?.let { file ->
        ConfirmOpenFile(
            target = file,
            onDismiss = { pendingFile = null },
            onConfirm = {
                runCatching {
                    val intent = Intent(Intent.ACTION_VIEW).apply {
                        setDataAndType(Uri.parse(file.uri), file.mime ?: "*/*")
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(intent)
                }
                pendingFile = null
            },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun JourneyCard(
    journey: JourneyUi,
    pending: Boolean,
    onOpen: () -> Unit,
    onToggleJoin: () -> Unit,
) {
    OutlinedCard(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                journey.title,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                ),
            )
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(
                    Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    if (journey.tags.isNotEmpty()) {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            journey.tags.forEach { OutlineTag(it) }
                        }
                    }
                    Text(
                        "${journey.count} sisters",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (journey.joined) {
                        Button(onClick = onOpen, shape = RoundedCornerShape(50.dp)) { Text("Open circle") }
                    }
                    if (journey.joined) {
                        OutlinedButton(
                            onClick = onToggleJoin,
                            enabled = !pending,
                            shape = RoundedCornerShape(50.dp)
                        ) { Text("Leave") }
                    } else {
                        Button(
                            onClick = onToggleJoin,
                            enabled = !pending,
                            shape = RoundedCornerShape(50.dp)
                        ) { Text("Join circle") }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CircleChatDialog(
    journey: JourneyUi,
    vm: ContentViewModel,
    meId: String?,
    onClose: () -> Unit,
    onLinkClick: (String) -> Unit,
    onFileClick: (AttachmentUi) -> Unit,
) {
    val context = LocalContext.current
    val serverMessages by vm.journeyMessages.collectAsState()
    val serverReactions by vm.journeyReactions.collectAsState()
    val serverViews by vm.journeyViews.collectAsState()
    val attachmentUrls by vm.attachmentUrls.collectAsState()
    val chatLoading by vm.chatLoading.collectAsState()

    val localMessages = remember { mutableStateListOf<ChatMessage>() }
    // Optimistic reactions — only kept around when the row write is refused.
    val reactions = remember { mutableStateMapOf<String, Map<String, ReactionCount>>() }
    var text by remember { mutableStateOf("") }
    var anon by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var sending by remember { mutableStateOf(false) }
    var draftFile by remember { mutableStateOf<AttachmentUi?>(null) }
    var pickerFor by remember { mutableStateOf<String?>(null) }
    val listState = rememberLazyListState()

    LaunchedEffect(journey.id) { vm.loadJourneyChat(journey.id) }

    // journey_messages first, then whatever this device kept after a failed write.
    // Deliberately not `remember`ed: `localMessages` keeps its identity when it
    // gains a row, so a remembered value would go stale and hide the fallback.
    val messages = serverMessages.map { m ->
        val path = m.attachmentPath
        ChatMessage(
            id = m.id ?: "srv-${m.createdAt}",
            body = m.body ?: "",
            mine = meId != null && m.authorId == meId,
            anonymous = m.isAnonymous,
            attachment = if (!path.isNullOrBlank() && m.scanStatus == "clean") {
                AttachmentUi(
                    name = m.attachmentName ?: path.substringAfterLast('/'),
                    size = m.attachmentSize,
                    mime = m.attachmentType,
                    uri = m.id?.let { attachmentUrls[it] } ?: "",
                )
            } else null,
            scanNote = if (!path.isNullOrBlank() && m.scanStatus != "clean") {
                m.scanDetail ?: "This file could not be verified and is hidden."
            } else null,
            attachmentPath = path,
        )
    } + localMessages

    val serverCounts = remember(serverReactions, meId) {
        serverReactions
            .groupBy { it.messageId }
            .mapValues { (_, rows) ->
                rows.groupBy { it.emoji }
                    .mapValues { (_, r) -> ReactionCount(r.size, r.any { it.userId == meId }) }
            }
    }

    // message_views is UNIQUE(message_id, viewer_id) → rows == sisters who saw it.
    val viewCounts = remember(serverViews) {
        serverViews.groupBy { it.messageId }.mapValues { (_, rows) -> rows.size }
    }

    val pickFile = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            val name = queryText(context, uri, OpenableColumns.DISPLAY_NAME)
                ?: uri.lastPathSegment ?: "file"
            val size = queryText(context, uri, OpenableColumns.SIZE)?.toLongOrNull()
            val ext = name.substringAfterLast('.', "").lowercase()
            when {
                ext.isNotEmpty() && ext in BLOCKED_CLIENT_EXTENSIONS -> error =
                    ".$ext files aren't allowed here \u2014 executables are the most common way malware spreads."
                size != null && size > MAX_FILE_MB * 1024L * 1024L -> error = "Files must be under $MAX_FILE_MB MB"
                else -> {
                    draftFile = AttachmentUi(
                        name = name,
                        size = size,
                        mime = context.contentResolver.getType(uri),
                        uri = uri.toString(),
                    )
                    error = null
                }
            }
        }
    }

    fun toggleReaction(messageId: String, emoji: String) {
        val current = reactions[messageId] ?: serverCounts[messageId] ?: emptyMap()
        val existing = current[emoji]
        reactions[messageId] = if (existing?.mine == true) {
            val updated = existing.copy(count = existing.count - 1, mine = false)
            if (updated.count > 0) current + (emoji to updated) else current - emoji
        } else {
            current + (emoji to ReactionCount((existing?.count ?: 0) + 1, mine = true))
        }
        vm.toggleJourneyReaction(messageId, journey.id, emoji) { ok, _ ->
            vm.msg.value = null // consumed here: the notice line is not the toast
            if (ok) reactions.remove(messageId) // message_reactions row is authoritative again
        }
    }

    fun send() {
        val body = text.trim()
        if (body.isEmpty() && draftFile == null) {
            error = "Write something or attach a file"
            return
        }
        val file = draftFile
        if (file != null) {
            // Uploads are scanned by a TanStack server function Android cannot call,
            // so an attachment never reaches Supabase from here — keep it on-device.
            localMessages.add(
                ChatMessage(
                    id = "m-${System.nanoTime()}",
                    body = body,
                    mine = true,
                    anonymous = anon,
                    attachment = file,
                    local = true,
                ),
            )
            text = ""
            draftFile = null
            error = null
            pickerFor = null
            return
        }
        if (sending) return
        sending = true
        vm.sendJourneyMessage(journey.id, body, anon) { ok, notice ->
            sending = false
            vm.msg.value = null // consumed here
            if (ok) {
                text = ""
                error = null
                pickerFor = null
            } else {
                // Web only toasts; Android keeps the line so it isn't lost.
                localMessages.add(
                    ChatMessage(
                        id = "m-${System.nanoTime()}",
                        body = body,
                        mine = true,
                        anonymous = anon,
                        local = true,
                    ),
                )
                error = notice
            }
        }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Dialog(onDismissRequest = onClose) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.fillMaxWidth()) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp)) {
                    Text(
                        journey.title,
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                        ),
                    )
                    Text(
                        "Anonymous by default \u00B7 shared files stay inside this circle",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)

                LazyColumn(
                    modifier = Modifier.fillMaxWidth().height(420.dp),
                    state = listState,
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    if (chatLoading && messages.isEmpty()) {
                        item {
                            Text(
                                "Loading conversation…",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    } else if (messages.isEmpty()) {
                        item {
                            Text(
                                "No one has spoken yet. Start the conversation.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    items(messages, key = { it.id }) { message ->
                        MessageBubble(
                            message = message,
                            counts = reactions[message.id] ?: serverCounts[message.id] ?: emptyMap(),
                            views = viewCounts[message.id] ?: 0,
                            pickerOpen = pickerFor == message.id,
                            onToggleReaction = { emoji -> toggleReaction(message.id, emoji) },
                            onTogglePicker = { pickerFor = if (pickerFor == message.id) null else message.id },
                            onLink = onLinkClick,
                            onFile = onFileClick,
                            onDelete = {
                                if (message.local) {
                                    localMessages.remove(message)
                                } else {
                                    vm.deleteJourneyMessage(message.id, message.attachmentPath) { ok, n ->
                                        vm.msg.value = null
                                        if (!ok) error = n
                                    }
                                }
                            },
                        )
                    }
                }

                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    draftFile?.let { file ->
                        Row(
                            Modifier.fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Icon(Icons.Outlined.Description, null, Modifier.size(14.dp), tint = HerSpaceColors.Earth)
                            Text(
                                file.name,
                                style = MaterialTheme.typography.bodySmall,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                prettySize(file.size),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            IconButton(
                                onClick = { draftFile = null },
                                modifier = Modifier.size(24.dp),
                            ) {
                                Icon(
                                    Icons.Outlined.Close,
                                    contentDescription = "Remove attachment",
                                    Modifier.size(14.dp),
                                )
                            }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        OutlinedButton(
                            onClick = { pickFile.launch("*") },
                            shape = CircleShape,
                            contentPadding = PaddingValues(10.dp),
                            modifier = Modifier.size(40.dp),
                        ) {
                            Icon(Icons.Outlined.AttachFile, contentDescription = "Attach a file", Modifier.size(16.dp))
                        }
                        OutlinedTextField(
                            value = text,
                            onValueChange = { text = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Share a thought\u2026") },
                            minLines = 1,
                            maxLines = 4,
                            keyboardOptions = KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Send),
                            keyboardActions = KeyboardActions(onSend = { send() }),
                        )
                        Button(
                            onClick = { send() },
                            enabled = !sending,
                            shape = CircleShape,
                            contentPadding = PaddingValues(10.dp),
                            modifier = Modifier.size(40.dp),
                        ) {
                            Icon(Icons.Outlined.Send, contentDescription = "Send", Modifier.size(16.dp))
                        }
                    }
                    error?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = anon, onCheckedChange = { anon = it })
                        Text(
                            "Post anonymously",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MessageBubble(
    message: ChatMessage,
    counts: Map<String, ReactionCount>,
    views: Int,
    pickerOpen: Boolean,
    onToggleReaction: (String) -> Unit,
    onTogglePicker: () -> Unit,
    onLink: (String) -> Unit,
    onFile: (AttachmentUi) -> Unit,
    onDelete: () -> Unit,
) {
    val author = when {
        message.anonymous -> "Anonymous sister"
        message.mine -> "You"
        else -> "A sister"
    }
    Box(
        Modifier.fillMaxWidth(),
        contentAlignment = if (message.mine) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Column(
            Modifier.fillMaxWidth(0.85f)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    if (message.mine) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                    else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.50f),
                )
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Text(
                author.uppercase(),
                style = MaterialTheme.typography.labelSmall.copy(
                    letterSpacing = 1.65.sp,
                ),
                color = HerSpaceColors.Earth,
            )
            if (message.body.isNotBlank()) {
                MessageBody(message.body, onLink)
            }
            message.attachment?.let { Attachment(it, onFile) }
            message.scanNote?.let {
                Text(
                    it,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }

            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                REACTIONS.forEach { emoji ->
                    val reaction = counts[emoji] ?: return@forEach
                    if (reaction.count > 0) {
                        Row(
                            Modifier
                                .clip(CircleShape)
                                .border(
                                    1.dp,
                                    if (reaction.mine) MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                                    else MaterialTheme.colorScheme.outline,
                                    CircleShape,
                                )
                                .background(
                                    if (reaction.mine) MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                                    else Color.Transparent,
                                )
                                .clickable { onToggleReaction(emoji) }
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                .semantics { contentDescription = "$emoji reaction, ${reaction.count}" },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(emoji, style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.width(4.dp))
                            Text(reaction.count.toString(), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                Box(
                    Modifier
                        .clip(CircleShape)
                        .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                        .clickable(onClick = onTogglePicker)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                        .semantics { contentDescription = "Add a reaction" },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.AddReaction,
                        contentDescription = null,
                        Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (pickerOpen) {
                    REACTIONS.forEach { emoji ->
                        TextButton(
                            onClick = { onToggleReaction(emoji) },
                            contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp),
                        ) {
                            Text(emoji, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                }
                if (message.mine) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .padding(start = 4.dp)
                            .semantics { contentDescription = "People who viewed this message" },
                    ) {
                        Icon(
                            Icons.Outlined.Visibility,
                            contentDescription = null,
                            Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            "$views",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            if (message.mine) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(
                        onClick = onDelete,
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
                    ) {
                        Icon(
                            Icons.Outlined.Delete,
                            contentDescription = null,
                            Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            "Delete",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

/** Web `MessageBody` — URLs become earth-coloured links that open the confirm dialog. */
@Composable
private fun MessageBody(body: String, onLink: (String) -> Unit) {
    val earth = HerSpaceColors.Earth
    val annotated = remember(body, earth) {
        buildAnnotatedString {
            body.split(URL_RE).forEach { part ->
                if (part.isNotEmpty() && URL_RE.matches(part)) {
                    val url = part
                    withStyle(SpanStyle(color = earth, textDecoration = TextDecoration.Underline)) {
                        withLink(LinkAnnotation.Url(url, linkInteractionListener = LinkInteractionListener { onLink(url) })) {
                            append(url)
                        }
                    }
                } else {
                    append(part)
                }
            }
        }
    }
    Text(
        annotated,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun Attachment(attachment: AttachmentUi, onFile: (AttachmentUi) -> Unit) {
    // Only `content://` previews decode locally; web-posted files use their signed https URL.
    val isImage = attachment.mime?.startsWith("image/") == true && attachment.uri.startsWith("content://")
    val openable = attachment.uri.isNotBlank()
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (isImage) {
            RemoteImage(
                uri = attachment.uri,
                modifier = Modifier.fillMaxWidth().height(160.dp),
            )
        }
        Row(
            Modifier.fillMaxWidth()
                .clip(RoundedCornerShape(8.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                .clickable(enabled = openable) { onFile(attachment) }
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Icons.Outlined.Description, null, Modifier.size(16.dp), tint = HerSpaceColors.Earth)
            Text(
                attachment.name,
                style = MaterialTheme.typography.bodyMedium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
            Text(
                prettySize(attachment.size),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Icon(
                Icons.Outlined.FileDownload,
                contentDescription = null,
                Modifier.size(14.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        // Web shows a ScanIndicator ("Cleared") here — attachment scanning runs in the
        // web app's server functions and has no Android equivalent yet.
    }
}

/** Decodes a `content://` URI for local previews (no image-loading library available). */
@Composable
private fun RemoteImage(uri: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val bitmap by produceState<ImageBitmap?>(initialValue = null, uri) {
        value = runCatching {
            context.contentResolver.openInputStream(Uri.parse(uri))?.use { stream ->
                BitmapFactory.decodeStream(stream)?.asImageBitmap()
            }
        }.getOrNull()
    }
    val image = bitmap
    if (image != null) {
        Image(
            bitmap = image,
            contentDescription = null,
            modifier = modifier.clip(RoundedCornerShape(8.dp))
                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp)),
            contentScale = ContentScale.Crop,
        )
    } else {
        Box(
            modifier.clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
        )
    }
}

/** Web `ConfirmOpen` with `kind: "file"`. */
@Composable
private fun ConfirmOpenFile(target: AttachmentUi, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Download this file?",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                    ),
                )
                Text(
                    "Nothing downloads automatically. This file passed our scan, but open it only if you trust the sender.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Column(
                    Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                ) {
                    Text(target.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    prettySize(target.size).let {
                        if (it.isNotEmpty()) {
                            Text(
                                it,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                ) {
                    OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(50.dp)) { Text("Cancel") }
                    Button(onClick = onConfirm, shape = RoundedCornerShape(50.dp)) { Text("Download") }
                }
            }
        }
    }
}

/**
 * Web `LinkScanDialog` — the scan verdict comes from a TanStack server function that the
 * Android app cannot call, so the dialog renders the "Unknown" verdict and its copy.
 */
@Composable
private fun LinkConfirmDialog(url: String, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "Open this link?",
                    style = MaterialTheme.typography.titleLarge.copy(
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic,
                    ),
                )
                Text(
                    url,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                    modifier = Modifier.fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(
                        Modifier
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .border(1.dp, MaterialTheme.colorScheme.outline, CircleShape)
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.HelpOutline,
                            contentDescription = null,
                            Modifier.size(14.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            "Unknown",
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text(
                        "We couldn't verify this destination. Proceed only if you know the sender.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                ) {
                    OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(50.dp)) { Text("Cancel") }
                    Button(onClick = onConfirm, shape = RoundedCornerShape(50.dp)) { Text("Open link") }
                }
            }
        }
    }
}

@Composable
private fun OutlineTag(text: String) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(MaterialTheme.colorScheme.background)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(50))
            .padding(horizontal = 8.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
