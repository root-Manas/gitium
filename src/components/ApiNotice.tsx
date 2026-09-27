"use client";
import { signIn } from "next-auth/react";
export function ApiNotice({ message, retry }: { message: string; retry?: () => void }) {
  const reconnect = message.includes("Reconnect GitHub");
  return <div className="status-banner" role="alert"><span>{message}</span>{reconnect ? <button onClick={() => signIn("github")}>Reconnect GitHub</button> : retry ? <button onClick={retry}>Retry</button> : null}</div>;
}
