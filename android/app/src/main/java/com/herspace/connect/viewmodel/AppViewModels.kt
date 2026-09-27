package com.herspace.connect.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.herspace.connect.core.data.DemoSession
import com.herspace.connect.core.data.GoogleNativeResult
import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.core.data.requestGoogleIdToken
import com.herspace.connect.core.util.CycleMath
import com.herspace.connect.core.util.PregnancyMath
import com.herspace.connect.data.model.*
import com.herspace.connect.data.repository.*
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

fun todayIso(): String = java.time.LocalDate.now().toString()

// ── Auth ──
class AuthViewModel(private val repo: AuthRepository = AuthRepository()) : ViewModel() {
    val busy = MutableStateFlow(false)
    val error = MutableStateFlow<String?>(null)

    /** True when a Supabase session exists OR a local guest/demo session is active. */
    val signedIn = MutableStateFlow(repo.isSignedIn() || DemoSession.isActive)

    /**
     * False until the stored session has been checked (session restore from disk
     * is async). The UI shows a splash until this flips — otherwise every cold
     * start flashes the login screen while the still-valid session loads.
     */
    val sessionKnown = MutableStateFlow(false)

    init {
        // Mirror the web guard: any auth-state change (including the Google OAuth
        // deep-link callback handled in MainActivity) flips the shell in/out.
        viewModelScope.launch {
            SupabaseProvider.client.auth.sessionStatus.collect { status ->
                signedIn.value = status is SessionStatus.Authenticated || DemoSession.isActive
                if (status !is SessionStatus.Initializing) sessionKnown.value = true
            }
        }
        // Safety net: if init hangs (e.g. no network for a token refresh), fall
        // through to the login screen after 10s instead of splashing forever.
        viewModelScope.launch {
            try {
                kotlinx.coroutines.withTimeout(10_000) {
                    SupabaseProvider.client.auth.awaitInitialization()
                }
            } catch (_: Exception) { /* timeout or init error → show auth screen */ }
            sessionKnown.value = true
        }
    }

    fun signIn(email: String, pw: String, onDone: () -> Unit) {
        if (pw.length < 8) { error.value = "Use at least 8 characters"; return }
        viewModelScope.launch {
            busy.value = true; error.value = null
            try { repo.signIn(email, pw); signedIn.value = true; onDone() }
            catch (e: Exception) { error.value = e.message }
            busy.value = false
        }
    }

    fun signUp(email: String, pw: String, name: String, onDone: () -> Unit) {
        if (pw.length < 8) { error.value = "Use at least 8 characters"; return }
        viewModelScope.launch {
            busy.value = true; error.value = null
            try { repo.signUp(email, pw, name); signedIn.value = true; onDone() }
            catch (e: Exception) { error.value = e.message }
            busy.value = false
        }
    }

    /**
     * "Continue with Google" — native sheet first (Credential Manager, completes
     * in-app), browser fallback when native is unavailable (no client ID, no
     * Google accounts, no Play Services).
     */
    fun signInWithGoogle(activity: android.app.Activity, onDone: () -> Unit) {
        viewModelScope.launch {
            busy.value = true; error.value = null
            try {
                when (val native = requestGoogleIdToken(
                    activity,
                    com.herspace.connect.BuildConfig.GOOGLE_WEB_CLIENT_ID
                )) {
                    is GoogleNativeResult.Success -> {
                        repo.signInWithGoogleIdToken(native.idToken, native.nonce)
                        signedIn.value = true
                        onDone()
                    }
                    GoogleNativeResult.Cancelled -> { /* user dismissed — stay put */ }
                    is GoogleNativeResult.Unavailable -> {
                        // Say WHY before switching flows — otherwise a broken
                        // native setup silently degrades to the browser every time.
                        error.value = "Native Google sign-in unavailable (${native.reason}) — continuing in browser…"
                        repo.signOut()
                        repo.signInWithGoogle()
                    }
                }
            } catch (e: Exception) {
                error.value = e.message ?: "Google sign-in failed. Please try again."
            }
            busy.value = false
        }
    }

