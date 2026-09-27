'use client';
import { useEffect, useRef } from 'react';
export function EncryptedChat() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let dispose: (() => void) | undefined; let cancelled = false;
    const path = '/e2ee/ui.mjs';
    import(/* webpackIgnore: true */ path).then(module => { if (!cancelled && root.current) dispose = module.mount(root.current); });
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return <div ref={root} className="wide-page"><p>Opening local encrypted chat…</p></div>;
}
