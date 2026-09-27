package com.herspace.connect.data.repository

import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.Contraction
import com.herspace.connect.data.model.KickCount
import com.herspace.connect.data.model.PreconceptionItem
import com.herspace.connect.data.model.PregnancyAppointment
import com.herspace.connect.data.model.PregnancyHealthLog
import com.herspace.connect.data.model.PregnancyProfile
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order

class PregnancyRepository {
    private val client get() = SupabaseProvider.client

    suspend fun myProfile(): PregnancyProfile? {
        val uid = SupabaseProvider.currentUserId() ?: return null
        return client.postgrest["pregnancy_profiles"]
            .select { filter { eq("user_id", uid) }; limit(1) }
            .decodeSingleOrNull<PregnancyProfile>()
    }

    suspend fun saveProfile(profile: PregnancyProfile) {
        client.postgrest["pregnancy_profiles"].upsert(profile)
    }

    suspend fun healthLogs(): List<PregnancyHealthLog> =
        client.postgrest["pregnancy_health_logs"]
            .select { order("log_date", Order.DESCENDING); limit(60) }
            .decodeList()

    suspend fun saveHealthLog(log: PregnancyHealthLog) {
        client.postgrest["pregnancy_health_logs"].upsert(log)
    }

    suspend fun appointments(): List<PregnancyAppointment> =
        client.postgrest["pregnancy_appointments"]
            .select { order("appt_date", Order.ASCENDING) }
            .decodeList()

    suspend fun saveAppointment(a: PregnancyAppointment) {
        client.postgrest["pregnancy_appointments"].upsert(a)
    }

    suspend fun checklist(): List<PreconceptionItem> =
        client.postgrest["preconception_checklist"].select {}.decodeList()

    suspend fun toggleChecklist(item: PreconceptionItem) {
        client.postgrest["preconception_checklist"].upsert(item.copy(done = !item.done))
    }

    suspend fun startKickSession(userId: String, week: Int?): KickCount {
        val s = KickCount(userId = userId, startedAt = nowIso(), week = week)
        client.postgrest["kick_counts"].insert(s)
        return s
    }

    suspend fun logContraction(userId: String, durationSeconds: Int, intensity: Int?) {
        client.postgrest["contractions"].insert(
            Contraction(userId = userId, startedAt = nowIso(), durationSeconds = durationSeconds, intensity = intensity)
        )
    }

    private fun nowIso(): String = java.time.Instant.now().toString()
}
