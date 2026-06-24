import { NextResponse } from "next/server";
import { loadOpportunities } from "@/lib/scanner";

export async function GET() {
  const opportunities = loadOpportunities();
  return NextResponse.json({ opportunities });
}
