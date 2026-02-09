"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RadarFill } from 'recharts';
import { motion } from "framer-motion";

export default function PerfilJugador({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  
  const [jugador, setJugador] = useState<any>(null);
  const [rankingPos, setRankingPos] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDatosYRanking = async () => {
      // 1. Traemos a todos los jugadores ordenados para calcular la posición
      const { data: todos } = await supabase
        .from('jugadores')
        .select('nombre, puntos, games_favor, games_contra')
        .order('puntos', { ascending: false })
        .order('games_favor', { ascending: false });

      if (todos) {
        // Encontramos la posición del jugador actual
        const index = todos.findIndex(j => j.nombre.toLowerCase() === id.toLowerCase());
        setRankingPos(index !== -1 ? index + 1 : null);
        
        // 2. Traemos la info completa del jugador
        const { data } = await supabase
          .from('jugadores')
          .select('*')
          .ilike('nombre', id)
          .single();

        if (data) setJugador(data);
      }
      setLoading(false);
    };
    fetchDatosYRanking();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono tracking-widest">Calculando posición...</div>;
  if (!jugador) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono">Jugador no encontrado.</div>;

  const statsData = [
    { subject: 'Ataque', A: jugador.ataque || 50 },
    { subject: 'Defensa', A: jugador.defensa || 50 },
    { subject: 'Volea', A: jugador.volea || 50 },
    { subject: 'Saque', A: jugador.saque || 50 },
    { subject: 'Resistencia', A: jugador.resistencia || 50 },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-12 selection:bg-green-500/30 font-sans">
      <a href="/" className="fixed top-6 left-6 text-gray-500 hover:text-white transition-all flex items-center gap-2 text-xs font-mono uppercase tracking-widest z-50">
        ← Volver
      </a>

      <div className="max-w-5xl mx-auto pt-12">
        
        {/* HEADER: FOTO + RANKING POS */}
        <div className="flex flex-col md:flex-row items-center gap-10 mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {jugador.foto_url ? (
               <img src={jugador.foto_url} alt={jugador.nombre} className="w-56 h-56 rounded-[3rem] object-cover border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.2)]" />
            ) : (
              <div className="w-56 h-56 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-[3rem] flex items-center justify-center text-7xl font-black text-slate-700 border-2 border-slate-800 uppercase">
                {jugador.nombre[0]}
              </div>
            )}
            {/* ESTO ES LO QUE PEDISTE: POSICIÓN DE RANKING */}
            <div className="absolute -bottom-4 -right-4 bg-green-500 text-black px-6 py-2 rounded-2xl font-black text-3xl italic shadow-2xl">
              #{rankingPos}
            </div>
          </motion.div>

          <div className="text-center md:text-left">
            <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-none">
              {jugador.nombre}<span className="text-green-500">.</span>
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              <span className="bg-slate-900 px-3 py-1 rounded-full text-xs font-mono text-green-500 border border-green-500/20 uppercase tracking-widest">
                {jugador.apodo || "Sin Apodo"}
              </span>
              <span className="bg-slate-900 px-3 py-1 rounded-full text-xs font-mono text-gray-400 border border-slate-800 uppercase tracking-widest">
                {jugador.barrio || "Local"}
              </span>
            </div>
          </div>
        </div>

        {/* GRID DE INFORMACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-8 bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800">
            {/* PUNTOS MOVIDOS AQUÍ */}
            <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-3xl">
              <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Puntos Totales</p>
              <p className="text-4xl font-black text-white">{jugador.puntos}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Perfil</p>
              <p className="text-xl font-bold">{jugador.perfil || "Diestro"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Parecido a</p>
              <p className="text-xl font-bold text-green-400 italic">{jugador.parecido_a || "N/A"}</p>
            </div>
          </div>

          <div className="md:col-span-2 bg-slate-900/30 p-8 rounded-[2rem] border border-slate-800 flex flex-col md:flex-row items-center">
            <div className="w-full h-72">
               <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={statsData}>
                  <PolarGrid stroke="#1e293b" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  <RadarFill name={jugador.nombre} dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full md:w-64 mt-8 md:mt-0 md:ml-8">
              <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Partidos Ganados</p>
                <p className="text-3xl font-black text-green-500">{jugador.partidos_ganados || 0}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-slate-700">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Partidos Jugados</p>
                <p className="text-3xl font-black">{jugador.partidos_jugados || 0}</p>
              </div>
              <div className="col-span-2 bg-slate-800/20 p-4 rounded-2xl text-center border border-slate-700/50">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Biografía</p>
                <p className="text-sm text-gray-400 italic mt-2">"{jugador.bio || "Leyenda del club."}"</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}