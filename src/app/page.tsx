"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Section = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <motion.section 
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.8 }}
    className="min-h-screen flex flex-col items-center justify-center p-4 border-b border-white/5 relative"
  >
    <h2 className="text-3xl font-bold mb-10 text-[#bef264] uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(190,242,100,0.3)]">{title}</h2>
    <div className="w-full flex justify-center">
      {children}
    </div>
  </motion.section>
);

export default function Home() {
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [partidos, setPartidos] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: dataJugadores } = await supabase
        .from('jugadores')
        .select('*')
        .order('puntos', { ascending: false })
        .order('games_favor', { ascending: false });
      if (dataJugadores) setJugadores(dataJugadores);

      const { data: dataPartidos } = await supabase
        .from('partidos')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(5);
      if (dataPartidos) setPartidos(dataPartidos);
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-[#020617] text-white selection:bg-[#bef264]/30 overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="h-screen flex flex-col items-center justify-center text-center p-5 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#bef264]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8 }} className="z-10">
          <h1 className="text-7xl md:text-[10rem] font-black mb-2 tracking-tighter italic leading-none">
            PADEL<span className="text-[#bef264] drop-shadow-[0_0_20px_rgba(190,242,100,0.5)]">.</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-base font-bold tracking-[0.4em] uppercase opacity-70">The Elite Amateur League</p>
        </motion.div>
        <div className="mt-24 animate-bounce text-[10px] text-slate-500 font-mono tracking-[0.5em] uppercase">Deslizar ↓</div>
      </section>

      {/* RANKING */}
  <Section title="Ranking General">
  <div className="w-full max-w-4xl bg-white/[0.02] backdrop-blur-md rounded-[2rem] border border-white/10 overflow-x-auto shadow-2xl">
    <table className="w-full text-left border-collapse">
      <thead className="bg-white/[0.05] text-slate-500 text-[10px] uppercase tracking-[0.2em]">
        <tr>
          <th className="p-4 md:p-6">Jugador</th>
          <th className="p-4 md:p-6 text-center">PJ</th>
          <th className="p-4 md:p-6 text-center text-[#bef264]">Dif G</th>
          <th className="p-4 md:p-6 text-center font-bold">Pts</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {jugadores.map((j, i) => {
          const difGames = (j.games_favor || 0) - (j.games_contra || 0);
          return (
            <tr key={j.id} className="hover:bg-[#bef264]/5 transition-all group">
              <td className="p-4 md:p-5 font-bold flex items-center gap-3">
                <span className="text-slate-700 font-mono text-xs w-4">{i + 1}</span>
                <div className="flex-shrink-0 w-12 h-12 relative">
                  <img 
                    src={j.foto_url || "/default-avatar.png"} 
                    alt={j.nombre} 
                    className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl object-cover border border-white/10"
                  />
                </div>
                {/* CAMBIO CLAVE AQUÍ: Link usa slug, el texto usa nombre */}
                <a href={`/jugador/${j.slug}`} className="group-hover:text-[#bef264] uppercase transition-colors tracking-tighter text-sm md:text-lg">
                  {j.nombre}
                </a>
              </td>
              <td className="p-4 md:p-5 text-center text-slate-400 font-mono text-xs md:text-sm">{j.partidos_jugados}</td>
              <td className={`p-4 md:p-5 text-center font-mono text-xs md:text-sm font-bold ${difGames > 0 ? 'text-[#bef264]' : 'text-red-400'}`}>
                {difGames > 0 ? `+${difGames}` : difGames}
              </td>
              <td className="p-4 md:p-5 text-center font-black text-xl md:text-2xl text-white italic">{j.puntos}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</Section>

     {/* HISTORIAL */}
<Section title="Últimos Resultados">
  <div className="w-full max-w-2xl space-y-4 px-4">
    {partidos.map((p) => {
      const eq1Gano = p.sets_1[0] > p.sets_2[0];
      
      return (
        <div key={p.id} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-3xl flex justify-between items-center">
          <div className={`text-right flex-1 font-bold text-sm md:text-lg ${eq1Gano ? 'text-white' : 'text-slate-600'}`}>
            {p.equipo_1[0]} <span className="opacity-30">&</span> {p.equipo_1[1]}
          </div>
          <div className="mx-4 md:mx-8 bg-[#bef264] text-black px-4 py-1 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(190,242,100,0.3)] skew-x-[-12deg]">
            {p.sets_1[0]}-{p.sets_2[0]}
          </div>
          <div className={`text-left flex-1 font-bold text-sm md:text-lg ${!eq1Gano ? 'text-white' : 'text-slate-600'}`}>
            {p.equipo_2[0]} <span className="opacity-30">&</span> {p.equipo_2[1]}
          </div>
        </div>
      );
    })}
  </div>
</Section>

      {/* BOTÓN FLOTANTE */}
      <motion.a
        href="/cargar"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-14 h-14 md:w-16 md:h-16 bg-[#bef264] text-black rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(190,242,100,0.4)] z-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </motion.a>
    </main>
  );
}