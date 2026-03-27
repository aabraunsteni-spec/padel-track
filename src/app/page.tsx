'use client';
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NavBar from "@/app/components/NavBar";
import FloatingButton from "@/app/components/FloatingButton";
import type { Jugador, MatchRow } from "@/lib/types";

const Section = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <motion.section
    className="min-h-screen flex flex-col items-center justify-center p-4 border-b border-white/5 relative"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
  >
    <h2 className="text-3xl font-bold mb-10 text-[#bef264] uppercase tracking-tighter">{title}</h2>
    <div className="w-full flex justify-center">{children}</div>
  </motion.section>
);

export default function Home() {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [partidos, setPartidos] = useState<MatchRow[]>([]);
  const [loadingJugadores, setLoadingJugadores] = useState(true);
  const [loadingPartidos, setLoadingPartidos] = useState(true);

  useEffect(() => {
    const fetchJugadores = async () => {
      const { data: dataJugadores } = await supabase
        .from('jugadores')
        .select('id,nombre,slug,foto_url,elo_rating');

      const { data: stats } = await supabase.from('player_stats').select('*');

      if (dataJugadores) {
        const byId = new Map((stats ?? []).map((s) => [s.player_id, s]));
        const merged = dataJugadores.map((j) => {
          const st = byId.get(j.id);
          return {
            ...j,
            partidos_jugados: st?.matches_played ?? 0,
            partidos_ganados: st?.matches_won ?? 0,
            games_favor: st?.games_favor ?? 0,
            games_contra: st?.games_contra ?? 0,
          };
        }) as Jugador[];

        merged.sort((a, b) => (b.elo_rating ?? 0) - (a.elo_rating ?? 0));
        setJugadores(merged);
      }
      setLoadingJugadores(false);
    };
    void fetchJugadores();
  }, []);

  useEffect(() => {
    const fetchPartidos = async () => {
      const { data: dataPartidos } = await supabase
        .from('matches')
        .select('id, played_at, type, winner_team, games_team1, games_team2, match_players(team,jugadores(nombre))')
        .eq('status', 'final')
        .order('played_at', { ascending: false })
        .limit(5);

      if (dataPartidos) setPartidos(dataPartidos as unknown as MatchRow[]);
      setLoadingPartidos(false);
    };
    void fetchPartidos();
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <NavBar />
      <section className="h-screen flex flex-col items-center justify-center text-center p-5">
        <h1 className="text-7xl md:text-[10rem] font-black">PADEL<span className="text-[#bef264]">.</span></h1>
      </section>

      <Section title="Ranking General">
        <div className="w-full max-w-4xl bg-white/[0.02] rounded-[2rem] border border-white/10 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/[0.05] text-slate-500 text-[10px] uppercase">
              <tr><th className="p-4">Jugador</th><th className="p-4 text-center">PJ</th><th className="p-4 text-center">Dif G</th><th className="p-4 text-center">Elo</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loadingJugadores ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-3 bg-white/10 rounded" />
                        <div className="w-12 h-12 bg-white/10 rounded-xl" />
                        <div className="h-4 w-28 bg-white/10 rounded" />
                      </div>
                    </td>
                    <td className="p-4 text-center"><div className="h-4 w-8 bg-white/10 rounded mx-auto" /></td>
                    <td className="p-4 text-center"><div className="h-4 w-8 bg-white/10 rounded mx-auto" /></td>
                    <td className="p-4 text-center"><div className="h-4 w-12 bg-white/10 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : (
                jugadores.map((j, i) => {
                  const difGames = (j.games_favor || 0) - (j.games_contra || 0);
                  return (
                    <tr key={j.id}>
                      <td className="p-4 font-bold flex items-center gap-3">
                        <span className="text-slate-700 text-xs w-4">{i + 1}</span>
                        <Image src={j.foto_url || "/default-avatar.png"} alt={j.nombre} width={48} height={48} className="rounded-xl object-cover border border-white/10" />
                        <Link href={`/jugador/${j.slug}`}>{j.nombre}</Link>
                      </td>
                      <td className="p-4 text-center">{j.partidos_jugados}</td>
                      <td className={`p-4 text-center ${difGames > 0 ? 'text-[#bef264]' : difGames < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                        {difGames > 0 ? `+${difGames}` : difGames}
                      </td>
                      <td className="p-4 text-center font-black">{Math.round(j.elo_rating || 1000)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Últimos Resultados">
        <div className="w-full max-w-2xl space-y-4 px-4">
          {loadingPartidos ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl flex justify-between items-center animate-pulse">
                <div className="flex-1 flex justify-end"><div className="h-4 w-32 bg-white/10 rounded" /></div>
                <div className="mx-4 h-8 w-16 bg-white/10 rounded-xl" />
                <div className="flex-1"><div className="h-4 w-32 bg-white/10 rounded" /></div>
              </div>
            ))
          ) : (
            partidos.map((p) => {
              const team1 = (p.match_players ?? []).filter((mp) => mp.team === 1).map((mp) => mp.jugadores?.nombre).join(' & ');
              const team2 = (p.match_players ?? []).filter((mp) => mp.team === 2).map((mp) => mp.jugadores?.nombre).join(' & ');
              const eq1Gano = p.winner_team === 1;
              return (
                <div key={p.id} className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl flex justify-between items-center">
                  <div className={`text-right flex-1 font-bold ${eq1Gano ? 'text-white' : 'text-slate-600'}`}>{team1}</div>
                  <div className="mx-4 bg-[#bef264] text-black px-4 py-1 rounded-xl font-black">{p.games_team1 ?? 0}-{p.games_team2 ?? 0}</div>
                  <div className={`text-left flex-1 font-bold ${!eq1Gano ? 'text-white' : 'text-slate-600'}`}>{team2}</div>
                </div>
              );
            })
          )}

          <div className="text-center">
            <Link href="/historial" className="text-slate-400 hover:text-[#bef264] font-bold text-sm uppercase">Ver historial completo</Link>
          </div>
        </div>
      </Section>

      <FloatingButton />
    </main>
  );
}
