import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { recomputeEloFromHistory } from "@/lib/elo";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();

    const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
      supabase.from("jugadores").select("id, nombre, elo_rating"),
      supabase
        .from("partidos")
        .select("id, fecha, tipo_partido, equipo_1, equipo_2, equipo_1_ids, equipo_2_ids, sets_1, sets_2, games_1, games_2")
        .order("fecha", { ascending: true })
        .order("id", { ascending: true }),
    ]);

    if (playersError || matchesError) {
      console.error("[elo/recompute] fetch failed", {
        playersError: playersError?.message,
        matchesError: matchesError?.message,
      });
      return NextResponse.json(
        { error: "No se pudieron leer jugadores/partidos", detail: playersError?.message || matchesError?.message },
        { status: 500 },
      );
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ error: "No hay jugadores para recomputar Elo" }, { status: 400 });
    }

    const { ratings, historyRows } = recomputeEloFromHistory(players, matches ?? []);

    const { error: clearHistoryError } = await supabase
      .from("elo_history")
      .delete()
      .neq("partido_id", "00000000-0000-0000-0000-000000000000");

    if (clearHistoryError) {
      console.error("[elo/recompute] could not clear elo_history", clearHistoryError);
      return NextResponse.json(
        { error: "No se pudo limpiar elo_history", detail: clearHistoryError.message },
        { status: 500 },
      );
    }

    const playerUpdates = players.map((player) => ({
      id: player.id,
      elo_rating: Number((ratings.get(player.id) ?? 1500).toFixed(2)),
    }));

    const updateResults = await Promise.allSettled(
      playerUpdates.map((row) => supabase.from("jugadores").update({ elo_rating: row.elo_rating }).eq("id", row.id)),
    );

    const updateFailures = updateResults
      .map((result, index) => ({ result, playerId: playerUpdates[index].id }))
      .filter(({ result }) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error));

    if (updateFailures.length > 0) {
      const details = updateFailures.map(({ result, playerId }) => {
        if (result.status === "rejected") {
          return { playerId, message: result.reason instanceof Error ? result.reason.message : String(result.reason) };
        }

        return { playerId, message: result.value.error?.message || "Unknown update error" };
      });

      console.error("[elo/recompute] jugador updates failed", details);
      return NextResponse.json(
        { error: "Falló la actualización de elo_rating en jugadores", detail: details },
        { status: 500 },
      );
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
          console.error("[elo/recompute] elo_history insert failed", { chunkStart: i, message: error.message });
          return NextResponse.json(
            { error: "No se pudo insertar elo_history", detail: error.message, chunkStart: i },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json({
      ok: true,
      playersUpdated: playerUpdates.length,
      historyRows: historyRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[elo/recompute] unexpected error", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
