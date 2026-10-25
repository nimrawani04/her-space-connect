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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.herspace.connect.data.model.LibraryArticle
import com.herspace.connect.ui.components.EmptyCard
import com.herspace.connect.ui.components.LoadingRow
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay

private val PillShape = RoundedCornerShape(50)
private val CardShape = RoundedCornerShape(18)

data class AcademyCourse(
    val id: String,
    val title: String,
    val category: String,
    val level: String,
    val duration: String,
    val lessons: Int,
    val description: String,
    val keyTakeaways: List<String>
)

val sampleCourses = listOf(
    AcademyCourse(
        id = "c1",
        title = "Sovereign Reproductive Biology & Cycle Rhythms",
        category = "Cycle",
        level = "Foundation",
        duration = "45 mins",
        lessons = 6,
        description = "Deconstruct the four phases of the menstrual cycle, hormonal peaks (estrogen, LH, progesterone), and biological metabolic needs.",
        keyTakeaways = listOf("Follicular estrogen rises increase insulin sensitivity", "Luteal phase basal metabolic rate rises by 100-300 kcal", "Cervical mucus tracking identifies fertility windows accurately")
    ),
    AcademyCourse(
        id = "c2",
        title = "Clinical Perimenopause & STRAW+10 Staging",
        category = "Perimenopause",
        level = "Comprehensive",
        duration = "1 hr 15 mins",
        lessons = 8,
        description = "Master the Stages of Reproductive Aging Workshop (STRAW+10) criteria, vasomotor flash tracking, and hormone therapy evidence.",
        keyTakeaways = listOf("Early transition is marked by >=7 day cycle variance", "Vasomotor symptoms correlate with estrogen fluctuations", "Evidence-based non-hormonal and bio-identical HRT options")
    ),
    AcademyCourse(
        id = "c3",
        title = "Fertility Horizons & Ovarian Reserve (AMH) Literacy",
        category = "Fertility",
        level = "Intermediate",
        duration = "50 mins",
        lessons = 5,
        description = "Understand Anti-Müllerian Hormone (AMH), antral follicle counts, and how at-home test kits correlate with clinical outcomes.",
        keyTakeaways = listOf("AMH reflects egg quantity, not individual egg quality", "Thyroid (TSH) and prolactin directly modulate ovulation", "How to prepare concise consultation briefs for fertility specialists")
    ),
    AcademyCourse(
        id = "c4",
        title = "First Period & Adolescent Hormone Health",
        category = "Teen",
        level = "Beginner",
        duration = "35 mins",
        lessons = 4,
        description = "Compassionate, anatomical guide to menarche, normal cycle irregularity in adolescence, and cycle nutrition.",
        keyTakeaways = listOf("Anovulatory cycles are common in the first 2 years", "Iron-rich nutrition supports healthy menstruation", "Normalizing pelvic wellness without shame")
    )
)

/**
 * Android twin of `src/routes/_authenticated/library.tsx` —
 * Educational Academy & Scientific Library with courses, research search, and article readers.
 */
