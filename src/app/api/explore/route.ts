import { NextRequest, NextResponse } from "next/server";
import { exploreQuery } from "@/lib/explore";
import { loadExplore } from "@/lib/explore-server";
import { json } from "@/lib/api";
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  try {
    exploreQuery(params);
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
  try {
    return NextResponse.json(await loadExplore(params), {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=900",
      },
    });
  } catch {
    return json(
      {
        error:
          "GitHub search is busy right now. Try the Essentials catalog, or retry in a minute.",
      },
      503,
    );
  }
}
