import { NextRequest } from "next/server";
import { apiError, checkWrite, currentUser, json, requireD1 } from "@/lib/api";
import { queryD1, runD1 } from "@/lib/d1";
import { dmState, resolvePeer, isRoomMember, validRoomId } from "@/lib/chat";

type Message = {
  id: string;
  scope: string;
  target: string;
  author_id: string;
  author_login: string;
  body: string;
  created_at: string;
};

async function privateTarget(scope: unknown, target: unknown, userId: string) {
  if (scope === "room") {
    const id = String(target || "");
    return validRoomId(id) && (await isRoomMember(id, userId))
      ? { scope: "room", target: id }
      : null;
  }
  if (scope !== "dm") return null;
  const peer = await resolvePeer(target, userId);
  if (!peer) return null;
  return {
    scope: "dm_v2",
    target: peer.pair,
    peer: { id: peer.id, login: peer.login },
    consent: await dmState(peer.pair, userId, peer.id),
  };
}

// Enforce revocation in the mutation itself, not only in a preceding read.
const membership =
  "((scope='dm_v2' AND EXISTS(SELECT 1 FROM dm_allowed WHERE pair=messages.target)) OR (scope='room' AND EXISTS(SELECT 1 FROM room_members WHERE room_id=messages.target AND user_id=?)))";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user)
    return json({ error: "Sign in with GitHub to read messages." }, 401);
  const unavailable = requireD1();
  if (unavailable) return unavailable;
  try {
    const url = new URL(request.url);
    const space = await privateTarget(
      url.searchParams.get("scope"),
      url.searchParams.get("target"),
      user.id,
    );
    if (!space)
      return json(
        {
          error:
            "This chat is unavailable. Direct messages require both people to have signed in to Gitium.",
        },
        403,
      );
    if ("consent" in space && space.consent?.status !== "accepted")
      return json({ messages: [], peer: space.peer, consent: space.consent });
    const messages = await queryD1<Message>(
      `SELECT id,scope,target,author_id,author_login,body,created_at FROM messages WHERE scope=? AND target=? AND ${membership} ORDER BY created_at DESC,id DESC LIMIT 100`,
      [space.scope, space.target, user.id],
    );
    return json({
      messages: messages.reverse(),
      peer: "peer" in space ? space.peer : undefined,
      consent: "consent" in space ? space.consent : undefined,
    });
  } catch (error) {
    return apiError(error);
  }
}

// Legacy history remains readable/deletable. Every new message must use E2EE,
// even if the feature flag is disabled during a service interruption.
export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request);
  if (invalid) return invalid;
  const user = await currentUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  return json(
    {
      error:
        "Plaintext chat is read-only. Use encrypted chat to send a new message.",
    },
    409,
  );
}
export const PATCH = POST;

export async function DELETE(request: NextRequest) {
  const invalid = await checkWrite(request);
  if (invalid) return invalid;
  const user = await currentUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  const unavailable = requireD1();
  if (unavailable) return unavailable;
  try {
    const id = String((await request.json()).id || "");
    if (!validRoomId(id)) return json({ error: "Invalid message." }, 400);
    const result = await runD1(
      `DELETE FROM messages WHERE id=? AND author_id=? AND ${membership}`,
      [id, user.id, user.id],
    );
    return result.changes
      ? json({ id })
      : json({ error: "Message unavailable or access revoked." }, 403);
  } catch (error) {
    return apiError(error);
  }
}