@Composable
fun LibraryScreen(vm: ContentViewModel = viewModel()) {
    val articles by vm.articles.collectAsState()
    val msg by vm.msg.collectAsState()
    var loading by remember { mutableStateOf(true) }

    var selectedTab by remember { mutableStateOf(0) } // 0 = Academy Courses, 1 = Scientific Articles
    var selectedCategory by remember { mutableStateOf("All") }
    var searchQuery by remember { mutableStateOf("") }
    var readingArticle by remember { mutableStateOf<LibraryArticle?>(null) }
    var viewingCourse by remember { mutableStateOf<AcademyCourse?>(null) }

    val categories = listOf("All", "Cycle", "Perimenopause", "Fertility", "Teen", "Pregnancy")

    LaunchedEffect(Unit) {
        vm.loadAll()
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            vm.articles.value.isEmpty() && vm.msg.value == null
        ) delay(100)
        loading = false
    }

    // Filter courses
    val filteredCourses = sampleCourses.filter { c ->
        (selectedCategory == "All" || c.category.equals(selectedCategory, ignoreCase = true)) &&
            (searchQuery.isBlank() || c.title.contains(searchQuery, ignoreCase = true) || c.description.contains(searchQuery, ignoreCase = true))
    }

    // Filter articles
    val filteredArticles = articles.filter { a ->
        (selectedCategory == "All" || a.topic.contains(selectedCategory, ignoreCase = true)) &&
            (searchQuery.isBlank() || a.title.contains(searchQuery, ignoreCase = true) || (a.summary ?: "").contains(searchQuery, ignoreCase = true))
    }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(
            Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp),
            contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                ScreenHeader(
                    "10 · Educational Academy",
                    "Academy & Scientific Library",
                    "Expert-reviewed reproductive courses, clinical research papers, and lived-experience guides — written by women, for women."
                )

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search topics, clinical guidelines, hormones...", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = PillShape,
                    singleLine = true
                )

                Spacer(Modifier.height(12.dp))

                // Category Filter Pills
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    categories.forEach { cat ->
                        val isSelected = selectedCategory == cat
                        Box(
                            Modifier
                                .clip(PillShape)
                                .background(if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { selectedCategory = cat }
                                .padding(horizontal = 14.dp, vertical = 6.dp)
                        ) {
                            Text(
                                cat,
                                fontSize = 11.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(Modifier.height(14.dp))

                // Academy vs Scientific Library Tabs
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = { selectedTab = 0 },
                        shape = PillShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selectedTab == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = if (selectedTab == 0) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.weight(1f).height(38.dp)
                    ) {
                        Icon(Icons.Filled.School, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Academy Courses", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }

                    Button(
                        onClick = { selectedTab = 1 },
                        shape = PillShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selectedTab == 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = if (selectedTab == 1) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        modifier = Modifier.weight(1f).height(38.dp)
                    ) {
                        Icon(Icons.Filled.MenuBook, contentDescription = null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Clinical Papers", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // ── Section 1: Academy Courses ──
            if (selectedTab == 0) {
                if (filteredCourses.isEmpty()) {
                    item { EmptyCard("No courses found matching your filter.") }
                } else {
                    items(filteredCourses) { course ->
                        Card(
                            Modifier.fillMaxWidth(),
                            shape = CardShape,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                        ) {
                            Column(Modifier.padding(18.dp)) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        Modifier
                                            .clip(PillShape)
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(course.category.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                    }
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Text(course.level, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text("•", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(course.duration, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }

                                Spacer(Modifier.height(8.dp))
                                Text(
                                    course.title,
                                    fontFamily = FontFamily.Serif,
                                    fontStyle = FontStyle.Italic,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 17.sp,
                                    lineHeight = 22.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    course.description,
                                    fontSize = 12.sp,
                                    lineHeight = 16.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 6.dp)
                                )

                                Spacer(Modifier.height(14.dp))
                                Button(
                                    onClick = { viewingCourse = course },
                                    shape = PillShape,
                                    modifier = Modifier.fillMaxWidth().height(34.dp)
                                ) {
                                    Text("Open Course Modules (${course.lessons} lessons) →", fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }

            // ── Section 2: Clinical Articles & Research ──
            if (selectedTab == 1) {
                when {
                    loading -> item { LoadingRow() }
                    filteredArticles.isEmpty() -> item { EmptyCard("No clinical articles found in this category.") }
                    else -> items(filteredArticles) { article ->
                        Card(
                            Modifier.fillMaxWidth(),
                            shape = CardShape,
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                        ) {
                            Column(Modifier.padding(18.dp)) {
                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        Modifier
                                            .clip(PillShape)
                                            .background(HerSpaceColors.Sage.copy(alpha = 0.15f))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(article.topic.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = HerSpaceColors.Sage)
                                    }
                                    Text("${article.readMinutes} min read", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }

                                Spacer(Modifier.height(8.dp))
                                Text(
                                    article.title,
                                    fontFamily = FontFamily.Serif,
                                    fontStyle = FontStyle.Italic,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 17.sp,
                                    lineHeight = 22.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )

                                article.summary?.let { sum ->
                                    Text(
                                        sum,
                                        fontSize = 12.sp,
                                        lineHeight = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.padding(top = 6.dp)
                                    )
                                }

                                Spacer(Modifier.height(14.dp))
                                OutlinedButton(
                                    onClick = { readingArticle = article },
                                    shape = PillShape,
                                    modifier = Modifier.fillMaxWidth().height(34.dp)
                                ) {
                                    Text("Read Full Clinical Guide →", fontSize = 11.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── Article Reader Dialog / Modal ──
        readingArticle?.let { article ->
            AlertDialog(
                onDismissRequest = { readingArticle = null },
                confirmButton = {
                    Button(onClick = { readingArticle = null }, shape = PillShape) {
                        Text("Close Guide")
                    }
                },
                title = {
                    Column {
                        Box(
                            Modifier
                                .clip(PillShape)
                                .background(HerSpaceColors.Sage.copy(alpha = 0.15f))
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(article.topic.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = HerSpaceColors.Sage)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            article.title,
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp
                        )
                    }
                },
                text = {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        article.summary?.let {
                            Text(
                                it,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                        Text(
                            "Clinical Evidence & Takeaways:",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "• Grounded in peer-reviewed reproductive studies\n• Correlates symptoms directly with physiological hormonal phases\n• Provides non-dismissive questions to advocate for care during clinical checkups",
                            fontSize = 12.sp,
                            lineHeight = 17.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }
            )
        }

        // ── Course Overview Dialog / Modal ──
        viewingCourse?.let { course ->
            AlertDialog(
                onDismissRequest = { viewingCourse = null },
                confirmButton = {
                    Button(onClick = { viewingCourse = null }, shape = PillShape) {
                        Text("Start Lesson 1")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { viewingCourse = null }) {
                        Text("Back")
                    }
                },
                title = {
                    Column {
                        Text(course.category.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            course.title,
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp
                        )
                    }
                },
                text = {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .heightIn(max = 350.dp)
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(course.description, fontSize = 12.sp, lineHeight = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(14.dp))
                        Text("Key Learning Outcomes:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(6.dp))
                        course.keyTakeaways.forEach { takeaway ->
                            Text("✓ $takeaway", fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(vertical = 2.dp))
                        }
                    }
                }
            )
        }
    }
}