    /** Web parity: "Instant Guest / Demo Access →". */
    fun continueAsGuest(onDone: () -> Unit) {
        DemoSession.start(name = "Sister")
        signedIn.value = true
        onDone()
    }

    fun signOut() {
        viewModelScope.launch {
            if (DemoSession.isActive) {
                DemoSession.clear()
            } else {
                runCatching { repo.signOut() }
            }
            signedIn.value = false
        }
    }
}

// ── Dashboard ──
class DashboardViewModel : ViewModel() {
    val name: StateFlow<String?> get() = _name
    val postCount: StateFlow<Int?> get() = _postCount
    private val _name = MutableStateFlow<String?>(null)
    private val _postCount = MutableStateFlow<Int?>(null)

    init {
        viewModelScope.launch {
            try {
                val uid = SupabaseProvider.currentUserId()
                if (uid != null) {
                    _name.value = AuthRepository().me()?.displayName
                }
            } catch (_: Exception) {}
        }
    }
}

// ── Health ──
class HealthViewModel(private val repo: HealthRepository = HealthRepository()) : ViewModel() {
    val entries = MutableStateFlow<List<CycleEntry>>(emptyList())
    val busy = MutableStateFlow(false)
    val msg = MutableStateFlow<String?>(null)

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try { entries.value = repo.recentCycleEntries() } catch (e: Exception) { msg.value = e.message }
        }
    }

    fun saveToday(flow: String, mood: String, energy: Int?, symptoms: List<String>, notes: String) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run { msg.value = "Sign in required"; return@launch }
            busy.value = true
            try {
                repo.upsertCycleEntry(
                    CycleEntry(userId = uid, entryDate = todayIso(), flow = flow.ifBlank { null },
                        mood = mood.ifBlank { null }, energy = energy, symptoms = symptoms.ifEmpty { null },
                        notes = notes.ifBlank { null })
                )
                msg.value = "Logged."
                refresh()
            } catch (e: Exception) { msg.value = e.message }
            busy.value = false
        }
    }

    fun cycleDay(lastPeriod: String?, cycleLen: Int): Int? =
        CycleMath.cycleDay(lastPeriod, todayIso(), cycleLen)
}

// ── Pregnancy ──
class PregnancyViewModel(private val repo: PregnancyRepository = PregnancyRepository()) : ViewModel() {
    val profile = MutableStateFlow<PregnancyProfile?>(null)
    val logs = MutableStateFlow<List<PregnancyHealthLog>>(emptyList())
    val appointments = MutableStateFlow<List<PregnancyAppointment>>(emptyList())
    val msg = MutableStateFlow<String?>(null)

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try {
                profile.value = repo.myProfile()
                logs.value = repo.healthLogs()
                appointments.value = repo.appointments()
            } catch (e: Exception) { msg.value = e.message }
        }
    }

    fun saveStage(stage: String, lmp: String?, due: String?) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: return@launch
            val cur = profile.value
            try {
                repo.saveProfile((cur ?: PregnancyProfile(userId = uid)).copy(userId = uid, stage = stage, lmpDate = lmp, dueDate = due))
                refresh()
            } catch (e: Exception) { msg.value = e.message }
        }
    }

    fun gestational(): PregnancyMath.GestationalAge? {
        val lmp = profile.value?.lmpDate ?: return null
        return PregnancyMath.gestationalAge(lmp, todayIso())
    }
}

// ── Community ──
class CommunityViewModel(private val repo: CommunityRepository = CommunityRepository()) : ViewModel() {
    val posts = MutableStateFlow<List<CommunityPost>>(emptyList())
    val filter = MutableStateFlow("all")
    val msg = MutableStateFlow<String?>(null)

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            try { posts.value = repo.posts(filter.value.takeIf { it != "all" }) } catch (e: Exception) { msg.value = e.message }
        }
    }
    fun setFilter(f: String) { filter.value = f; refresh() }

    fun submit(title: String, body: String, category: String, anon: Boolean) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run { msg.value = "Sign in required"; return@launch }
            try {
                repo.createPost(CommunityPost(authorId = uid, title = title, body = body, category = category, isAnonymous = anon))
                msg.value = "Shared."
                refresh()
            } catch (e: Exception) { msg.value = e.message }
        }
    }
}

