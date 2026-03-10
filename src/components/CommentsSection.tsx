"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Image from "next/image";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string;
    githubLogin: string;
  };
}

export default function CommentsSection({ owner, repo }: { owner: string; repo: string }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/comments?owner=${owner}&repo=${repo}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim(), repoOwner: owner, repoName: repo }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [comment, ...prev]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-[#58a6ff]" />
        <h2 className="text-white font-semibold">Community Discussion</h2>
        <span className="text-[#8b949e] text-sm">({comments.length})</span>
      </div>

      {/* Comment form */}
      {session ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3">
            <Image
              src={session.user?.image || "/default-avatar.png"}
              alt="Your avatar"
              width={32}
              height={32}
              className="rounded-full border border-[#30363d] shrink-0"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Leave a comment..."
                rows={3}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:bg-[#21262d] disabled:text-[#8b949e] text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Posting..." : "Comment"}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-md p-4 mb-6 text-center">
          <p className="text-[#8b949e] text-sm mb-2">Sign in to join the discussion</p>
          <button
            onClick={() => signIn("github")}
            className="text-sm bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white px-4 py-1.5 rounded-md transition-colors"
          >
            Sign in with GitHub
          </button>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="text-[#8b949e] text-sm text-center py-4">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-[#8b949e] text-sm text-center py-4">
          No comments yet. Be the first to start a discussion!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 py-3 border-b border-[#21262d] last:border-0">
              <Image
                src={comment.user?.image || "/default-avatar.png"}
                alt={comment.user?.name || "User"}
                width={32}
                height={32}
                className="rounded-full border border-[#30363d] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#c9d1d9] text-sm font-medium">
                    {comment.user?.githubLogin || comment.user?.name || "Unknown"}
                  </span>
                  <span className="text-[#8b949e] text-xs">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[#c9d1d9] text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
