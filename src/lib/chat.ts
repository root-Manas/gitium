import { queryD1 } from './d1';

export const validRoomId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export async function isRoomMember(roomId: string, userId: string): Promise<boolean> {
  if (!validRoomId(roomId) || !userId) return false;
  const rows = await queryD1<{ allowed: number }>('SELECT 1 AS allowed FROM room_members WHERE room_id=? AND user_id=? LIMIT 1', [roomId, userId]);
  return rows.length > 0;
}
