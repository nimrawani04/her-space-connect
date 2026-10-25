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
import com.herspace.connect.data.model.JournalEntry
import com.herspace.connect.ui.components.ScreenHeader
import com.herspace.connect.ui.theme.HerSpaceColors
import com.herspace.connect.viewmodel.ContentViewModel
import kotlinx.coroutines.delay
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

private val PillShape = RoundedCornerShape(50)
private val CardShape = RoundedCornerShape(18)

private data class ChatMsg(val sender: String, val text: String, val time: String)

/**
 * Android twin of `src/routes/_authenticated/wellness.tsx` with:
 * - "Talk to HerSpace" (AI Care Pathway Navigator for women feeling dismissed or needing care guidance)
 * - "Journal" (Daily private reflection, mood selection, and entries history)
 */
@Composable
fun WellnessScreen(vm: ContentViewModel = viewModel()) {
    val journals by vm.journals.collectAsState()
    val msg by vm.msg.collectAsState()

    var activeTab by remember { mutableStateOf(0) } // 0 = Talk to HerSpace, 1 = Journal

    // Journal composer state
    var content by remember { mutableStateOf("") }
    var mood by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    var errorText by remember { mutableStateOf<String?>(null) }
    var pendingCount by remember { mutableStateOf(-1) }

    // Talk to HerSpace Companion state
    var userMessage by remember { mutableStateOf("") }
    val chatMessages = remember {
        mutableStateListOf(
            ChatMsg(
                sender = "companion",
                text = "Welcome to your quiet room. I'm here to listen without judgment. If you're feeling dismissed by healthcare providers, navigating unexplained pain, or seeking accessible care options, you can speak freely here. What is on your mind today?",
                time = "Just now"
            )
        )
    }

    LaunchedEffect(Unit) { vm.loadAll() }

    LaunchedEffect(saving) {
        if (!saving) return@LaunchedEffect
        val deadline = System.currentTimeMillis() + 3_000L
        while (System.currentTimeMillis() < deadline &&
            journals.size == pendingCount && vm.msg.value == null
        ) delay(100)
        saving = false
    }

    fun submitJournal() {
        if (content.trim().length < 10) {
            errorText = "Write at least a sentence or two to reflect."
            return
        }
        errorText = null
        saving = true
        pendingCount = journals.size
        vm.addJournal(content, mood.ifBlank { null })
        content = ""
        mood = ""
    }

    fun sendCompanionMessage() {
        val trimmed = userMessage.trim()
        if (trimmed.isEmpty()) return
        chatMessages.add(ChatMsg(sender = "user", text = trimmed, time = "Just now"))
        userMessage = ""

        // Compassionate validation & clinical pathway suggestions
        val response = when {
            trimmed.contains("pain", ignoreCase = true) || trimmed.contains("cramp", ignoreCase = true) ->
                "Your pain is real and deserves thorough investigation, not dismissal. Keep a 14-day symptom log detailing intensity (1-10) and relation to your cycle. You have the right to request an ultrasound and hormone panel from an OB-GYN who listens."
            trimmed.contains("dismiss", ignoreCase = true) || trimmed.contains("doctor", ignoreCase = true) ->
                "Being dismissed by medical providers is exhausting and unfortunately common for women. Consider bringing a written symptom summary to your next appointment and asking: 'If this isn't X, what else could explain these symptoms, and what differential diagnosis can we explore?'"
            trimmed.contains("cost", ignoreCase = true) || trimmed.contains("afford", ignoreCase = true) ->
                "High healthcare costs shouldn't bar you from care. Community health centers (FQHCs) offer sliding-scale fees based on income. We also partner with non-profit clinics providing free cervical screenings and low-cost lab tests."
            else ->
                "Thank you for sharing your heart. Take a slow, deep breath. You are safe in this sisterhood, and your physical and emotional well-being matter deeply. How has this been affecting your daily peace?"
        }
        chatMessages.add(ChatMsg(sender = "companion", text = response, time = "Just now"))
    }

    val entries = journals.take(20)

    LazyColumn(
        Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        contentPadding = PaddingValues(top = 16.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            ScreenHeader(
                "09 · Mental Wellness",
                "Emotional Sanctuary & Reflection",
                "A non-judgmental space to exhale, untangle feelings, speak freely to HerSpace, and reflect. Held in sovereign privacy."
            )

            // Sanctuary Tab switcher
            Row(
                Modifier
                    .fillMaxWidth()
                    .padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = { activeTab = 0 },
                    shape = PillShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeTab == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                        contentColor = if (activeTab == 0) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    modifier = Modifier.weight(1f).height(38.dp)
                ) {
                    Icon(Icons.Filled.VolunteerActivism, contentDescription = null, Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Talk to HerSpace", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }

                Button(
                    onClick = { activeTab = 1 },
                    shape = PillShape,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (activeTab == 1) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                        contentColor = if (activeTab == 1) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    ),
                    modifier = Modifier.weight(1f).height(38.dp)
                ) {
                    Icon(Icons.Filled.EditNote, contentDescription = null, Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Journal & Insights", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // ── Tab 0: Talk to HerSpace (NEW FEATURE) ──
        if (activeTab == 0) {
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    shape = CardShape,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f))
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Box(Modifier.size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                                Text(
                                    "AI CARE PATHWAY & COMPANION",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                            Box(
                                Modifier
                                    .clip(PillShape)
                                    .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text("Non-Dismissive", fontSize = 10.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Spacer(Modifier.height(8.dp))
                        Text(
                            "Tell Your Story & Find A Pathway",
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            "Can't afford private clinics or feeling dismissed by your doctor? Speak freely here to map public options, questions for your physician, and clinical next steps.",
                            fontSize = 12.sp,
                            lineHeight = 16.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(Modifier.height(16.dp))

                        // Quick Prompts
                        Text("Suggested Reflections", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(6.dp))
                        Row(
                            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                "Doctor dismissed my pain",
                                "Need low-cost lab tests",
                                "Severe cycle mood swings",
                                "Unexplained pelvic cramps"
                            ).forEach { prompt ->
                                Box(
                                    Modifier
                                        .clip(PillShape)
                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), PillShape)
                                        .clickable { userMessage = prompt }
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(prompt, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }

                        Spacer(Modifier.height(16.dp))

                        // Chat Thread
                        Column(
                            Modifier
                                .fillMaxWidth()
                                .heightIn(min = 220.dp, max = 340.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(MaterialTheme.colorScheme.background.copy(alpha = 0.6f))
                                .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.25f), RoundedCornerShape(14.dp))
                                .padding(12.dp)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            chatMessages.forEach { msgItem ->
                                val isMe = msgItem.sender == "user"
                                Column(
                                    Modifier.fillMaxWidth(),
                                    horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
                                ) {
                                    Box(
                                        Modifier
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(
                                                if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
                                            )
                                            .border(
                                                1.dp,
                                                if (isMe) Color.Transparent else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                                RoundedCornerShape(12.dp)
                                            )
                                            .padding(10.dp)
                                            .widthIn(max = 280.dp)
                                    ) {
                                        Text(
                                            msgItem.text,
                                            fontSize = 12.sp,
                                            lineHeight = 16.sp,
                                            color = if (isMe) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(Modifier.height(12.dp))

                        // Message Input
                        Row(
                            Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedTextField(
                                value = userMessage,
                                onValueChange = { userMessage = it },
                                placeholder = { Text("Describe what you're experiencing...", fontSize = 12.sp) },
                                modifier = Modifier.weight(1f),
                                shape = PillShape,
                                singleLine = true
                            )
                            IconButton(
                                onClick = { sendCompanionMessage() },
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primary)
                                    .size(44.dp)
                            ) {
                                Icon(Icons.Filled.Send, contentDescription = "Send", tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(18.dp))
                            }
                        }
                    }
                }
            }
        }

        // ── Tab 1: Journal & Insights ──
        if (activeTab == 1) {
            item {
                Card(
                    Modifier.fillMaxWidth(),
                    shape = CardShape,
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f))
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Text(
                            "Daily Sanctuary Journal",
                            fontFamily = FontFamily.Serif,
                            fontStyle = FontStyle.Italic,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            "Write freely. Your entries are encrypted in sovereign privacy.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 4.dp)
                        )

                        Spacer(Modifier.height(14.dp))

                        // Mood selection
                        Text("HOW ARE YOU FEELING RIGHT NOW?", fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(6.dp))
                        Row(
                            Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf("Peaceful", "Reflective", "Heavy", "Hopeful", "Tender", "Exhausted").forEach { m ->
                                val selected = mood.equals(m, ignoreCase = true)
                                Box(
                                    Modifier
                                        .clip(PillShape)
                                        .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                        .clickable { mood = if (selected) "" else m }
                                        .padding(horizontal = 14.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        m,
                                        fontSize = 11.sp,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                        color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(14.dp))

                        OutlinedTextField(
                            value = content,
                            onValueChange = { content = it },
                            placeholder = { Text("What boundary or breath served your peace best today?", fontSize = 13.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 4,
                            shape = RoundedCornerShape(14.dp)
                        )

                        errorText?.let {
                            Text(it, fontSize = 11.sp, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 6.dp))
                        }

                        Spacer(Modifier.height(14.dp))

                        Button(
                            onClick = { submitJournal() },
                            enabled = !saving,
                            shape = PillShape,
                            modifier = Modifier.fillMaxWidth().height(38.dp)
                        ) {
                            Text(if (saving) "Saving Reflection..." else "Save Journal Reflection", fontSize = 12.sp)
                        }
                    }
                }
            }

            item {
                Text("Recent Journal Entries", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
            }

            if (entries.isEmpty()) {
                item {
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = CardShape,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                    ) {
                        Text(
                            "Your journal is empty. Reflect and record your first entry above.",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(24.dp)
                        )
                    }
                }
            } else {
                items(entries) { entry ->
                    Card(
                        Modifier.fillMaxWidth(),
                        shape = CardShape,
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    entry.createdAt?.take(10) ?: "Recent",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                entry.mood?.let { m ->
                                    Box(
                                        Modifier
                                            .clip(PillShape)
                                            .background(HerSpaceColors.Sage.copy(alpha = 0.15f))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(m, fontSize = 10.sp, color = HerSpaceColors.Sage, fontWeight = FontWeight.Medium)
                                    }
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                entry.content,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}
