package com.herspace.connect.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

// Mirrors src/integrations/supabase/types.ts — same tables, same columns.

@Serializable
data class Profile(
    val id: String,
    @SerialName("display_name") val displayName: String? = null,
    val username: String? = null,
    val bio: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val city: String? = null,
    val country: String? = null,
    @SerialName("is_verified") val isVerified: Boolean = false
)

@Serializable
data class CycleEntry(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("entry_date") val entryDate: String,
    @SerialName("end_date") val endDate: String? = null,
    val flow: String? = null,
    @SerialName("flow_intensity") val flowIntensity: String? = null,
    @SerialName("is_period_start") val isPeriodStart: Boolean? = null,
    val mood: String? = null,
    val energy: Int? = null,
    val symptoms: List<String>? = null,
    @SerialName("symptom_severities") val symptomSeverities: Map<String, Int>? = null,
    @SerialName("pain_level") val painLevel: Int? = null,
    @SerialName("cramp_level") val crampLevel: Int? = null,
    @SerialName("blood_color") val bloodColor: String? = null,
    val clotting: String? = null,
    val notes: String? = null
)

@Serializable
data class WellnessLog(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("log_date") val logDate: String,
    val mood: List<String>? = null,
    @SerialName("energy_level") val energyLevel: Int? = null,
    @SerialName("sleep_hours") val sleepHours: Double? = null,
    @SerialName("sleep_quality") val sleepQuality: Int? = null,
    @SerialName("water_glasses") val waterGlasses: Int? = null,
    val exercise: List<String>? = null,
    val nutrition: JsonElement? = null,
    val symptoms: JsonElement? = null,
    @SerialName("custom_symptoms") val customSymptoms: List<String>? = null,
    val notes: String? = null
)

@Serializable
data class FertilityLog(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("log_date") val logDate: String,
    @SerialName("bbt_celsius") val bbtCelsius: Double? = null,
    @SerialName("cervical_mucus") val cervicalMucus: String? = null,
    @SerialName("ovulation_test") val ovulationTest: String? = null,
    val intercourse: Boolean = false,
    val notes: String? = null
)

@Serializable
data class PregnancyProfile(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val stage: String = "planning",
    @SerialName("lmp_date") val lmpDate: String? = null,
    @SerialName("conception_date") val conceptionDate: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("test_date") val testDate: String? = null,
    @SerialName("test_result") val testResult: String? = null,
    @SerialName("birth_plan") val birthPlan: String? = null,
    @SerialName("next_appointment") val nextAppointment: String? = null,
    val notes: String? = null
)

@Serializable
data class PregnancyHealthLog(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("log_date") val logDate: String,
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("bp_systolic") val bpSystolic: Int? = null,
    @SerialName("bp_diastolic") val bpDiastolic: Int? = null,
    @SerialName("blood_sugar") val bloodSugar: Double? = null,
    @SerialName("sleep_hours") val sleepHours: Double? = null,
    @SerialName("water_glasses") val waterGlasses: Int? = null,
    val exercise: String? = null,
    val mood: String? = null,
    val symptoms: JsonElement? = null,
    val notes: String? = null
)

@Serializable
data class PregnancyAppointment(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("appt_date") val apptDate: String,
    @SerialName("appt_time") val apptTime: String? = null,
    val title: String,
    val kind: String = "checkup",
    val notes: String? = null,
    val done: Boolean = false
)

@Serializable
data class KickCount(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ended_at") val endedAt: String? = null,
    val kicks: Int = 0,
    val week: Int? = null
)

@Serializable
data class Contraction(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("started_at") val startedAt: String,
    @SerialName("duration_seconds") val durationSeconds: Int,
    val intensity: Int? = null
)

