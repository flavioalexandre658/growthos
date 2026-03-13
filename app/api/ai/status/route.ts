import { NextRequest, NextResponse } from "next/server";
import { getAiQueue } from "@/lib/queue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const queue = getAiQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const state = await job.getState();

  if (state === "completed") {
    return NextResponse.json({
      status: "completed",
      result: job.returnvalue,
    });
  }

  if (state === "failed") {
    return NextResponse.json({
      status: "failed",
      error: job.failedReason ?? "Unknown error",
      attemptsMade: job.attemptsMade,
    });
  }

  return NextResponse.json({
    status: state,
    attemptsMade: job.attemptsMade,
  });
}
