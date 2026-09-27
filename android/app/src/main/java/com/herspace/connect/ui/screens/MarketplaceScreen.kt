package com.herspace.connect.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.ServiceListing
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay

private const val PAGE_SIZE = 12 // web marketplace.tsx PAGE_SIZE

/**
 * Android twin of `src/routes/_authenticated/marketplace.tsx`.
 *
 * Listings are read from Supabase through [ContentViewModel.loadAll] and paged
 * 12 at a time like the web infinite query. The "List your service" form keeps
 * the web copy/validation and inserts through [ContentViewModel.addListing];
 * the local list is only used when that insert fails.
 */
@Composable
fun MarketplaceScreen(vm: ContentViewModel = viewModel()) {
    val listings by vm.listings.collectAsState()
    val msg by vm.msg.collectAsState()

    var loading by remember { mutableStateOf(true) }
    var providerName by remember { mutableStateOf("") }
    var craft by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }
    var formMsg by remember { mutableStateOf<String?>(null) }
    var formError by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf(false) } // web `addListing.isPending`
    val localListings = remember { mutableStateListOf<ServiceListing>() }
    var visibleCount by remember { mutableStateOf(PAGE_SIZE) }

    val sw = LocalConfiguration.current.screenWidthDp
    // web `sm:grid-cols-2 lg:grid-cols-3` for cards, `sm:2 lg:4` for the form
    val cardColumns = if (sw >= 1000) 3 else if (sw >= 600) 2 else 1
    val inputColumns = if (sw >= 1000) 4 else if (sw >= 600) 2 else 1

    LaunchedEffect(Unit) {
        vm.loadAll()
        // loadAll() has no completion callback: wait for data (or an error) so
        // "Loading…" doesn't hang forever on an empty table.
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            vm.listings.value.isEmpty() && vm.msg.value == null
        ) delay(100)
        loading = false
    }

    val all = localListings + listings
    val visible = all.take(visibleCount)
    val hasMore = all.size > visibleCount

    fun publish() {
        // mutation: "Name, craft and price required"
        if (providerName.isBlank() || craft.isBlank() || price.isBlank()) {
            formError = true
            formMsg = "Name, craft and price required"
            return
        }
        val name = providerName.trim()
        val craftValue = craft.trim()
        val priceValue = price.trim()
        val tagList = tags.split(",").map { it.trim() }.filter { it.isNotEmpty() }
        pending = true // web disables the button while `addListing.isPending`
        vm.addListing(name, craftValue, priceValue, tagList) { ok, notice ->
            pending = false
            vm.msg.value = null // consumed here: the header line would repeat it in red
            formError = !ok
            formMsg = notice // toast.error(...) / toast.success("Listing published")
            if (ok) {
                providerName = ""; craft = ""; price = ""; tags = ""
            } else {
                // Web has no local list — keep the entry only when Supabase refused it.
                localListings.add(
                    0,
                    ServiceListing(
                        userId = "local",
                        providerName = name,
                        craft = craftValue,
                        price = priceValue,
                        tags = tagList
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
                "06 · Trade",
                "Women's Marketplace",
                "Hire women — designers, developers, tutors, bakers, consultants, writers. Verified profiles, fair rates, reviews you can trust."
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

        // ── List your service ──
        item {
            Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        "List your service",
                        style = MaterialTheme.typography.titleLarge,
                        fontFamily = FontFamily.Serif,
                        fontStyle = FontStyle.Italic
                    )
                    Spacer(Modifier.height(12.dp))

                    val inputs: List<@Composable () -> Unit> = listOf(
                        {
                            OutlinedTextField(
                                providerName, { providerName = it }, Modifier.fillMaxWidth(),
                                singleLine = true, placeholder = { Text("Your name") }
                            )
                        },
                        {
                            OutlinedTextField(
                                craft, { craft = it }, Modifier.fillMaxWidth(),
                                singleLine = true, placeholder = { Text("What you do") }
                            )
                        },
                        {
                            OutlinedTextField(
                                price, { price = it }, Modifier.fillMaxWidth(),
                                singleLine = true, placeholder = { Text("Price (e.g. $60/hr)") }
                            )
                        },
                        {
                            OutlinedTextField(
                                tags, { tags = it }, Modifier.fillMaxWidth(),
                                singleLine = true, placeholder = { Text("Tags (comma)") }
                            )
                        }
                    )
                    inputs.chunked(inputColumns).forEach { row ->
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            row.forEach { field -> Box(Modifier.weight(1f)) { field() } }
                            repeat(inputColumns - row.size) { Spacer(Modifier.weight(1f)) }
                        }
                        Spacer(Modifier.height(8.dp))
                    }

                    Button(
                        onClick = { publish() },
                        enabled = !pending, // web `disabled={addListing.isPending}`
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(50)
                    ) { Text("List service") }

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
            Spacer(Modifier.height(16.dp))
        }

        if (loading) {
            item {
                Text(
                    "Loading…",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else if (all.isEmpty()) {
            item {
                Text(
                    "No listings yet — be the first.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            // web grid gap-4 → row/column gaps of 16dp
            items(visible.chunked(cardColumns)) { row ->
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    row.forEach { ListingCard(it, Modifier.weight(1f)) }
                    repeat(cardColumns - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
            if (hasMore) {
                item {
                    Row(
                        Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.Center
                    ) {
                        OutlinedButton(onClick = { visibleCount += PAGE_SIZE }, shape = RoundedCornerShape(50)) {
                            Text("Load more")
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ListingCard(s: ServiceListing, modifier: Modifier = Modifier) {
    Card(modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp)) {
            Text(
                s.craft,
                style = MaterialTheme.typography.titleMedium,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic
            )
            Text(
                "by ${s.providerName}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
            if (s.tags.isNotEmpty()) {
                FlowRow(
                    Modifier.padding(top = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) { s.tags.forEach { TagChip(it) } }
            }
            Row(
                Modifier.fillMaxWidth().padding(top = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    s.price,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Medium
                )
                // Web renders this outline button with no handler yet.
                OutlinedButton(onClick = {}, shape = RoundedCornerShape(50)) {
                    Text("Hire", fontSize = 12.sp)
                }
            }
        }
    }
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
