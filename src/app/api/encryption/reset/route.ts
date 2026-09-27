import { NextRequest } from "next/server";
import { checkWrite, currentUser, json, requireD1 } from "@/lib/api";
import { runD1 } from "@/lib/d1";
import { encryptionEnabled } from "@/lib/encryption";
export async function POST(request: NextRequest) {
  const invalid = await checkWrite(request);
  if (invalid) return invalid;
  const user = await currentUser();
  if (!user) return json({ error: "Sign in first." }, 401);
  if (!encryptionEnabled())
    return json({ error: "Encrypted chat is unavailable." }, 503);
  const unavailable = requireD1();
  if (unavailable) return unavailable;
  try {
    const input = await request.json();
    if (input.confirmation !== "RESET MY DEVICES")
      return json({ error: "Type RESET MY DEVICES to confirm." }, 400);
    const now = Date.now();
    const permitted = await runD1(
      "INSERT INTO e2ee_resets(user_id,created_at) VALUES(?1,?2) ON CONFLICT(user_id) DO UPDATE SET created_at=?2 WHERE created_at<?3",
      [user.id, now, now - 600000],
    );
    if (!permitted.changes)
      return json(
        { error: "Wait ten minutes before resetting devices again." },
        429,
      );
    await runD1(
      "UPDATE e2ee_devices SET revoked=1 WHERE user_id=? AND revoked=0",
      [user.id],
    );
    return json({ reset: true });
  } catch {
    return json({ error: "Device reset failed. Try again later." }, 500);
  }
}
