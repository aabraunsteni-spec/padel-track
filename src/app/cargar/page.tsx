"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Jugador, MatchFormat, MatchRow } from "@/lib/types";
import { getOrCreateFridaySession, validateSetScore } from "@/lib/matches";

type SetForm = { set_no: number; games_team1: string; games_team2: string };

const emptySet = (setNo: number): SetForm => ({ set_no: setNo, games_team1: "", games_team2: "" });

const defaultTuesdaySets = [emptySet(1), emptySet(2)];

const getFridayFormatFromSet = (set: SetForm): MatchFormat | null => {
  const a = Number(set.games_team1);
  const b = Number(set.games_team2);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return null;

  if (validateSetScore(a, b, "bo1_4")) return "bo1_4";
  if (validateSetScore(a, b, "bo1_6tb")) return "bo1_6tb";
  return null;
};

const getDraftFormat = (type: "martes" | "viernes", format: MatchFormat, sets: SetForm[]): MatchFormat | null => {
  if (type === "martes") return "bo3_6tb";

  const fromSet = sets.length === 1 ? getFridayFormatFromSet(sets[0]) : null;
  if (fromSet) return fromSet;

  if (format === "bo1_4" || format === "bo1_6tb") return format;
  return null;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }

  return "Error guardando draft";
};

