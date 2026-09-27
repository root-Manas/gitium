"use client";
import { useEffect, useRef } from "react";
export function EncryptedChat({
  conversation,
}: {
  conversation?: { scope: string; target: string };
}) {
  const root = useRef<HTMLDivElement>(null);
  const scope = conversation?.scope;
  const target = conversation?.target;
  useEffect(() => {
    let dispose: (() => void) | undefined;
    let cancelled = false;
    const path = "/e2ee/ui.mjs";
    import(/* webpackIgnore: true */ path)
      .then((module) => {
        if (!cancelled && root.current)
          dispose = module.mount(root.current, scope && target ? { scope, target } : undefined);
      })
      .catch(() => {
        if (!cancelled && root.current)
          root.current.textContent =
            "Encrypted chat could not load. Reload to retry. No plaintext was sent.";
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [scope, target]);
  return (
    <div ref={root} className="wide-page">
      <p>Opening encrypted chat…</p>
    </div>
  );
}
