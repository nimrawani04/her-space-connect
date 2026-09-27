package com.herspace.connect.data.repository

import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.Journey
import com.herspace.connect.data.model.JourneyMember
import com.herspace.connect.data.model.JourneyMessage
import com.herspace.connect.data.model.JournalEntry
import com.herspace.connect.data.model.LibraryArticle
import com.herspace.connect.data.model.Mentor
import com.herspace.connect.data.model.MessageReaction
import com.herspace.connect.data.model.MessageView
import com.herspace.connect.data.model.Opportunity
import com.herspace.connect.data.model.Profile
import com.herspace.connect.data.model.SafePlace
import com.herspace.connect.data.model.SafetyAlert
import com.herspace.connect.data.model.ServiceListing
import com.herspace.connect.data.model.TravelConnection
import com.herspace.connect.data.model.TravelHost
import com.herspace.connect.data.model.TravelRequest
import com.herspace.connect.data.model.TravelRequestContact
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import io.github.jan.supabase.storage.storage
import kotlin.time.Duration.Companion.hours

class ContentRepository {
    private val client get() = SupabaseProvider.client

    suspend fun mentors(): List<Mentor> =
        client.postgrest["mentors"].select { order("created_at", Order.DESCENDING) }.decodeList()

    /** mentorship.tsx `become()` — upsert on conflict of `user_id`, returning the stored row. */
    suspend fun upsertMentor(mentor: Mentor): Mentor? =
        client.postgrest["mentors"].upsert(mentor) {
            onConflict = "user_id"
            select() // Prefer: return=representation
        }.decodeSingleOrNull<Mentor>()

    suspend fun listings(): List<ServiceListing> =
        client.postgrest["service_listings"].select { order("created_at", Order.DESCENDING) }.decodeList()

    /** marketplace.tsx `addListing` — insert and return the stored row. */
    suspend fun createListing(listing: ServiceListing): ServiceListing? =
        client.postgrest["service_listings"].insert(listing) {
            select() // Prefer: return=representation
        }.decodeSingleOrNull<ServiceListing>()

    suspend fun opportunities(): List<Opportunity> =
        client.postgrest["opportunities"].select { order("created_at", Order.DESCENDING) }.decodeList()

    /** careers.tsx `addOpp` — insert and return the stored row. */
    suspend fun createOpportunity(opportunity: Opportunity): Opportunity? =
        client.postgrest["opportunities"].insert(opportunity) {
            select() // Prefer: return=representation
        }.decodeSingleOrNull<Opportunity>()

    suspend fun articles(): List<LibraryArticle> =
        client.postgrest["library_articles"].select { order("created_at", Order.DESCENDING) }.decodeList()

    suspend fun travelRequests(): List<TravelRequest> =
        client.postgrest["travel_requests"].select { order("created_at", Order.DESCENDING); limit(100) }.decodeList()

    suspend fun createTravelRequest(r: TravelRequest) {
        client.postgrest["travel_requests"].insert(r)
    }

    suspend fun travelHosts(): List<TravelHost> =
        client.postgrest["travel_hosts"].select { order("created_at", Order.DESCENDING); limit(60) }.decodeList()

    suspend fun safePlaces(): List<SafePlace> =
        client.postgrest["safe_places"].select { order("created_at", Order.DESCENDING); limit(50) }.decodeList()

    suspend fun addSafePlace(p: SafePlace) {
        client.postgrest["safe_places"].insert(p)
    }

    suspend fun alerts(): List<SafetyAlert> =
        client.postgrest["safety_alerts"].select { order("created_at", Order.DESCENDING); limit(50) }.decodeList()

    suspend fun journals(): List<JournalEntry> =
        client.postgrest["journal_entries"].select { order("created_at", Order.DESCENDING); limit(50) }.decodeList()

    suspend fun addJournal(j: JournalEntry) {
        client.postgrest["journal_entries"].insert(j)
    }

    // ── Travel (travel.tsx / travel.inbox.tsx) ──────────────────────────────

    /**
     * travel.tsx `postRequest` — insert the request, then its hidden contact.
     * If the contact write fails the request is rolled back, exactly like web.
     */
    suspend fun createTravelRequestWithContact(request: TravelRequest, contact: String): TravelRequest {
        val inserted = client.postgrest["travel_requests"].insert(request) {
            select() // Prefer: return=representation
        }.decodeSingleOrNull<TravelRequest>()
        val id = inserted?.id ?: throw IllegalStateException("Could not create travel request")
        try {
            client.postgrest["travel_request_contacts"].insert(TravelRequestContact(requestId = id, contact = contact))
        } catch (e: Exception) {
            runCatching { deleteTravelRequest(id) }
            throw e
        }
        return inserted
    }

    /** travel.tsx `removeRequest`. */
    suspend fun deleteTravelRequest(id: String) {
        client.postgrest["travel_requests"].delete { filter { eq("id", id) } }
    }

    /** travel.tsx `becomeHost`. */
    suspend fun createTravelHost(host: TravelHost) {
        client.postgrest["travel_hosts"].insert(host)
    }

    /** travel.tsx `myConnections` — every connection I send or receive. */
    suspend fun travelConnections(uid: String): List<TravelConnection> =
        client.postgrest["travel_connections"].select {
            filter { or { eq("from_user", uid); eq("to_user", uid) } }
            order("created_at", Order.DESCENDING)
        }.decodeList()

