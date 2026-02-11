import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { RecomputeStatsError, recomputeStatsFromHistory } from "@/lib/stats";

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
      return NextResponse.json(
        { error: "No se pudieron leer jugadores/partidos", detail: playersError?.message || matchesError?.message },
        { status: 500 },
      );
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ error: "No hay jugadores para recomputar stats" }, { status: 400 });
    }

    const { error: resetError } = await supabase
      .from("jugadores")
      .update({ partidos_jugados: 0, partidos_ganados: 0, games_favor: 0, games_contra: 0 })
      .not("id", "is", null);

    if (resetError) {
      return NextResponse.json(
        { error: "No se pudo resetear stats", detail: resetError.message },
        { status: 500 },
      );
    }

    const { updates } = recomputeStatsFromHistory(players, matches ?? []);

    const updateRows = players.map((player) => ({ id: player.id, ...(updates.get(player.id) ?? { partidos_jugados: 0, partidos_ganados: 0, games_favor: 0, games_contra: 0 }) }));

    const updateResults = await Promise.allSettled(
      updateRows.map((row) =>
        supabase
          .from("jugadores")
          .update({
            partidos_jugados: row.partidos_jugados,
            partidos_ganados: row.partidos_ganados,
            games_favor: row.games_favor,
            games_contra: row.games_contra,
          })
          .eq("id", row.id),
      ),
    );

    const updateFailures = updateResults
      .map((result, index) => ({ result, playerId: updateRows[index].id }))
      .filter(({ result }) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error));

    if (updateFailures.length > 0) {
      const detail = updateFailures.map(({ result, playerId }) => {
        if (result.status === "rejected") {
          return { playerId, message: result.reason instanceof Error ? result.reason.message : String(result.reason) };
        }

        return { playerId, message: result.value.error?.message || "Unknown update error" };
      });

      return NextResponse.json(
        { error: "Falló la actualización de stats en jugadores", detail },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      playersUpdated: updateRows.length,
      matchesProcessed: (matches ?? []).length,
    });
  } catch (error) {
    if (error instanceof RecomputeStatsError) {
      return NextResponse.json(
        { error: error.message, detail: error.details },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
