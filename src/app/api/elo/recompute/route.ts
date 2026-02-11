import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { recomputeEloFromHistory } from "@/lib/elo";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
      supabase.from("jugadores").select("id, nombre"),
      supabase
        .from("partidos")
        .select("id, fecha, tipo_partido, equipo_1, equipo_2, equipo_1_ids, equipo_2_ids, sets_1, sets_2, games_1, games_2")
        .order("fecha", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (playersError || matchesError) {
      return NextResponse.json({ error: playersError?.message || matchesError?.message }, { status: 500 });
    }

    const { ratings, historyRows, baseRating } = recomputeEloFromHistory(players ?? [], matches ?? []);

    const resetPlayers = (players ?? []).map((p) => ({ id: p.id, elo_rating: baseRating }));
    if (resetPlayers.length > 0) {
      const { error } = await supabase.from("jugadores").upsert(resetPlayers, { onConflict: "id" });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const { error: clearHistoryError } = await supabase.from("elo_history").delete().neq("partido_id", "00000000-0000-0000-0000-000000000000");
    if (clearHistoryError) {
      return NextResponse.json({ error: clearHistoryError.message }, { status: 500 });
    }

    const finalRatings = Array.from(ratings.entries()).map(([id, rating]) => ({ id, elo_rating: Number(rating.toFixed(2)) }));
    if (finalRatings.length > 0) {
      const { error } = await supabase.from("jugadores").upsert(finalRatings, { onConflict: "id" });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (historyRows.length > 0) {
      const historyPayload = historyRows.map((row) => ({
        ...row,
        rating_before: Number(row.rating_before.toFixed(2)),
        rating_after: Number(row.rating_after.toFixed(2)),
        delta: Number(row.delta.toFixed(2)),
      }));

      const chunkSize = 200;
      for (let i = 0; i < historyPayload.length; i += chunkSize) {
        const chunk = historyPayload.slice(i, i + chunkSize);
        const { error } = await supabase.from("elo_history").insert(chunk);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ ok: true, playersUpdated: finalRatings.length, historyRows: historyRows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