// ── Content (mentorship / marketplace / careers / travel / safety / library / wellness) ──
class ContentViewModel(private val repo: ContentRepository = ContentRepository()) : ViewModel() {
    val mentors = MutableStateFlow<List<Mentor>>(emptyList())
    val listings = MutableStateFlow<List<ServiceListing>>(emptyList())
    val opportunities = MutableStateFlow<List<Opportunity>>(emptyList())
    val articles = MutableStateFlow<List<LibraryArticle>>(emptyList())
    val requests = MutableStateFlow<List<TravelRequest>>(emptyList())
    val hosts = MutableStateFlow<List<TravelHost>>(emptyList())
    val places = MutableStateFlow<List<SafePlace>>(emptyList())
    val alerts = MutableStateFlow<List<SafetyAlert>>(emptyList())
    val journals = MutableStateFlow<List<JournalEntry>>(emptyList())

    // Travel inbox (travel.tsx + travel.inbox.tsx)
    val connections = MutableStateFlow<List<TravelConnection>>(emptyList())
    val connectionProfiles = MutableStateFlow<List<Profile>>(emptyList())
    val connectionRequests = MutableStateFlow<List<TravelRequest>>(emptyList())
    val requestContacts = MutableStateFlow<List<TravelRequestContact>>(emptyList())

    // Experience circles (experience.tsx)
    val journeys = MutableStateFlow<List<Journey>>(emptyList())
    val journeyMessages = MutableStateFlow<List<JourneyMessage>>(emptyList())
    val journeyReactions = MutableStateFlow<List<MessageReaction>>(emptyList())
    val journeyViews = MutableStateFlow<List<MessageView>>(emptyList())
    val attachmentUrls = MutableStateFlow<Map<String, String>>(emptyMap())
    val chatLoading = MutableStateFlow(false)

    val msg = MutableStateFlow<String?>(null)

    fun loadAll() {
        viewModelScope.launch {
            try {
                mentors.value = repo.mentors()
                listings.value = repo.listings()
                opportunities.value = repo.opportunities()
                articles.value = repo.articles()
                requests.value = repo.travelRequests()
                hosts.value = repo.travelHosts()
                places.value = repo.safePlaces()
                alerts.value = repo.alerts()
                journals.value = repo.journals()
            } catch (e: Exception) { msg.value = e.message }
        }
    }

