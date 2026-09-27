import { NextRequest } from 'next/server';
import { currentUser, checkWrite, json, requireD1 } from '@/lib/api';
import { runD1 } from '@/lib/d1';
import { EncryptionService, CryptoError } from '@/lib/encryption-service.mjs';

export async function POST(request: NextRequest) {
  if (process.env.GITIUM_E2EE_ENABLED !== 'local-candidate') return json({ error: 'Not found.' }, 404);
  const invalid = await checkWrite(request, 131072); if (invalid) return invalid;
  const user = await currentUser(); if (!user) return json({ error: 'Sign in first.' }, 401);
  const unavailable = requireD1(); if (unavailable) return unavailable;
  try {
    const service = new EncryptionService(runD1);
    return json(await service.handle(user.id, await request.json()));
  } catch (error) {
    if (error instanceof CryptoError) return json({ error: error.message }, error.status);
    // Do not log request bodies, ciphertext or keys.
    return json({ error: 'Encrypted chat is unavailable. No plaintext was sent.' }, 500);
  }
}
