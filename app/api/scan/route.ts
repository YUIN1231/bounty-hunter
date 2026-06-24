import { NextResponse } from "next/server";
import { runScan } from "@/lib/scanner";

export async function POST() {
  try {
    const opportunities = await runScan();
    return NextResponse.json({ ok: true, count: opportunities.length, opportunities });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
