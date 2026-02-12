'use client';
import React, { useEffect, useState } from 'react';
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarFill } from 'recharts';
import { motion } from "framer-motion";
import NavBar from "@/app/components/NavBar";
import FloatingButton from "@/app/components/FloatingButton";
import type { Jugador } from "@/lib/types";

export default function PerfilJugador({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;

  const [jugador, setJugador] = useState<Jugador | null>(null);
  const [rankingPos, setRankingPos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatosYRanking = async () => {
      const { data } = await supabase
        .from('jugadores')
        .select('*')
        .eq('slug', slug)
        .single();

      const { data: stats } = await supabase.from('player_stats').select('*');

      if (data) {
        const stat = (stats ?? []).find((row) => row.player_id === data.id);
        setJugador({
          ...data,
          partidos_jugados: stat?.matches_played ?? 0,
          partidos_ganados: stat?.matches_won ?? 0,
          games_favor: stat?.games_favor ?? 0,
          games_contra: stat?.games_contra ?? 0,
        });

        const { data: todos } = await supabase
          .from('jugadores')
          .select('id,nombre, elo_rating')
          .order('elo_rating', { ascending: false });

        if (todos) {
          const index = todos.findIndex(j => j.id === data.id);
          setRankingPos(index !== -1 ? index + 1 : null);
        }
      }
      setLoading(false);
    };
    void fetchDatosYRanking();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-mono tracking-widest">
      Calculando posición...
    </div>
  );

  if (!jugador) return (
    <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center font-mono">
      Jugador no encontrado.
    </div>
  );

  const statsData = [
    { subject: 'Ataque', A: jugador.ataque || 50 },
    { subject: 'Defensa', A: jugador.defensa || 50 },
    { subject: 'Volea', A: jugador.volea || 50 },
    { subject: 'Saque', A: jugador.saque || 50 },
    { subject: 'Resistencia', A: jugador.resistencia || 50 },
  ];

  const partidosJugados = jugador.partidos_jugados ?? 0;
  const partidosGanados = jugador.partidos_ganados ?? 0;
  const winRate = partidosJugados > 0
    ? Math.round((partidosGanados / partidosJugados) * 100)
    : 0;

  const difGames = (jugador.games_favor || 0) - (jugador.games_contra || 0);

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-[#bef264]/30 font-sans">
      <NavBar />

      {/* Fondo con glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#bef264]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-5xl mx-auto p-4 md:p-12 pt-28">

        {/* Header del jugador */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center gap-10 mb-12"
        >
          {/* Foto */}
          <div className="relative flex-shrink-0">
            {jugador.foto_url ? (
              <Image
                src={jugador.foto_url}
                alt={jugador.nombre}
                width={224}
                height={224}
                className="w-48 h-48 md:w-56 md:h-56 rounded-[3rem] object-cover border border-white/10 shadow-[0_0_40px_rgba(190,242,100,0.1)]"
              />
            ) : (
              <div className="w-48 h-48 md:w-56 md:h-56 bg-white/[0.03] rounded-[3rem] flex items-center justify-center text-7xl font-black text-slate-700 border border-white/10 uppercase">
                {jugador.nombre[0]}
              </div>
            )}
            <div className="absolute -bottom-4 -right-4 bg-[#bef264] text-black px-5 py-2 rounded-2xl font-black text-2xl italic shadow-2xl">
              #{rankingPos}
            </div>
          </div>

          {/* Nombre y tags */}
          <div className="text-center md:text-left">
            <p className="text-xs text-gray-500 font-mono uppercase tracking-[0.3em] mb-2">Elite Amateur League</p>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              {jugador.nombre}<span className="text-[#bef264]">.</span>
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-5">
              {jugador.apodo && (
                <span className="bg-[#bef264]/10 border border-[#bef264]/20 px-4 py-1.5 rounded-full text-xs font-bold text-[#bef264] uppercase tracking-widest">
                  {jugador.apodo}
                </span>
              )}
              {jugador.barrio && (
                <span className="bg-white/[0.03] border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {jugador.barrio}
                </span>
              )}
              {jugador.perfil && (
                <span className="bg-white/[0.03] border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {jugador.perfil}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          {[
            { label: 'Elo', value: Math.round(jugador.elo_rating || 1500), highlight: true },
            { label: 'Puntos (legacy)', value: jugador.puntos || 0, highlight: false },
            { label: 'Partidos Jugados', value: jugador.partidos_jugados || 0, highlight: false },
            { label: 'Win Rate', value: `${winRate}%`, highlight: false },
            { label: 'Dif. Games', value: difGames > 0 ? `+${difGames}` : difGames, highlight: false, color: difGames > 0 ? 'text-[#bef264]' : 'text-red-400' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-6 rounded-3xl border text-center ${
                stat.highlight
                  ? 'bg-[#bef264]/10 border-[#bef264]/20'
                  : 'bg-white/[0.02] border-white/10'
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">{stat.label}</p>
              <p className={`text-4xl font-black ${stat.highlight ? 'text-[#bef264]' : (stat.color || 'text-white')}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </motion.div>

        {/* Radar + Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Radar */}
          <div className="md:col-span-2 bg-white/[0.02] backdrop-blur-md border border-white/10 p-8 rounded-3xl">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">Habilidades</h2>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  <RadarFill name={jugador.nombre} dataKey="A" stroke="#bef264" fill="#bef264" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Info extra */}
          <div className="space-y-4">
            {jugador.parecido_a && (
              <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Parecido a</p>
                <p className="text-xl font-black text-[#bef264] italic">{jugador.parecido_a}</p>
              </div>
            )}
            {jugador.bio && (
              <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 p-6 rounded-3xl flex-1">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Biografía</p>
                <p className="text-sm text-gray-400 italic leading-relaxed">&quot;{jugador.bio}&quot;</p>
              </div>
            )}
            <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 p-6 rounded-3xl">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Games</p>
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">A favor</p>
                  <p className="font-black text-2xl text-[#bef264]">{jugador.games_favor || 0}</p>
                </div>
                <div className="text-gray-700 self-center text-2xl font-thin">|</div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">En contra</p>
                  <p className="font-black text-2xl text-red-400">{jugador.games_contra || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <FloatingButton />
    </main>
  );
}