    /** travel.tsx `sendConnect`. */
    suspend fun createTravelConnection(connection: TravelConnection) {
        client.postgrest["travel_connections"].insert(connection)
    }

    /** travel.tsx / travel.inbox.tsx `respond`. */
    suspend fun respondTravelConnection(id: String, status: String) {
        client.postgrest["travel_connections"].update({ this["status"] = status }) {
            filter { eq("id", id) }
        }
    }

    /** Hidden contacts, access-controlled by RLS (web reads them the same way). */
    suspend fun travelRequestContacts(ids: List<String> = emptyList()): List<TravelRequestContact> =
        client.postgrest["travel_request_contacts"].select {
            if (ids.isNotEmpty()) filter { isIn("request_id", ids) }
        }.decodeList()

    /** travel.inbox.tsx `travel_requests_by_ids`. */
    suspend fun travelRequestsByIds(ids: List<String>): List<TravelRequest> =
        if (ids.isEmpty()) emptyList()
        else client.postgrest["travel_requests"].select {
            filter { isIn("id", ids) }
            order("created_at", Order.DESCENDING)
        }.decodeList()

    /** travel.inbox.tsx `profiles_by_ids`. */
    suspend fun profilesByIds(ids: List<String>): List<Profile> =
        if (ids.isEmpty()) emptyList()
        else client.postgrest["profiles"].select {
            filter { isIn("id", ids) }
        }.decodeList()

    // ── Safety (safety.tsx) ─────────────────────────────────────────────────

    /** safety.tsx alert `submit` — reporter_id is captured by a DB trigger. */
    suspend fun addSafetyAlert(alert: SafetyAlert) {
        client.postgrest["safety_alerts"].insert(alert)
    }

    // ── Experience (experience.tsx) ─────────────────────────────────────────

    /** experience.tsx `journeys` query — same embedded `journey_members(user_id)` select. */
    suspend fun journeys(): List<Journey> =
        client.postgrest["journeys"].select(Columns.raw("id,title,tags,created_by,created_at,journey_members(user_id)")) {
            order("created_at", Order.DESCENDING)
            limit(60)
        }.decodeList()

    /** experience.tsx `addJourney`. */
    suspend fun createJourney(journey: Journey): Journey? =
        client.postgrest["journeys"].insert(journey) {
            select() // Prefer: return=representation
        }.decodeSingleOrNull<Journey>()

    suspend fun joinJourney(journeyId: String, userId: String) {
        client.postgrest["journey_members"].insert(JourneyMember(journeyId = journeyId, userId = userId))
    }

    suspend fun leaveJourney(journeyId: String, userId: String) {
        client.postgrest["journey_members"].delete {
            filter { eq("journey_id", journeyId); eq("user_id", userId) }
        }
    }

    suspend fun journeyMessages(journeyId: String): List<JourneyMessage> =
        client.postgrest["journey_messages"].select {
            filter { eq("journey_id", journeyId) }
            order("created_at", Order.ASCENDING)
            limit(200)
        }.decodeList()

    /** experience.tsx `send` (body-only — attachment upload stays local on Android). */
    suspend fun createJourneyMessage(message: JourneyMessage): JourneyMessage? =
        client.postgrest["journey_messages"].insert(message) {
            select() // Prefer: return=representation
        }.decodeSingleOrNull<JourneyMessage>()

    /** experience.tsx `remove` — the storage object is dropped first, like web. */
    suspend fun deleteJourneyMessage(id: String, attachmentPath: String? = null) {
        if (!attachmentPath.isNullOrBlank()) {
            runCatching { client.storage.from("circle-files").delete(attachmentPath) }
        }
        client.postgrest["journey_messages"].delete { filter { eq("id", id) } }
    }

    suspend fun journeyReactions(journeyId: String): List<MessageReaction> =
        client.postgrest["message_reactions"].select {
            filter { eq("journey_id", journeyId) }
        }.decodeList()

    suspend fun addJourneyReaction(reaction: MessageReaction) {
        client.postgrest["message_reactions"].insert(reaction)
    }

    suspend fun removeJourneyReaction(messageId: String, userId: String, emoji: String) {
        client.postgrest["message_reactions"].delete {
            filter {
                eq("message_id", messageId)
                eq("user_id", userId)
                eq("emoji", emoji)
            }
        }
    }

    suspend fun journeyViews(journeyId: String): List<MessageView> =
        client.postgrest["message_views"].select {
            filter { eq("journey_id", journeyId) }
        }.decodeList()

    /** experience.tsx views upsert — `onConflict: "message_id,viewer_id"`, duplicates ignored. */
    suspend fun recordMessageViews(rows: List<MessageView>) {
        if (rows.isEmpty()) return
        client.postgrest["message_views"].upsert(rows) {
            onConflict = "message_id,viewer_id"
            ignoreDuplicates = true
        }
    }

    /** experience.tsx `Attachment` — signed URL for a scanned-clean circle file. */
    suspend fun circleFileUrl(path: String): String? =
        runCatching {
            client.storage.from("circle-files").createSignedUrl(path, 1.hours)
        }.getOrNull()
}
