package com.herspace.connect.data.repository

import com.herspace.connect.core.data.SupabaseProvider
import com.herspace.connect.data.model.CommunityComment
import com.herspace.connect.data.model.CommunityPost
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Order

class CommunityRepository {
    private val client get() = SupabaseProvider.client

    suspend fun posts(category: String? = null): List<CommunityPost> =
        client.postgrest["community_posts"].select {
            order("created_at", Order.DESCENDING)
            limit(50)
            if (category != null) filter { eq("category", category) }
        }.decodeList()

    suspend fun createPost(post: CommunityPost) {
        client.postgrest["community_posts"].insert(post)
    }

    suspend fun comments(postId: String): List<CommunityComment> =
        client.postgrest["community_comments"].select {
            filter { eq("post_id", postId) }
            order("created_at", Order.ASCENDING)
        }.decodeList()

    suspend fun addComment(comment: CommunityComment) {
        client.postgrest["community_comments"].insert(comment)
    }
}
