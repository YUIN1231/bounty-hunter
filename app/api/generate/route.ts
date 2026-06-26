import { NextRequest, NextResponse } from "next/server";
import { analyzeCompetition } from "@/lib/intelligence";
import { generateSubmission, improveSubmission } from "@/lib/generator";

export async function POST(req: NextRequest) {
  try {
    const { url, description, improve, currentSubmission, focusArea } = await req.json();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // 1. コンペを分析
    const intelligence = await analyzeCompetition(url, description || "");

    // 2. 提出物を生成 or 改善
    let submission;
    if (improve && currentSubmission) {
      submission = await improveSubmission(currentSubmission, intelligence, focusArea || "overall quality");
    } else {
      submission = await generateSubmission(intelligence, url);
    }

    return NextResponse.json({
      ok: true,
      intelligence,
      submission,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
