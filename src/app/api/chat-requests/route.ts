import { NextRequest } from 'next/server';
import { apiError, checkWrite, currentUser, json, requireD1 } from '@/lib/api';
import { queryD1, runD1 } from '@/lib/d1';
import { resolvePeer } from '@/lib/chat';

export async function GET() {
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const requests = await queryD1("SELECT d.status,d.recipient_id,u.github_id AS id,u.github_login AS login FROM dm_requests d JOIN users u ON u.github_id=CASE WHEN d.requester_id=?1 THEN d.recipient_id ELSE d.requester_id END WHERE (d.requester_id=?1 OR d.recipient_id=?1) AND NOT EXISTS(SELECT 1 FROM chat_blocks b WHERE (b.blocker_id=?1 AND b.blocked_id=u.github_id) OR (b.blocker_id=u.github_id AND b.blocked_id=?1)) ORDER BY d.updated_at DESC LIMIT 100", [user.id]);
    const blocked = await queryD1('SELECT u.github_id AS id,u.github_login AS login FROM chat_blocks b JOIN users u ON u.github_id=b.blocked_id WHERE b.blocker_id=? LIMIT 500', [user.id]);
    return json({ requests, blocked });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const input = await request.json(); const peer = await resolvePeer(input.target, user.id);
    if (!peer) return json({ error: 'Choose another person who has signed in to Gitium.' }, 403);
    const action = String(input.action || '');
    const unblocked = 'NOT EXISTS(SELECT 1 FROM chat_blocks WHERE (blocker_id=?2 AND blocked_id=?3) OR (blocker_id=?3 AND blocked_id=?2))';
    let result;
    if (action === 'request') {
      result = await runD1(`INSERT OR IGNORE INTO dm_requests(pair,requester_id,recipient_id) SELECT ?1,?2,?3 WHERE ${unblocked} AND (SELECT COUNT(*) FROM dm_requests WHERE requester_id=?2 AND created_at>datetime('now','-1 day'))<10 AND (SELECT COUNT(*) FROM dm_requests WHERE requester_id=?2)<500`, [peer.pair, user.id, peer.id]);
    } else if (action === 'accept' || action === 'decline') {
      result = await runD1(`UPDATE dm_requests SET status=?4,updated_at=datetime('now') WHERE pair=?1 AND recipient_id=?2 AND requester_id=?3 AND status='pending' AND ${unblocked}`, [peer.pair, user.id, peer.id, action === 'accept' ? 'accepted' : 'declined']);
    } else if (action === 'cancel') {
      result = await runD1("UPDATE dm_requests SET status='cancelled',updated_at=datetime('now') WHERE pair=? AND requester_id=? AND status='pending'", [peer.pair, user.id]);
    } else if (action === 'block') {
      result = await runD1('INSERT OR IGNORE INTO chat_blocks(blocker_id,blocked_id) SELECT ?1,?2 WHERE (SELECT COUNT(*) FROM chat_blocks WHERE blocker_id=?1)<500', [user.id, peer.id]);
    } else if (action === 'unblock') {
      // Revoke consent before unblocking, so old threads do not silently reopen.
      await runD1("UPDATE dm_requests SET status='cancelled',updated_at=datetime('now') WHERE pair=?1 AND EXISTS(SELECT 1 FROM chat_blocks WHERE blocker_id=?2 AND blocked_id=?3)", [peer.pair, user.id, peer.id]);
      result = await runD1('DELETE FROM chat_blocks WHERE blocker_id=? AND blocked_id=?', [user.id, peer.id]);
    } else if (action === 'reopen') {
      // Only the original recipient can restart a declined/cancelled request, with roles reversed.
      result = await runD1(`UPDATE dm_requests SET requester_id=?2,recipient_id=?3,status='pending',created_at=datetime('now'),updated_at=datetime('now') WHERE pair=?1 AND recipient_id=?2 AND status IN ('declined','cancelled') AND ${unblocked} AND (SELECT COUNT(*) FROM dm_requests WHERE requester_id=?2 AND created_at>datetime('now','-1 day'))<10`, [peer.pair, user.id, peer.id]);
    } else return json({ error: 'Unknown chat action.' }, 400);
    if (!result.changes) return json({ error: 'Request unavailable, already handled, or request limit reached.' }, 409);
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
