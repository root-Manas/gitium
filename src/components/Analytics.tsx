"use client";
import { Analytics } from "@vercel/analytics/next";
export function SiteAnalytics() {
  return <Analytics beforeSend={event => {
    const url = new URL(event.url);
    if (/^\/(spaces|encrypted-chat|api\/auth)(\/|$)/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    if (url.pathname.startsWith("/u/")) url.pathname = "/u/[login]";
    return { ...event, url: url.toString() };
  }} />;
}
