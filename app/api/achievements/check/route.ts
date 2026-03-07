import { NextRequest, NextResponse } from "next/server";
import { checkAndAwardAchievements } from "@/lib/achievements/engine";

export async function POST(req: NextRequest) {
  const { userId, accessToken } = await req.json();
  if (!userId || !accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const newAchievements = await checkAndAwardAchievements(userId, accessToken);
  return NextResponse.json({ newAchievements });
}
