package com.herspace.connect.data.repository

import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.CycleEntry
import com.herspace.connect.data.model.FertilityLog
import com.herspace.connect.data.model.WellnessLog
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order

class HealthRepository {
    private val client get() = SupabaseProvider.client

    suspend fun recentCycleEntries(limit: Long = 60): List<CycleEntry> =
        client.postgrest["cycle_entries"]
            .select { order("entry_date", Order.DESCENDING); limit(limit) }
            .decodeList()

    suspend fun upsertCycleEntry(entry: CycleEntry) {
        client.postgrest["cycle_entries"].upsert(entry) {
            onConflict = "user_id,entry_date"
        }
    }

    suspend fun logWellness(log: WellnessLog) {
        client.postgrest["wellness_logs"].upsert(log) {
            onConflict = "user_id,log_date"
        }
    }

    suspend fun recentWellness(limit: Long = 30): List<WellnessLog> =
        client.postgrest["wellness_logs"]
            .select { order("log_date", Order.DESCENDING); limit(limit) }
            .decodeList()

    suspend fun logFertility(log: FertilityLog) {
        client.postgrest["fertility_logs"].upsert(log) {
            onConflict = "user_id,log_date"
        }
    }

    suspend fun recentFertility(limit: Long = 30): List<FertilityLog> =
        client.postgrest["fertility_logs"]
            .select { order("log_date", Order.DESCENDING); limit(limit) }
            .decodeList()
}
