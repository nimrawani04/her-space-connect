package com.herspace.connect.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.CommunityPost
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.CommunityViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/** `CATEGORIES` from `src/routes/_authenticated/community.tsx`. */
private val CATEGORIES = listOf(
    "Health", "Relationships", "Career", "Family",
    "Mental Health", "Education", "Marriage", "Sexual Health"
)

/** The web filter row: `All` (state `"all"`) followed by every category. */
private val FILTERS = listOf("all") + CATEGORIES

/**
 * Android twin of `src/routes/_authenticated/community.tsx` — the "Safe Space"
 * feed: category filter pills, the anonymous composer, and the post list.
 */
@Composable
fun CommunityScreen(vm: CommunityViewModel = viewModel()) {
    val posts by vm.posts.collectAsState()
    val filter by vm.filter.collectAsState()
    val msg by vm.msg.collectAsState()

    // Composer state — the web keeps these in `useState`.
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(CATEGORIES.first()) }
    var anon by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf<String?>(null) }

    // Web `loading`: the Share button stays disabled until the insert settles,
    // and the composer only clears once the viewmodel answers "Shared.".
    // The timeout guards a StateFlow that re-emits an equal value (no change).
    LaunchedEffect(busy) {
        if (!busy) return@LaunchedEffect
        val startMsg = msg
        val startPosts = posts
        withTimeoutOrNull(8_000) {
            snapshotFlow { msg to posts }.first { (m, p) -> m != startMsg || p !== startPosts }
        }
        if (msg == "Shared.") {
            title = ""
            body = ""
            formError = null
        }
        busy = false
    }

    // community.tsx `submit()`: reject short posts before touching the network.
    fun share() {
        if (title.trim().length < 3 || body.trim().length < 10) {
            formError = "Add a title and a fuller post."
            return
        }
        formError = null
        busy = true
        vm.submit(title.trim(), body.trim(), category, anon)
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ScreenHeader(
                "02 · Sisterhood",
                "Safe Space",
                "A women-only space for honest conversation. Posts can be anonymous or under your name. Be kind. We moderate for harassment and toxicity."
            )
        }

        // "Share something" card (the web's `md:col-span-1`, stacked on phones).
        item {
            Card(
                Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        "Share something",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Spacer(Modifier.height(12.dp))

                    CategorySelect(category) { category = it }
                    Spacer(Modifier.height(12.dp))

                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it.take(120); formError = null },
                        label = { Text("Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))

                    OutlinedTextField(
                        value = body,
                        onValueChange = { body = it.take(4000); formError = null },
                        label = { Text("Your post") },
                        minLines = 5,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(12.dp))

                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Post anonymously", style = MaterialTheme.typography.bodyMedium)
                        Switch(checked = anon, onCheckedChange = { anon = it })
                    }
                    Spacer(Modifier.height(12.dp))

                    Button(
                        onClick = { share() },
                        enabled = !busy,
                        shape = RoundedCornerShape(50),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Share")
                    }

                    // Toast stand-in: `toast.error(...)` / `toast.success("Shared.")`.
                    val notice = formError ?: msg
                    if (notice != null) {
                        val shared = notice == "Shared."
                        Text(
                            notice,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (shared) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
        }

        // Feed column: `gap-6` (24dp) below the composer, `space-y-4` inside.
        item {
            Spacer(Modifier.height(8.dp))
            FilterPills(selected = filter, onSelect = vm::setFilter)
        }

        if (posts.isEmpty()) item { EmptyCard("No posts yet. Be the first to share.") }
        items(posts) { p -> PostCard(p) }
    }
}

/** Web `flex gap-2 flex-wrap` row of `All` + category pills. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun FilterPills(selected: String, onSelect: (String) -> Unit) {
    FlowRow(
        Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FILTERS.forEach { f ->
            FilterPill(
                label = if (f == "all") "All" else f,
                selected = selected == f,
                onClick = { onSelect(f) }
            )
        }
    }
}

/** `Button size="sm" variant="default|outline" className="rounded-full"` pill. */
@Composable
private fun FilterPill(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(50),
        color = if (selected) HerSpaceColors.Accent else Color.Transparent,
        border = BorderStroke(
            1.dp,
            if (selected) HerSpaceColors.Accent else MaterialTheme.colorScheme.outline
        ),
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) Color.Black else MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
        )
    }
}

/** Web `<Select>` for the composer's category — read-only field + dropdown menu. */
@Composable
private fun CategorySelect(value: String, onValueChange: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            label = { Text("Category") },
            trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        // A read-only field swallows taps, so an overlay opens the menu instead.
        Box(Modifier.matchParentSize().clickable { expanded = true })
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            CATEGORIES.forEach { c ->
                DropdownMenuItem(
                    text = { Text(c) },
                    onClick = {
                        onValueChange(c)
                        expanded = false
                    }
                )
            }
        }
    }
}

/** One post card: category badge, author, date, title, body. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PostCard(post: CommunityPost) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Column(Modifier.padding(16.dp)) {
            FlowRow(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
                itemVerticalAlignment = Alignment.CenterVertically
            ) {
                CategoryBadge(post.category)
                Text(
                    if (post.isAnonymous) "Anonymous sister" else "Member",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    "·",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    postDate(post.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                post.title,
                style = MaterialTheme.typography.titleLarge.copy(
                    fontSize = 20.sp,
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic,
                    fontWeight = FontWeight.SemiBold
                ),
                modifier = Modifier.padding(top = 8.dp)
            )
            Text(
                post.body,
                style = MaterialTheme.typography.bodyMedium.copy(lineHeight = 22.sp),
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 12.dp)
            )
        }
    }
}

/** Web `Badge variant="outline"` — uppercase, tracked, hairline border. */
@Composable
private fun CategoryBadge(category: String) {
    Surface(
        shape = RoundedCornerShape(50),
        color = Color.Transparent,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline)
    ) {
        Text(
            category.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            letterSpacing = 1.3.sp,
            color = MaterialTheme.colorScheme.onBackground,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 2.dp)
        )
    }
}

/** Android twin of `new Date(p.created_at).toLocaleDateString()`. */
private fun postDate(iso: String?): String {
    val raw = iso?.takeIf { it.isNotBlank() } ?: return ""
    val date = runCatching {
        OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate()
    }.getOrNull() ?: runCatching { LocalDate.parse(raw.take(10)) }.getOrNull() ?: return ""
    return date.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.SHORT))
}
