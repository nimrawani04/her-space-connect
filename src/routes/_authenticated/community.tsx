import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Radio,
  Search,
  X,
  Trash2,
  MessageCircle,
  Heart,
  Send,
  Sparkles,
  User,
  Lock,
  EyeOff,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: [{ title: "Safe Space · HerSpace" }] }),
  component: Community,
});

const CATEGORIES = [
  "Health",
  "Relationships",
  "Career",
  "Family",
  "Mental Health",
  "Education",
  "Marriage",
  "Sexual Health",
] as const;

type Post = {
  id: string;
  category: string;
  title: string;
  body: string;
  is_anonymous: boolean;
  author_id: string;
  created_at: string;
  like_count: number;
  comment_count?: number;
};

type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  is_anonymous: boolean;
  created_at: string;
};

// Local storage keys to track own posts & comments even in demo/local sessions
const MY_POST_IDS_KEY = "herspace_my_post_ids";
const MY_COMMENT_IDS_KEY = "herspace_my_comment_ids";

function getMyStoredIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveMyStoredId(key: string, id: string) {
  try {
    const set = getMyStoredIds(key);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage issues
  }
}

function removeMyStoredId(key: string, id: string) {
  try {
    const set = getMyStoredIds(key);
    set.delete(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage issues
  }
}

function Community() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myPostIds, setMyPostIds] = useState<Set<string>>(() => getMyStoredIds(MY_POST_IDS_KEY));
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("Health");
  const [anon, setAnon] = useState(true);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(false);

  // Expanded post comment drawers: Map of postId -> boolean
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Deleting post modal
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);

  // Check auth user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Load posts
  const loadPosts = useCallback(async () => {
    let q = supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (filter !== "all") {
      q = q.eq("category", filter);
    }

    const { data } = await q;
    if (data) {
      setPosts(data as Post[]);
    }
  }, [filter]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Real-time listener for posts
  useEffect(() => {
    const channel = supabase
      .channel("community_posts_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_posts" },
        (payload) => {
          const p = payload.new as Post;
          if (filter !== "all" && p.category !== filter) return;
          setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [p, ...prev]));
          toast.message("New post in Safe Space", { description: p.title });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "community_posts" },
        (payload) => {
          const p = payload.new as Post;
          setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_posts" },
        (payload) => {
          const old = payload.old as { id: string };
          setPosts((prev) => prev.filter((x) => x.id !== old.id));
        }
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  // Submit new post
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 8) {
      toast.error("Please add a title and a fuller message.");
      return;
    }
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    const userId = u.user?.id || currentUserId || "anonymous-sister";

    const { data, error } = await supabase
      .from("community_posts")
      .insert({
        author_id: userId,
        category,
        title: title.trim(),
        body: body.trim(),
        is_anonymous: anon,
      })
      .select()
      .single();

    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    if (data) {
      saveMyStoredId(MY_POST_IDS_KEY, data.id);
      setMyPostIds((prev) => new Set(prev).add(data.id));
      setPosts((prev) => (prev.some((x) => x.id === data.id) ? prev : [data as Post, ...prev]));
    }

    setTitle("");
    setBody("");
    toast.success("Shared with the sisterhood!");
    loadPosts();
  }

  // Delete own post
  async function handleDeletePost() {
    if (!postToDelete) return;
    const id = postToDelete.id;

    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) {
      toast.error(`Could not delete: ${error.message}`);
      return;
    }

    removeMyStoredId(MY_POST_IDS_KEY, id);
    setMyPostIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setPostToDelete(null);
    toast.success("Post removed from Safe Space.");
  }

  // Like a post
  async function handleLikePost(post: Post) {
    const updatedCount = (post.like_count || 0) + 1;
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, like_count: updatedCount } : p))
    );
    try {
      await supabase
        .from("community_posts")
        .update({ like_count: updatedCount })
        .eq("id", post.id);
    } catch {
      // Ignore background error
    }
  }

  // Toggle comments
  function toggleComments(postId: string) {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  // Filtered posts based on category and search query
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory = filter === "all" || p.category === filter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.body.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [posts, filter, searchQuery]);

  // Check if post belongs to current user
  function isAuthor(p: Post) {
    return (currentUserId && p.author_id === currentUserId) || myPostIds.has(p.id);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Sanctuary Header Card */}
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-4 sm:p-6 md:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Sisterhood Community
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] px-3 py-1 rounded-full border ${
              live
                ? "border-primary/30 text-primary bg-primary/10"
                : "border-border text-muted-foreground"
            }`}
          >
            <Radio className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} />{" "}
            {live ? "Live Real-Time Pulse" : "Connecting…"}
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
          Safe Space
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base leading-relaxed font-light">
          A safe, supportive space for honest conversation. Share freely, ask anonymously, and
          listen with kindness.
        </p>
      </header>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Share something form */}
        <Card className="md:col-span-5 rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs self-start">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="font-serif italic text-xl">Share something</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Post anonymously or with your sisterhood profile.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="What is on your heart or mind?"
                  className="rounded-xl text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Your thoughts</Label>
                <Textarea
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={4000}
                  placeholder="Share your experience, ask a question, or offer gentle encouragement..."
                  className="rounded-xl text-sm"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/60">
                <div>
                  <Label htmlFor="anon" className="text-xs font-semibold cursor-pointer">
                    Post anonymously
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Your name will appear as &quot;Anonymous sister&quot;
                  </p>
                </div>
                <Switch id="anon" checked={anon} onCheckedChange={setAnon} />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-earth text-earth-foreground hover:brightness-110"
              >
                {loading ? "Sharing…" : "Share to Safe Space"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Column: Feed with Filter, Search, and Posts */}
        <div className="md:col-span-7 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations by keyword or advice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full bg-card/85 border-border/80 text-sm h-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "outline"}
              className="rounded-full text-xs h-7 px-3"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            {CATEGORIES.map((c) => (
              <Button
                key={c}
                size="sm"
                variant={filter === c ? "default" : "outline"}
                className="rounded-full text-xs h-7 px-3"
                onClick={() => setFilter(c)}
              >
                {c}
              </Button>
            ))}
          </div>

          {/* Count and clear filters */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filteredPosts.length}</strong> posts
            </span>
            {(searchQuery || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setSearchQuery("");
                }}
                className="text-primary hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Empty state */}
          {filteredPosts.length === 0 && (
            <Card className="rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-2 bg-card/60">
              <p className="text-sm text-muted-foreground">
                {searchQuery || filter !== "all"
                  ? "No posts match your filters. Try clearing filters or searching another keyword."
                  : "No posts yet. Be the first sister to share using the form on the left!"}
              </p>
            </Card>
          )}

          {/* Posts Feed */}
          {filteredPosts.map((p) => {
            const isMine = isAuthor(p);
            const isCommentsOpen = Boolean(openComments[p.id]);

            return (
              <Card
                key={p.id}
                className="rounded-3xl bg-card/90 border border-border/80 backdrop-blur-md shadow-xs overflow-hidden transition-all duration-200 hover:border-primary/40"
              >
                <CardHeader className="pb-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="rounded-full text-[10px] font-normal">
                        {p.category}
                      </Badge>
                      <span className="font-medium text-foreground/80 flex items-center gap-1">
                        <User className="w-3 h-3 text-primary" />
                        {p.is_anonymous ? "Anonymous sister" : "Member"}
                      </span>
                      {isMine && (
                        <Badge
                          variant="secondary"
                          className="rounded-full text-[10px] px-2 py-0 font-normal bg-primary/10 text-primary border-primary/20"
                        >
                          You
                        </Badge>
                      )}
                      <span>·</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Delete post button - strictly for author */}
                    {isMine && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPostToDelete(p)}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                        title="Delete your post"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    )}
                  </div>

                  <CardTitle className="font-serif italic text-xl text-foreground mt-1 break-words">
                    {p.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90 font-light">
                    {p.body}
                  </p>

                  {/* Actions Bar: Like + Comments toggle */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleLikePost(p)}
                        className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        <span>{p.like_count || 0}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleComments(p.id)}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-primary" />
                        <span>
                          {isCommentsOpen ? "Hide comments" : "Comments"} (
                          {p.comment_count ?? 0})
                        </span>
                      </button>
                    </div>

                    <span className="text-[11px] text-muted-foreground/80">
                      Real-time Safe Space
                    </span>
                  </div>

                  {/* Comments Section */}
                  {isCommentsOpen && (
                    <CommentsDrawer
                      postId={p.id}
                      isPostAuthor={isMine}
                      currentUserId={currentUserId}
                      onCommentAdded={() => {
                        setPosts((prev) =>
                          prev.map((item) =>
                            item.id === p.id
                              ? { ...item, comment_count: (item.comment_count || 0) + 1 }
                              : item
                          )
                        );
                      }}
                      onCommentDeleted={() => {
                        setPosts((prev) =>
                          prev.map((item) =>
                            item.id === p.id
                              ? {
                                  ...item,
                                  comment_count: Math.max(0, (item.comment_count || 1) - 1),
                                }
                              : item
                          )
                        );
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog for Post Deletion */}
      <AlertDialog
        open={Boolean(postToDelete)}
        onOpenChange={(open) => !open && setPostToDelete(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif italic text-xl">
              Delete this post?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to remove &quot;{postToDelete?.title}&quot; from Safe Space?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePost}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Subcomponent: Comments Drawer for a post
function CommentsDrawer({
  postId,
  isPostAuthor,
  currentUserId,
  onCommentAdded,
  onCommentDeleted,
}: {
  postId: string;
  isPostAuthor: boolean;
  currentUserId: string | null;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentBody, setNewCommentBody] = useState("");
  const [isAnon, setIsAnon] = useState(true);
  const [isPrivateOnly, setIsPrivateOnly] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myCommentIds, setMyCommentIds] = useState<Set<string>>(() =>
    getMyStoredIds(MY_COMMENT_IDS_KEY)
  );

  // Load comments for this post
  const loadComments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (data) {
        setComments(data as Comment[]);
      }
    } catch {
      // Ignore error
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Realtime comments subscription
  useEffect(() => {
    const channel = supabase
      .channel(`comments_post_${postId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_comments",
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          const c = payload.new as Comment;
          setComments((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "community_comments",
        },
        (payload) => {
          const old = payload.old as { id: string };
          setComments((prev) => prev.filter((x) => x.id !== old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  // Visible comments: Filter so private comments are ONLY shown to post author or commenter
  const visibleComments = useMemo(() => {
    return comments.filter((c) => {
      const isPrivate = c.body.startsWith("[PRIVATE_TO_AUTHOR]");
      const isMyComment =
        (currentUserId && c.author_id === currentUserId) || myCommentIds.has(c.id);

      // If private to author: ONLY post author and commenter can see
      if (isPrivate) {
        return isPostAuthor || isMyComment;
      }
      return true;
    });
  }, [comments, isPostAuthor, currentUserId, myCommentIds]);

  const privateCount = comments.filter((c) => c.body.startsWith("[PRIVATE_TO_AUTHOR]")).length;

  // Submit comment
  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newCommentBody.trim()) return;
    setSubmitting(true);

    const { data: u } = await supabase.auth.getUser();
    const authorId = u.user?.id || currentUserId || "anonymous-sister";
    const prefix = isPrivateOnly ? "[PRIVATE_TO_AUTHOR]" : "";
    const bodyToInsert = `${prefix}${newCommentBody.trim()}`;

    const { data, error } = await supabase
      .from("community_comments")
      .insert({
        post_id: postId,
        author_id: authorId,
        body: bodyToInsert,
        is_anonymous: isAnon,
      })
      .select()
      .single();

    setSubmitting(false);

    if (error) {
      toast.error(`Comment error: ${error.message}`);
      return;
    }

    if (data) {
      saveMyStoredId(MY_COMMENT_IDS_KEY, data.id);
      setMyCommentIds((prev) => new Set(prev).add(data.id));
      setComments((prev) =>
        prev.some((x) => x.id === data.id) ? prev : [...prev, data as Comment]
      );
    }

    setNewCommentBody("");
    if (isPrivateOnly) {
      toast.success("Private note sent! Visible only to the post author.");
    } else {
      toast.success(isAnon ? "Comment added anonymously!" : "Comment posted!");
    }
    onCommentAdded();
  }

  // Delete own comment
  async function handleDeleteComment(commentId: string) {
    const { error } = await supabase.from("community_comments").delete().eq("id", commentId);
    if (error) {
      toast.error(error.message);
      return;
    }

    removeMyStoredId(MY_COMMENT_IDS_KEY, commentId);
    setMyCommentIds((prev) => {
      const next = new Set(prev);
      next.delete(commentId);
      return next;
    });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success("Comment deleted.");
    onCommentDeleted();
  }

  return (
    <div className="pt-3 border-t border-border/60 space-y-3 bg-secondary/30 -mx-4 -mb-4 p-4 rounded-b-3xl">
      <div className="text-xs font-semibold text-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Comments ({visibleComments.length})</span>
          {isPostAuthor && privateCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0 rounded-full font-medium border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-1"
            >
              <Lock className="w-2.5 h-2.5" /> {privateCount} private for you
            </Badge>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground font-normal">
          Encouragement &amp; Support
        </span>
      </div>

      {/* Comments List */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Loading comments…</p>
      ) : visibleComments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No comments yet. Leave a kind word or private note for this sister.
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {visibleComments.map((c) => {
            const isMyComment =
              (currentUserId && c.author_id === currentUserId) || myCommentIds.has(c.id);
            const isPrivate = c.body.startsWith("[PRIVATE_TO_AUTHOR]");
            const cleanBody = isPrivate ? c.body.replace("[PRIVATE_TO_AUTHOR]", "").trim() : c.body;

            return (
              <div
                key={c.id}
                className={`p-2.5 rounded-2xl border text-xs space-y-1 shadow-2xs transition-colors ${
                  isPrivate
                    ? "bg-amber-500/5 border-amber-500/30"
                    : "bg-card border-border/70"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-foreground/80">
                      {c.is_anonymous ? "Anonymous sister" : "Member"}
                    </span>
                    {isMyComment && (
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 rounded-full font-normal"
                      >
                        You
                      </Badge>
                    )}
                    {isPrivate && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 rounded-full font-medium border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center gap-1"
                      >
                        <Lock className="w-2.5 h-2.5" /> Only author can see
                      </Badge>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(c.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {isMyComment && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                      title="Delete your comment"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap font-light">{cleanBody}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Comment Form */}
      <form onSubmit={handleAddComment} className="space-y-2.5 pt-1">
        <Textarea
          rows={2}
          value={newCommentBody}
          onChange={(e) => setNewCommentBody(e.target.value)}
          placeholder={
            isPrivateOnly
              ? "Write a private note visible ONLY to the person who posted this..."
              : "Write a supportive reply or gentle advice..."
          }
          className="rounded-xl text-xs bg-background"
          required
        />

        {/* Private Option Toggle */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-background/80 border border-border/60">
          <div className="space-y-0.5">
            <Label
              htmlFor={`private-${postId}`}
              className="text-xs font-medium cursor-pointer flex items-center gap-1.5 text-foreground"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Only post author can see
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Visible only to you and the person who wrote this post. Hidden from everyone else.
            </p>
          </div>
          <Switch
            id={`private-${postId}`}
            checked={isPrivateOnly}
            onCheckedChange={setIsPrivateOnly}
          />
        </div>

        {/* Anonymous and Submit row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
            <Switch checked={isAnon} onCheckedChange={setIsAnon} className="scale-75" />
            <span>Comment anonymously</span>
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !newCommentBody.trim()}
            className="rounded-full text-xs h-7 px-3 gap-1 bg-primary text-primary-foreground cursor-pointer"
          >
            <Send className="w-3 h-3" /> {isPrivateOnly ? "Send private note" : "Reply"}
          </Button>
        </div>
      </form>
    </div>
  );
}