@Serializable
data class CommunityPost(
    val id: String? = null,
    @SerialName("author_id") val authorId: String,
    val category: String,
    val title: String,
    val body: String,
    @SerialName("is_anonymous") val isAnonymous: Boolean = true,
    @SerialName("like_count") val likeCount: Int = 0,
    @SerialName("comment_count") val commentCount: Int = 0,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class CommunityComment(
    val id: String? = null,
    @SerialName("post_id") val postId: String,
    @SerialName("author_id") val authorId: String,
    val body: String,
    @SerialName("is_anonymous") val isAnonymous: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class JournalEntry(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val content: String,
    val mood: String? = null,
    @SerialName("ai_insight") val aiInsight: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Mentor(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val headline: String,
    val bio: String? = null,
    val expertise: List<String> = emptyList(),
    @SerialName("hourly_rate") val hourlyRate: Double? = null,
    @SerialName("is_available") val isAvailable: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class ServiceListing(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("provider_name") val providerName: String,
    val craft: String,
    val price: String,
    val tags: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Opportunity(
    val id: String? = null,
    val title: String,
    val org: String,
    val region: String,
    val type: String,
    val url: String? = null,
    @SerialName("created_by") val createdBy: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class LibraryArticle(
    val id: String? = null,
    val title: String,
    val topic: String,
    val summary: String? = null,
    @SerialName("read_minutes") val readMinutes: Int = 5
)

@Serializable
data class TravelRequest(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val city: String,
    val country: String,
    val need: String,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class TravelHost(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    val city: String,
    val country: String,
    val note: String? = null,
    val verified: Boolean = false
)

/** travel_request_contacts row — one hidden contact per request. */
@Serializable
data class TravelRequestContact(
    @SerialName("request_id") val requestId: String,
    val contact: String,
    @SerialName("created_at") val createdAt: String? = null
)

/** travel_connections row — a connection request to one of my posts. */
@Serializable
data class TravelConnection(
    val id: String? = null,
    @SerialName("request_id") val requestId: String,
    @SerialName("from_user") val fromUser: String,
    @SerialName("to_user") val toUser: String,
    val message: String? = null,
    val status: String = "pending",
    @SerialName("contact_type") val contactType: String? = null,
    @SerialName("contact_handle") val contactHandle: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class SafePlace(
    val id: String? = null,
    @SerialName("submitted_by") val submittedBy: String,
    val name: String,
    @SerialName("place_type") val placeType: String,
    val city: String,
    val country: String,
    @SerialName("safety_score") val safetyScore: Double? = null,
    @SerialName("women_friendly_score") val womenFriendlyScore: Double? = null,
    @SerialName("review_count") val reviewCount: Int = 0,
    val notes: String? = null
)

@Serializable
data class SafetyAlert(
    val id: String? = null,
    @SerialName("alert_type") val alertType: String,
    val city: String,
    val country: String,
    val location: String? = null,
    val description: String,
    val severity: String = "medium",
    @SerialName("is_verified") val isVerified: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class Journey(
    val id: String? = null,
    val title: String,
    val tags: List<String> = emptyList(),
    @SerialName("created_by") val createdBy: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    // Embedded `journey_members(user_id)` row — filled by the journeys select, never inserted.
    @SerialName("journey_members") val journeyMembers: List<JourneyMember> = emptyList()
) {
    fun memberIds(): List<String> = journeyMembers.map { it.userId }
}

/** journey_members row (embedded under journeys, or a standalone insert). */
@Serializable
data class JourneyMember(
    @SerialName("journey_id") val journeyId: String = "",
    @SerialName("user_id") val userId: String = "",
    @SerialName("joined_at") val joinedAt: String = ""
)

@Serializable
data class JourneyMessage(
    val id: String? = null,
    @SerialName("journey_id") val journeyId: String,
    @SerialName("author_id") val authorId: String,
    val body: String? = null,
    @SerialName("is_anonymous") val isAnonymous: Boolean = true,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("attachment_path") val attachmentPath: String? = null,
    @SerialName("attachment_name") val attachmentName: String? = null,
    @SerialName("attachment_type") val attachmentType: String? = null,
    @SerialName("attachment_size") val attachmentSize: Long? = null,
    @SerialName("scan_status") val scanStatus: String? = null,
    @SerialName("scan_detail") val scanDetail: String? = null,
    @SerialName("scanned_at") val scannedAt: String? = null
)

/** message_reactions row. */
@Serializable
data class MessageReaction(
    val id: String? = null,
    @SerialName("message_id") val messageId: String,
    @SerialName("journey_id") val journeyId: String,
    @SerialName("user_id") val userId: String,
    val emoji: String,
    @SerialName("created_at") val createdAt: String? = null
)

/** message_views row — upserted on `message_id,viewer_id`. */
@Serializable
data class MessageView(
    val id: String? = null,
    @SerialName("message_id") val messageId: String,
    @SerialName("journey_id") val journeyId: String,
    @SerialName("viewer_id") val viewerId: String,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class PreconceptionItem(
    val id: String? = null,
    @SerialName("user_id") val userId: String,
    @SerialName("item_key") val itemKey: String,
    val done: Boolean = false,
    val note: String? = null
)
