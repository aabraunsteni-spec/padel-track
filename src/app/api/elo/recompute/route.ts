import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Elo recompute endpoint removed. Use finalize_match/delete_match RPCs." },
    { status: 410 },
  );
}
