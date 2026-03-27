'use client';
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import NavBar from "@/app/components/NavBar";
import FloatingButton from "@/app/components/FloatingButton";
import type { MatchRow } from "@/lib/types";

export default function HistorialPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, played_at, type, status, winner_team, games_team1, games_team2, sessions(session_date), match_players(team,jugadores(nombre)), match_sets(set_no,games_team1,games_team2)')
        .eq('status', 'final')
        .order('played_at', { ascending: false });
      if (data) setMatches(data as unknown as MatchRow[]);
      setLoading(false);
    };
    void fetchData();
  }, []);

  const visible = useMemo(() => matches.filter((m) => !filterType || m.type === filterType), [matches, filterType]);

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pt-28">
      <NavBar />
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-black text-[#bef264]">Historial</h1>
          {!loading && (
            <p className="text-slate-500 text-sm mt-1">
              {visible.length} partido{visible.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {['', 'martes', 'viernes'].map((val) => (
            <button
              key={val}
              onClick={() => setFilterType(val)}
              className={filterType === val
                ? 'bg-[#bef264]/10 border border-[#bef264]/30 text-[#bef264] px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest'
                : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest'
              }
            >
              {val === '' ? 'Todos' : val}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 animate-pulse">
                <div className="h-3 w-48 bg-white/10 rounded mb-3" />
                <div className="h-4 w-64 bg-white/10 rounded mb-2" />
                <div className="h-3 w-40 bg-white/10 rounded" />
              </div>
            ))
          ) : visible.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-600 text-lg font-bold">No hay partidos todavía</p>
            </div>
          ) : (
            visible.map((match) => {
              const team1 = (match.match_players ?? []).filter((p) => p.team === 1).map((p) => p.jugadores?.nombre).join(' & ');
              const team2 = (match.match_players ?? []).filter((p) => p.team === 2).map((p) => p.jugadores?.nombre).join(' & ');
              const setSummary = (match.match_sets ?? []).sort((a, b) => a.set_no - b.set_no).map((s) => `${s.games_team1}-${s.games_team2}`).join(' | ');
              return (
                <div key={match.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-slate-500">{new Date(match.played_at).toLocaleString('es-AR')} · {match.type} · {match.status} {match.sessions?.session_date ? `· sesión ${match.sessions.session_date}` : ''}</p>
                  <p className="font-semibold">{team1} vs {team2}</p>
                  <p className="text-sm text-slate-400">Sets: {setSummary || '-'}</p>
                  <p className="text-sm text-slate-400">Ganador: {match.winner_team ? `Equipo ${match.winner_team}` : '-'} · Games: {match.games_team1 ?? '-'}-{match.games_team2 ?? '-'}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
      <FloatingButton />
    </main>
  );
}
