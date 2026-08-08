import { NextResponse } from "next/server";
import { getAnalysisCount } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const count = await getAnalysisCount();
  if (count === null) {
    // No database connected yet, or the query failed — tell the landing page to hide the counter
    // rather than show a misleading "0".
    return NextResponse.json({ count: null }, { status: 200 });
  }
  return NextResponse.json({ count });
}
