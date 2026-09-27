package com.herspace.connect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.Opportunity
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay

private const val PAGE_SIZE = 12 // web careers.tsx PAGE_SIZE

// Rotating profession labels shown inside skeleton rows so the loading state
// feels like the sisterhood scrolling past — not a generic spinner.
private val PROFESSIONS = listOf(
    "Engineer", "Researcher", "Designer", "Founder", "Doctor",
    "Architect", "Lawyer", "Journalist", "Artist", "Scientist",
    "Educator", "Analyst", "Diplomat", "Chef", "Filmmaker", "Pilot"
)

/**
 * Android twin of `src/routes/_authenticated/careers.tsx`.
 *
 * Opportunities are read from Supabase through [ContentViewModel.loadAll];
 * search / type / region filtering, facets and 12-per-page paging run locally
 * on the full list (the web page queries Supabase per page + filter). The
 * "Share an opportunity" form keeps the web copy/validation and inserts
 * through [ContentViewModel.addOpportunity]; the local list is only used when
 * that insert fails.
 */
@Composable
fun CareersScreen(vm: ContentViewModel = viewModel()) {
    val opps by vm.opportunities.collectAsState()
    val msg by vm.msg.collectAsState()

    var loading by remember { mutableStateOf(true) }
    var search by remember { mutableStateOf("") }
    var typeFilter by remember { mutableStateOf("all") }
    var regionFilter by remember { mutableStateOf("all") }
    var visibleCount by remember { mutableStateOf(PAGE_SIZE) }
    val localOpps = remember { mutableStateListOf<Opportunity>() }

    // "Share an opportunity" form
    var fType by remember { mutableStateOf("") }
    var fTitle by remember { mutableStateOf("") }
    var fOrg by remember { mutableStateOf("") }
    var fRegion by remember { mutableStateOf("") }
    var fUrl by remember { mutableStateOf("") }
    var formMsg by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf(false) } // web `addOpp.isPending`

    val screenWidth = LocalConfiguration.current.screenWidthDp
    val sm = screenWidth >= 600 // web `sm:` breakpoint for the filter row
    val uriHandler = LocalUriHandler.current

    LaunchedEffect(Unit) {
        vm.loadAll()
        // loadAll() has no completion callback: wait for data (or an error) so
        // the skeleton doesn't hang forever on an empty table.
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            vm.opportunities.value.isEmpty() && vm.msg.value == null
        ) delay(100)
        loading = false
    }

    // ── facets (web: distinct type/region from the first 1000 rows) ──
    val all = localOpps + opps
    val types = all.map { it.type }.filter { it.isNotBlank() }.distinct().sorted()
    val regions = all.map { it.region }.filter { it.isNotBlank() }.distinct().sorted()

    // ── client-side equivalent of the web `.or(title.ilike / org.ilike)` query ──
    val query = search.trim().replace(Regex("[%,]"), "")
    val filtered = all.filter { o ->
        (typeFilter == "all" || o.type == typeFilter) &&
            (regionFilter == "all" || o.region == regionFilter) &&
            (query.isBlank() ||
                o.title.contains(query, ignoreCase = true) ||
                o.org.contains(query, ignoreCase = true))
    }
    val activeFilters =
        (if (typeFilter != "all") 1 else 0) +
            (if (regionFilter != "all") 1 else 0) +
            (if (search.isNotBlank()) 1 else 0)

    val visible = filtered.take(visibleCount)
    val hasMore = filtered.size > visibleCount
    val endReached = !hasMore && filtered.size > PAGE_SIZE

    // New query (web react-query key change) → back to page 1.
    LaunchedEffect(search, typeFilter, regionFilter) { visibleCount = PAGE_SIZE }

    // Auto-load the next page when scrolled near the end (web IntersectionObserver sentinel).
    val scroll = rememberScrollState()
    LaunchedEffect(scroll.value, scroll.maxValue, hasMore, filtered.size) {
        if (hasMore && scroll.value >= scroll.maxValue - 600) {
            visibleCount = minOf(visibleCount + PAGE_SIZE, filtered.size)
        }
    }

    fun share() {
        // mutation: "Type and title required"
        if (fType.isBlank() || fTitle.isBlank()) {
            formError = true
            formMsg = "Type and title required"
            return
        }
        val type = fType.trim()
        val title = fTitle.trim()
        val org = fOrg.trim().ifBlank { "—" }
        val region = fRegion.trim().ifBlank { "Global" }
        val url = fUrl.trim().ifBlank { null }
        pending = true // web disables the button while `addOpp.isPending`
        vm.addOpportunity(type, title, org, region, url) { ok, notice ->
            pending = false
            vm.msg.value = null // consumed here: the header line would repeat it in red
            formError = !ok
            formMsg = notice // toast.error(...) / toast.success("Opportunity shared")
            if (ok) {
                fType = ""; fTitle = ""; fOrg = ""; fRegion = ""; fUrl = ""
            } else {
                // Web has no local list — keep the entry only when Supabase refused it.
                localOpps.add(
                    0,
                    Opportunity(title = title, org = org, region = region, type = type, url = url)
                )
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp)
            .verticalScroll(scroll)
            .padding(top = 20.dp, bottom = 24.dp)
    ) {
        ScreenHeader(
            "05 · Opportunity",
            "Careers & Opportunity",
            "Internships, scholarships, fellowships, grants, and competitions shared by the community — for women, by women."
        )
        if (msg != null) {
            Text(
                msg!!,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }

        // ── Open opportunities ──
        Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Open opportunities",
                    style = MaterialTheme.typography.titleLarge,
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic
                )
                Spacer(Modifier.height(16.dp))

                // Filters: web `grid sm:grid-cols-[1fr_auto_auto_auto] gap-2`
                if (sm) {
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            search, { search = it }, Modifier.weight(1f),
                            singleLine = true,
                            placeholder = { Text("Search title or organization…") }
                        )
                        FilterMenu("All types", typeFilter, types, fillFull = false) { typeFilter = it }
                        FilterMenu("All regions", regionFilter, regions, fillFull = false) { regionFilter = it }
                        ClearButton(activeFilters) {
                            search = ""; typeFilter = "all"; regionFilter = "all"
                        }
                    }
                } else {
                    Column(
                        Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            search, { search = it }, Modifier.fillMaxWidth(),
                            singleLine = true,
                            placeholder = { Text("Search title or organization…") }
                        )
                        FilterMenu("All types", typeFilter, types, fillFull = true) { typeFilter = it }
                        FilterMenu("All regions", regionFilter, regions, fillFull = true) { regionFilter = it }
                        ClearButton(activeFilters, fillFull = true) {
                            search = ""; typeFilter = "all"; regionFilter = "all"
                        }
                    }
                }

                Spacer(Modifier.height(16.dp))

                when {
                    loading -> Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        repeat(5) { i ->
                            ProfessionSkeletonRow(i, showLabel = sm)
                            if (i < 4) HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                        }
                    }

                    visible.isEmpty() -> Text(
                        if (activeFilters > 0) "No opportunities match your filters."
                        else "No opportunities yet — share the first.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    else -> {
                        visible.forEachIndexed { i, o ->
                            val url = o.url
                            Row(
                                Modifier.fillMaxWidth().padding(bottom = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        TagChip(o.type)
                                        TagChip(o.region)
                                    }
                                    Text(
                                        o.title,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                    Text(
                                        o.org,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Spacer(Modifier.width(12.dp))
                                OutlinedButton(
                                    onClick = {
                                        if (!url.isNullOrBlank()) runCatching { uriHandler.openUri(url) }
                                    },
                                    enabled = !url.isNullOrBlank(),
                                    shape = RoundedCornerShape(50)
                                ) { Text("View", fontSize = 12.sp) }
                            }
                            if (i < visible.lastIndex) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                            }
                        }

                        if (hasMore) {
                            OutlinedButton(
                                onClick = { visibleCount += PAGE_SIZE },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(50)
                            ) { Text("Load more") }
                        }
                        if (endReached) {
                            Text(
                                "You've reached the end.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp)) // grid gap-6

        // ── Share an opportunity (web `bg-sand/40` card) ──
        Card(
            Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = HerSpaceColors.Sand.copy(alpha = 0.4f)
            )
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    "Share an opportunity",
                    style = MaterialTheme.typography.titleLarge,
                    fontFamily = FontFamily.Serif,
                    fontStyle = FontStyle.Italic
                )
                OutlinedTextField(
                    fType, { fType = it }, Modifier.fillMaxWidth(),
                    singleLine = true, placeholder = { Text("Type (Scholarship, Grant…)") }
                )
                OutlinedTextField(
                    fTitle, { fTitle = it }, Modifier.fillMaxWidth(),
                    singleLine = true, placeholder = { Text("Title") }
                )
                OutlinedTextField(
                    fOrg, { fOrg = it }, Modifier.fillMaxWidth(),
                    singleLine = true, placeholder = { Text("Organization") }
                )
                OutlinedTextField(
                    fRegion, { fRegion = it }, Modifier.fillMaxWidth(),
                    singleLine = true, placeholder = { Text("Region") }
                )
                OutlinedTextField(
                    fUrl, { fUrl = it }, Modifier.fillMaxWidth(),
                    singleLine = true, placeholder = { Text("Link (https://…)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri)
                )
                Button(
                    onClick = { share() },
                    enabled = !pending, // web `disabled={addOpp.isPending}`
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(50)
                ) { Text("Share") }
                if (formMsg != null) {
                    Text(
                        formMsg!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = if (formError) MaterialTheme.colorScheme.error
                                else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

/** shadcn `SelectTrigger` — "All types" / "All regions" plus the data-driven facets. */
@Composable
private fun FilterMenu(
    allLabel: String,
    value: String,
    options: List<String>,
    fillFull: Boolean,
    onPick: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.then(
                if (fillFull) Modifier.fillMaxWidth()
                else Modifier.widthIn(max = 160.dp)
            ),
            shape = RoundedCornerShape(50),
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Text(
                if (value == "all") allLabel else value,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Icon(Icons.Filled.ArrowDropDown, contentDescription = null, Modifier.size(18.dp))
        }
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuItem(
                text = { Text(allLabel) },
                onClick = { onPick("all"); expanded = false }
            )
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = { onPick(option); expanded = false }
                )
            }
        }
    }
}

/** web `variant="ghost"` Clear button: "Clear" / "Clear (2)", disabled at 0. */
@Composable
private fun ClearButton(activeFilters: Int, fillFull: Boolean = false, onClear: () -> Unit) {
    TextButton(
        onClick = onClear,
        enabled = activeFilters > 0,
        shape = RoundedCornerShape(50),
        modifier = if (fillFull) Modifier.fillMaxWidth() else Modifier
    ) {
        Text(if (activeFilters > 0) "Clear ($activeFilters)" else "Clear", fontSize = 12.sp)
    }
}

/** The shimmering profession row from `careers.tsx` (static bars on Android). */
@Composable
private fun ProfessionSkeletonRow(index: Int, showLabel: Boolean) {
    val label = PROFESSIONS[index % PROFESSIONS.size]
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(HerSpaceColors.Sand),
            contentAlignment = Alignment.Center
        ) {
            Text(
                label.take(1),
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                color = HerSpaceColors.Earth
            )
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SkeletonBar(Modifier.width(64.dp), 16.dp)
                SkeletonBar(Modifier.width(80.dp), 16.dp)
            }
            SkeletonBar(Modifier.fillMaxWidth((55 + (index * 13) % 35) / 100f), 16.dp)
            SkeletonBar(Modifier.width(96.dp), 12.dp)
        }
        if (showLabel) {
            Spacer(Modifier.width(12.dp))
            Text(
                label.uppercase(),
                fontSize = 10.sp,
                letterSpacing = 1.8.sp,
                color = HerSpaceColors.Earth.copy(alpha = 0.8f)
            )
        }
    }
}

@Composable
private fun SkeletonBar(modifier: Modifier, height: Dp) {
    Box(
        modifier
            .height(height)
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f))
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
