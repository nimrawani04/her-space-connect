package com.herspace.connect.ui.screens

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.LibraryArticle
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay

/**
 * Android twin of `src/routes/_authenticated/library.tsx`.
 *
 * Articles are read from Supabase through [ContentViewModel.loadAll] — the
 * `library_articles` table ordered by `created_at` descending, the exact query
 * the web react-query call runs. The web page's responsive grid
 * (`sm:grid-cols-2 lg:grid-cols-3`) maps to 1/2/3-chunked card rows at the
 * same breakpoints (single column below 600dp, 2 columns from `sm`,
 * 3 columns from `lg`).
 *
 * Parity note: the web cards render with `cursor-pointer` styling but define
 * no `onClick`, and the page has no search field or reader route — so this
 * port intentionally ships list-only UI (gap called out in the port summary).
 */
@Composable
fun LibraryScreen(vm: ContentViewModel = viewModel()) {
    val articles by vm.articles.collectAsState()
    val msg by vm.msg.collectAsState()
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        vm.loadAll()
        // loadAll() has no completion callback: wait for data (or an error) so
        // the spinner doesn't hang forever on an empty table.
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            vm.articles.value.isEmpty() && vm.msg.value == null
        ) delay(100)
        loading = false
    }

    // Web `sm:grid-cols-2 lg:grid-cols-3` — single column below `sm`.
    val screenWidthDp = LocalConfiguration.current.screenWidthDp
    val cols = when {
        screenWidthDp >= 1024 -> 3
        screenWidthDp >= 600 -> 2
        else -> 1
    }

    LazyColumn(
        Modifier.fillMaxSize().padding(horizontal = 20.dp),
        contentPadding = PaddingValues(top = 20.dp, bottom = 24.dp)
    ) {
        item {
            ScreenHeader(
                "10 · Library",
                "Library & Stories",
                "Expert-reviewed health articles, women's research, and lived-experience stories — written by us, for us."
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

        when {
            // web: {isLoading && <p>Loading…</p>}
            loading -> item { LoadingRow() }

            // web: {!isLoading && articles.length === 0 && <p>No articles yet.</p>}
            articles.isEmpty() -> item { EmptyCard("No articles yet.") }

            cols == 1 -> items(articles) { a ->
                ArticleCard(a, Modifier.fillMaxWidth().padding(bottom = 16.dp))
            }

            else -> items(articles.chunked(cols)) { row ->
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    row.forEach { a -> ArticleCard(a, Modifier.weight(1f)) }
                    repeat(cols - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

/**
 * shadcn `Card` from the web grid: outline topic badge, serif-italic title,
 * 3-line-clamped summary and the "N min read" footer. Web's hover ring is a
 * pointer affordance with no click handler, so the card stays inert here too.
 */
@Composable
private fun ArticleCard(a: LibraryArticle, modifier: Modifier = Modifier) {
    val summary = a.summary
    Card(modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(16.dp)) {
            TagChip(a.topic)
            Text(
                a.title,
                style = MaterialTheme.typography.titleLarge,
                fontFamily = FontFamily.Serif,
                fontStyle = FontStyle.Italic,
                modifier = Modifier.padding(top = 8.dp)
            )
            if (!summary.isNullOrBlank()) {
                Text(
                    summary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3, // web `line-clamp-3`
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            Text(
                "${a.readMinutes} min read",
                fontSize = 12.sp, // web `text-xs`
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 6.dp)
            )
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