    fun addJournal(content: String, mood: String?) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: return@launch
            try { repo.addJournal(JournalEntry(userId = uid, content = content, mood = mood)); loadAll() }
            catch (e: Exception) { msg.value = e.message }
        }
    }

    /**
     * safety.tsx safe-place `submit` — validation copy, "Added." toast and the
     * `notes` column all match the web. Kept callable with the original 4 args.
     */
    fun addSafePlace(
        name: String,
        type: String,
        city: String,
        country: String,
        notes: String? = null,
        onDone: (Boolean, String) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            // safety.tsx validates before inserting and stores the raw form values.
            if (name.isEmpty() || city.isEmpty() || country.isEmpty()) {
                val failure = "Name, city, and country required."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                repo.addSafePlace(
                    SafePlace(
                        submittedBy = uid,
                        name = name,
                        placeType = type,
                        city = city,
                        country = country,
                        notes = notes
                    )
                )
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            msg.value = "Added."
            onDone(true, "Added.")
            // Web: toast first, then invalidateQueries — a failed refetch must not
            // turn an accepted insert into an error.
            runCatching { places.value = repo.safePlaces() }
        }
    }

    /** safety.tsx alert `submit` — inserts into `safety_alerts`, no reporter_id column. */
    fun reportSafetyAlert(
        type: String,
        city: String,
        country: String,
        severity: String,
        description: String,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            // safety.tsx: empty city/country or a description under 10 chars never posts.
            if (city.isEmpty() || country.isEmpty() || description.length < 10) {
                val failure = "Add city, country and a clear description."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                repo.addSafetyAlert(
                    SafetyAlert(
                        alertType = type,
                        city = city,
                        country = country,
                        description = description,
                        severity = severity
                    )
                )
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            msg.value = "Reported. A moderator will verify."
            onDone(true, "Reported. A moderator will verify.")
            runCatching { alerts.value = repo.alerts() } // web: toast, then invalidateQueries
        }
    }

    fun addTravelRequest(city: String, country: String, need: String) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: return@launch
            try { repo.createTravelRequest(TravelRequest(userId = uid, city = city, country = country, need = need)); loadAll() }
            catch (e: Exception) { msg.value = e.message }
        }
    }

    // ── Write actions behind the mentorship / marketplace / careers forms ──

    /**
     * mentorship.tsx `become()` — upsert into `mentors` on conflict of `user_id`.
     * `onDone` reports success plus the same copy the web pushes through its
     * toast, so the screen can show it in place (and keep its local fallback).
     */
    fun becomeMentor(
        headline: String,
        bio: String?,
        expertise: List<String>,
        hourlyRate: Double?,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                repo.upsertMentor(
                    Mentor(userId = uid, headline = headline, bio = bio, expertise = expertise, hourlyRate = hourlyRate)
                )
                msg.value = "You're listed as a mentor."
                loadAll()
                onDone(true, "You're listed as a mentor.")
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
            }
        }
    }

    /** marketplace.tsx `addListing` — insert into `service_listings`. */
    fun addListing(
        providerName: String,
        craft: String,
        price: String,
        tags: List<String>,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                repo.createListing(
                    ServiceListing(userId = uid, providerName = providerName, craft = craft, price = price, tags = tags)
                )
                msg.value = "Listing published"
                loadAll()
                onDone(true, "Listing published")
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
            }
        }
    }

    /**
     * careers.tsx `addOpp` — insert into `opportunities`. `org`, `region` and
     * `url` arrive already resolved to the web's `"—"` / `"Global"` / `null`.
     */
    fun addOpportunity(
        type: String,
        title: String,
        org: String,
        region: String,
        url: String?,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                repo.createOpportunity(
                    Opportunity(type = type, title = title, org = org, region = region, url = url, createdBy = uid)
                )
                msg.value = "Opportunity shared"
                loadAll()
                onDone(true, "Opportunity shared")
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
            }
        }
    }

    // ── Travel write actions (travel.tsx) ───────────────────────────────────

    /**
     * travel.tsx `becomeHost` — insert into `travel_hosts`, then toast
     * "You're listed as a local sister" and refresh the city groups.
     */
    fun becomeHost(
        city: String,
        country: String,
        note: String?,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            if (city.isBlank() || country.isBlank()) {
                val failure = "City and country required"
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            try {
                repo.createTravelHost(
                    TravelHost(
                        userId = uid,
                        city = city.trim(),
                        country = country.trim(),
                        note = note?.trim().orEmpty().ifBlank { null }
                    )
                )
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            msg.value = "You're listed as a local sister"
            onDone(true, "You're listed as a local sister")
            runCatching { hosts.value = repo.travelHosts() } // web: toast, then invalidateQueries
        }
    }

    /**
     * travel.tsx `postRequest` — request row + hidden contact (rolled back
     * together), then "Shared — sisters nearby can reach you".
     */
    fun postTravelRequest(
        city: String,
        country: String,
        need: String,
        contact: String,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            val failure = when {
                city.isBlank() || country.isBlank() || need.isBlank() || contact.isBlank() ->
                    "City, country, need and contact are required"
                need.length > 500 -> "Keep your need under 500 characters"
                contact.length > 200 -> "Contact too long"
                else -> null
            }
            if (failure != null) {
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            try {
                repo.createTravelRequestWithContact(
                    TravelRequest(userId = uid, city = city.trim(), country = country.trim(), need = need.trim()),
                    contact.trim()
                )
            } catch (e: Exception) {
                val message = e.message ?: "Something went wrong."
                msg.value = message
                onDone(false, message)
                return@launch
            }
            msg.value = "Shared — sisters nearby can reach you"
            onDone(true, "Shared — sisters nearby can reach you")
            runCatching { // web: toast, then invalidateQueries (both queries)
                requests.value = repo.travelRequests()
                requestContacts.value = repo.travelRequestContacts()
            }
        }
    }

    /** travel.tsx `removeRequest` — deletes my own post (web shows no toast on success). */
    fun removeTravelRequest(id: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            try {
                repo.deleteTravelRequest(id)
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            onDone(true, "")
            runCatching { requests.value = repo.travelRequests() }
        }
    }

    /** Every connection I send or receive + the profiles/requests/contacts shown with it. */
    fun loadTravelInbox() {
        viewModelScope.launch {
            try {
                val uid = SupabaseProvider.currentUserId() ?: return@launch
                val rows = repo.travelConnections(uid)
                connections.value = rows
                connectionProfiles.value = repo.profilesByIds(rows.map { it.fromUser }.distinct())
                val requestIds = rows.map { it.requestId }.distinct()
                connectionRequests.value = repo.travelRequestsByIds(requestIds)
                // Unfiltered like travel.tsx's contact query: RLS gates the rows, and
                // the main screen also needs my own posts' contacts (the inbox would
                // otherwise clobber them with just the connection-linked ids).
                requestContacts.value = repo.travelRequestContacts()
            } catch (e: Exception) {
                msg.value = e.message
            }
        }
    }

    /**
     * travel.tsx `sendConnect` — insert a `travel_connections` row with the
     * handle the requester shares, then "Request sent. She'll see it in her inbox."
     */
    fun sendTravelConnection(
        requestId: String,
        toUser: String,
        message: String?,
        contactType: String,
        contactHandle: String,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            val handle = contactHandle.trim()
            if (requestId.isBlank() || handle.isEmpty()) {
                val failure = "Add your contact so she can vet you before accepting."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            try {
                repo.createTravelConnection(
                    TravelConnection(
                        requestId = requestId,
                        fromUser = uid,
                        toUser = toUser,
                        message = message?.trim()?.ifBlank { null },
                        contactType = contactType,
                        contactHandle = handle
                    )
                )
                msg.value = "Request sent. She'll see it in her inbox."
                loadTravelInbox()
                onDone(true, "Request sent. She'll see it in her inbox.")
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
            }
        }
    }

    /**
     * travel.tsx / travel.inbox.tsx `respond` — accepting shares both contacts,
     * so the toast flips with the status, exactly like the web.
     */
    fun respondTravelConnection(id: String, status: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val success = if (status == "accepted") "Contact shared — talk safe." else "Declined."
            try {
                repo.respondTravelConnection(id, status)
                msg.value = success
                loadTravelInbox()
                onDone(true, success)
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
            }
        }
    }

    // ── Experience write actions (experience.tsx) ───────────────────────────

    /** experience.tsx `journeys` query. */
    fun loadJourneys() {
        viewModelScope.launch {
            try { journeys.value = repo.journeys() }
            catch (e: Exception) { msg.value = e.message }
        }
    }

    /** experience.tsx `addJourney` — "Title required" / "Journey added". */
    fun addJourney(title: String, tags: String, onDone: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            val trimmed = title.trim()
            if (trimmed.isEmpty()) {
                msg.value = "Title required"
                onDone(false, "Title required")
                return@launch
            }
            val parsedTags = tags.split(",").map { it.trim() }.filter { it.isNotEmpty() }
            try {
                repo.createJourney(Journey(title = trimmed, tags = parsedTags, createdBy = uid))
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            msg.value = "Journey added"
            onDone(true, "Journey added")
            runCatching { journeys.value = repo.journeys() } // web: toast, then invalidateQueries
        }
    }

    /** experience.tsx `toggleJoin` — join/leave `journey_members` (web toasts failures only). */
    fun toggleJourneyMembership(
        journeyId: String,
        currentlyJoined: Boolean,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                if (currentlyJoined) repo.leaveJourney(journeyId, uid)
                else repo.joinJourney(journeyId, uid)
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            onDone(true, "")
            runCatching { journeys.value = repo.journeys() }
        }
    }

    /**
     * experience.tsx circle chat queries: messages, reactions, views — plus the
     * view rows this sister owes (message_views upsert) and signed URLs for
     * attachments the web already scanned clean.
     */
    fun loadJourneyChat(journeyId: String) {
        viewModelScope.launch {
            chatLoading.value = true
            try {
                val uid = SupabaseProvider.currentUserId()
                val messages = repo.journeyMessages(journeyId)
                journeyMessages.value = messages
                journeyReactions.value = repo.journeyReactions(journeyId)
                var views = repo.journeyViews(journeyId)
                if (uid != null && messages.isNotEmpty()) {
                    val seen = views.filter { it.viewerId == uid }.map { it.messageId }.toSet()
                    val owed = messages
                        .filter { !it.id.isNullOrBlank() && it.authorId != uid && !seen.contains(it.id) }
                        .map { MessageView(messageId = it.id!!, journeyId = journeyId, viewerId = uid) }
                    if (owed.isNotEmpty()) {
                        repo.recordMessageViews(owed)
                        views = repo.journeyViews(journeyId)
                    }
                }
                journeyViews.value = views
                val urls = attachmentUrls.value.toMutableMap()
                messages.forEach { m ->
                    val path = m.attachmentPath
                    if (!path.isNullOrBlank() && m.scanStatus == "clean" && !m.id.isNullOrBlank() &&
                        !urls.containsKey(m.id)
                    ) {
                        repo.circleFileUrl(path)?.let { urls[m.id!!] = it }
                    }
                }
                attachmentUrls.value = urls
            } catch (e: Exception) {
                msg.value = e.message
            }
            chatLoading.value = false
        }
    }

    /**
     * experience.tsx `send` for body-only messages. Attachments are NOT uploaded:
     * the web scans them through a TanStack server function Android cannot call,
     * so a file would stay `scan_status = "pending"` forever. The screen keeps
     * those local and reports it.
     */
    fun sendJourneyMessage(
        journeyId: String,
        body: String,
        anonymous: Boolean,
        onDone: (Boolean, String) -> Unit
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            val trimmed = body.trim()
            if (trimmed.isEmpty()) {
                val failure = "Write something or attach a file"
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            try {
                repo.createJourneyMessage(
                    JourneyMessage(
                        journeyId = journeyId,
                        authorId = uid,
                        body = trimmed,
                        isAnonymous = anonymous,
                        scanStatus = "clean"
                    )
                )
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            onDone(true, "")
            runCatching { journeyMessages.value = repo.journeyMessages(journeyId) }
        }
    }

    /** experience.tsx `remove` — storage object first, then the row. */
    fun deleteJourneyMessage(
        messageId: String,
        attachmentPath: String? = null,
        onDone: (Boolean, String) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            val existing = journeyMessages.value.firstOrNull { it.id == messageId }
            val journeyId = existing?.journeyId
            try {
                repo.deleteJourneyMessage(messageId, attachmentPath ?: existing?.attachmentPath)
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            onDone(true, "")
            if (journeyId != null) runCatching { journeyMessages.value = repo.journeyMessages(journeyId) }
        }
    }

    /** experience.tsx `toggleReaction` — one row per (message, sister, emoji). */
    fun toggleJourneyReaction(
        messageId: String,
        journeyId: String,
        emoji: String,
        onDone: (Boolean, String) -> Unit = { _, _ -> }
    ) {
        viewModelScope.launch {
            val uid = SupabaseProvider.currentUserId() ?: run {
                msg.value = "Sign in required"
                onDone(false, "Sign in required")
                return@launch
            }
            try {
                val mine = journeyReactions.value.any {
                    it.messageId == messageId && it.userId == uid && it.emoji == emoji
                }
                if (mine) repo.removeJourneyReaction(messageId, uid, emoji)
                else repo.addJourneyReaction(
                    MessageReaction(messageId = messageId, journeyId = journeyId, userId = uid, emoji = emoji)
                )
            } catch (e: Exception) {
                val failure = e.message ?: "Something went wrong."
                msg.value = failure
                onDone(false, failure)
                return@launch
            }
            onDone(true, "")
            runCatching { journeyReactions.value = repo.journeyReactions(journeyId) }
        }
    }
}