export default function CargarPartidoPage() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [type, setType] = useState<"martes" | "viernes">("martes");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [team1, setTeam1] = useState<string[]>(["", ""]);
  const [team2, setTeam2] = useState<string[]>(["", ""]);
  const [sets, setSets] = useState<SetForm[]>(defaultTuesdaySets);
  const [format, setFormat] = useState<MatchFormat>("bo3_6tb");
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const [{ data: players }, { data: matchData }] = await Promise.all([
      supabase.from("jugadores").select("id, nombre, slug").order("nombre", { ascending: true }),
      supabase
        .from("matches")
        .select("id, played_at, type, format, status, winner_team, games_team1, games_team2, created_at, sessions(session_date), match_players(team, player_id, jugadores(id, nombre)), match_sets(set_no, games_team1, games_team2)")
        .order("played_at", { ascending: false })
        .limit(20),
    ]);

    if (players) setJugadores(players as Jugador[]);
    if (matchData) setMatches(matchData as unknown as MatchRow[]);
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (type === "viernes") {
      setFormat("bo1_6tb");
      setSets([emptySet(1)]);
      return;
    }

    setFormat("bo3_6tb");
    setSets(defaultTuesdaySets);
  }, [type]);

  const validationError = useMemo(() => {
    const allPlayers = [...team1, ...team2];
    if (allPlayers.some((id) => !id)) return "Seleccioná 4 jugadores";
    if (new Set(allPlayers).size !== 4) return "Los 4 jugadores deben ser distintos";

    if (type === "viernes" && sets.length !== 1) return "Viernes requiere exactamente 1 set";
    if (type === "martes" && (sets.length < 2 || sets.length > 3)) return "Martes requiere 2 o 3 sets";

    const safeFormat = getDraftFormat(type, format, sets);
    if (!safeFormat) return "Formato de viernes inválido";

    let t1 = 0;
    let t2 = 0;
    for (const set of sets) {
      const a = Number(set.games_team1);
      const b = Number(set.games_team2);
      if (!Number.isInteger(a) || !Number.isInteger(b)) return `Completá el set ${set.set_no}`;
      if (!validateSetScore(a, b, safeFormat)) return `Set inválido en set ${set.set_no}: ${a}-${b}`;
      if (a > b) t1 += 1;
      if (b > a) t2 += 1;
    }

    if (type === "viernes" && Math.max(t1, t2) !== 1) return "Viernes debe tener 1 set ganador";
    if (type === "martes" && Math.max(t1, t2) !== 2) return "Martes debe tener 2 sets ganados";

    return null;
  }, [format, sets, team1, team2, type]);

  const saveDraft = async () => {
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);
      const sessionId = type === "viernes" ? await getOrCreateFridaySession(sessionDate) : null;
      const safeFormat = getDraftFormat(type, format, sets);
    if (!safeFormat) return "Formato de viernes inválido";

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({ type, format: safeFormat, session_id: sessionId, status: "draft", played_at: new Date().toISOString() })
        .select("id")
        .single();

      if (matchError || !match) throw matchError ?? new Error("No se pudo crear match");

      const playersPayload = [
        { match_id: match.id, player_id: team1[0], team: 1 },
        { match_id: match.id, player_id: team1[1], team: 1 },
        { match_id: match.id, player_id: team2[0], team: 2 },
        { match_id: match.id, player_id: team2[1], team: 2 },
      ];

      const setsPayload = sets.map((set) => ({
        match_id: match.id,
        set_no: set.set_no,
        games_team1: Number(set.games_team1),
        games_team2: Number(set.games_team2),
      }));

      const [{ error: playersError }, { error: setsError }] = await Promise.all([
        supabase.from("match_players").insert(playersPayload),
        supabase.from("match_sets").insert(setsPayload),
      ]);

      if (playersError || setsError) throw playersError ?? setsError;

      alert("Draft guardado");
      setTeam1(["", ""]);
      setTeam2(["", ""]);
      setSets(type === "viernes" ? [emptySet(1)] : defaultTuesdaySets);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const finalizeMatch = async (matchId: string) => {
    const { error } = await supabase.rpc("finalize_match", { p_match_id: matchId });
    if (error) {
      alert(error.message);
      return;
    }
    await loadData();
  };

  const deleteMatch = async (matchId: string) => {
    const { error } = await supabase.rpc("delete_match", { p_match_id: matchId });
    if (error) {
      alert(error.message);
      return;
    }
    await loadData();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-8 py-10">
        <Link href="/" className="text-gray-500 hover:text-white text-sm uppercase">← Volver</Link>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h1 className="text-2xl font-black text-green-400">Crear partido (draft)</h1>
          <div className="grid md:grid-cols-2 gap-3">
            <select value={type} onChange={(e) => setType(e.target.value as "martes" | "viernes")} className="bg-slate-800 p-3 rounded-xl">
              <option value="martes">Martes (BO3)</option>
              <option value="viernes">Viernes (BO1)</option>
            </select>
            {type === "viernes" && (
              <>
                <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="bg-slate-800 p-3 rounded-xl" />
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as "bo1_6tb" | "bo1_4")}
                  className="bg-slate-800 p-3 rounded-xl md:col-span-2"
                >
                  <option value="bo1_6tb">1 set a 6 (TB 7)</option>
                  <option value="bo1_4">Partido a 4 games</option>
                </select>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((team) => (
              <div key={team} className="space-y-2">
                <p className="text-sm text-slate-400">Equipo {team}</p>
                {[0, 1].map((slot) => (
                  <select
                    key={`${team}-${slot}`}
                    value={team === 1 ? team1[slot] : team2[slot]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (team === 1) {
                        const next = [...team1];
                        next[slot] = val;
                        setTeam1(next);
                      } else {
                        const next = [...team2];
                        next[slot] = val;
                        setTeam2(next);
                      }
                    }}
                    className="w-full bg-slate-800 p-3 rounded-xl"
                  >
                    <option value="">Jugador</option>
                    {jugadores.map((j) => (
                      <option key={`${team}-${slot}-${j.id}`} value={j.id}>{j.nombre}</option>
                    ))}
                  </select>
                ))}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-400">Sets</p>
            {sets.map((set, index) => (
              <div key={set.set_no} className="flex items-center gap-2">
                <span className="w-16 text-xs text-slate-500">Set {set.set_no}</span>
                <input type="number" min={0} max={format === "bo1_4" ? 4 : 7} value={set.games_team1} onChange={(e) => setSets((prev) => prev.map((item) => item.set_no === set.set_no ? { ...item, games_team1: e.target.value } : item))} className="w-20 bg-slate-800 p-2 rounded-lg text-center" />
                <span>-</span>
                <input type="number" min={0} max={format === "bo1_4" ? 4 : 7} value={set.games_team2} onChange={(e) => setSets((prev) => prev.map((item) => item.set_no === set.set_no ? { ...item, games_team2: e.target.value } : item))} className="w-20 bg-slate-800 p-2 rounded-lg text-center" />
                {type === "martes" && index === sets.length - 1 && sets.length === 3 && (
                  <button className="text-xs text-red-400" onClick={() => setSets((prev) => prev.slice(0, 2))}>Quitar 3er set</button>
                )}
              </div>
            ))}
            {type === "martes" && sets.length < 3 && (
              <button onClick={() => setSets((prev) => [...prev, emptySet(3)])} className="text-xs text-green-400">+ Agregar tercer set</button>
            )}
          </div>

          {validationError && <p className="text-amber-300 text-sm">⚠ {validationError}</p>}
          <button onClick={saveDraft} disabled={loading} className="bg-green-500 text-black px-5 py-3 rounded-xl font-bold disabled:opacity-60">
            {loading ? "Guardando..." : "Guardar draft"}
          </button>
        </section>

        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Partidos recientes</h2>
          <div className="space-y-3">
            {matches.map((match) => {
              const team1 = (match.match_players ?? []).filter((p) => p.team === 1).map((p) => p.jugadores?.nombre).filter(Boolean).join(" & ");
              const team2 = (match.match_players ?? []).filter((p) => p.team === 2).map((p) => p.jugadores?.nombre).filter(Boolean).join(" & ");
              const setSummary = (match.match_sets ?? [])
                .sort((a, b) => a.set_no - b.set_no)
                .map((s) => `${s.games_team1}-${s.games_team2}`)
                .join(" | ");

              return (
                <div key={match.id} className="border border-slate-700 rounded-xl p-4">
                  <p className="text-xs text-slate-500">{new Date(match.played_at).toLocaleString("es-AR")} · {match.type} · {match.format} · {match.status}</p>
                  <p className="font-semibold">{team1} vs {team2}</p>
                  <p className="text-sm text-slate-400">Sets: {setSummary || "-"}</p>
                  <p className="text-sm text-slate-400">Ganador: {match.winner_team ? `Equipo ${match.winner_team}` : "-"} · Games: {match.games_team1 ?? "-"}-{match.games_team2 ?? "-"}</p>
                  <div className="mt-3 flex gap-2">
                    {match.status === "draft" && <button className="px-3 py-1 bg-blue-600 rounded-lg text-xs" onClick={() => finalizeMatch(match.id)}>Finalizar</button>}
                    {match.status === "final" && <button className="px-3 py-1 bg-red-600 rounded-lg text-xs" onClick={() => deleteMatch(match.id)}>Borrar</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
