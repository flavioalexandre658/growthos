import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";

export const dynamic = "force-dynamic";
import { lt } from "drizzle-orm";
import dayjs from "@/utils/dayjs";

const DELETE_AFTER_DAYS = 37;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const deleteBefore = dayjs()
    .subtract(DELETE_AFTER_DAYS, "days")
    .startOf("day")
    .toDate();

  await db.delete(events).where(lt(events.createdAt, deleteBefore));

  return NextResponse.json({
    ok: true,
    deletedBefore: deleteBefore.toISOString(),
  });
}
