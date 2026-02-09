"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export default function CargarPartido() {
  const [authorized, setAuthorized] = useState(false);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estado del Formulario
  const [equipo1, setEquipo1] = useState({ j1: "", j2: "" });
  const [equipo2, setEquipo2] = useState({ j1: "", j2: "" });
  const [resultado, setResultado] = useState({ s1: "", s2: "" });

  useEffect(() => {
    const prepararPagina = async () => {
      // 1. PROTECCIÓN: Solo pedimos pass si no estamos autorizados
      if (!authorized) {
        const claveIngresada = prompt("Ingresá la clave de administrador:");
        const claveCorrecta = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

        if (claveIngresada === claveCorrecta && claveCorrecta !== undefined) {
          setAuthorized(true);
        } else {
          alert("Clave incorrecta. Volviendo al ranking...");
          window.location.href = "/";
          return;
        }
      }

      // 2. FETCH DE JUGADORES: Solo si ya estamos autorizados
      const { data } = await supabase
        .from('jugadores')
        .select('id, nombre')
        .order('nombre', { ascending: true });
      if (data) setJugadores(data);
    };

    prepararPagina();
  }, [authorized]);

  // Si no está autorizado, no renderizamos nada (evita flash de contenido)
  if (!authorized) return <div className="min-h-screen bg-slate-950" />;

  const handleGuardar = async () => {
    if (!equipo1.j1 || !equipo1.j2 || !equipo2.j1 || !equipo2.j2 || !resultado.s1 || !resultado.s2) {
      alert("Completá todos los campos, crack.");
      return;
    }

    setLoading(true);
    
    const { error } = await supabase.from('partidos').insert([
      {
        equipo_1: [equipo1.j1, equipo1.j2],
        equipo_2: [equipo2.j1, equipo2.j2],
        sets_1: [parseInt(resultado.s1)],
        sets_2: [parseInt(resultado.s2)],
        fecha: new Date().toISOString()
      }
    ]);

    if (!error) {
      alert("Partido registrado. ¡A refrescar ese ranking!");
      window.location.href = "/";
    } else {
      console.error(error);
      alert("Error al guardar en la base de datos");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
      <a href="/" className="fixed top-6 left-6 text-gray-500 hover:text-white transition-all flex items-center gap-2 text-sm font-mono uppercase tracking-widest z-50">
        ← Volver
      </a>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-slate-900/80 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl"
      >
        <h1 className="text-3xl font-black mb-8 text-center tracking-tighter text-green-500">
          REPORTAR RESULTADO
        </h1>

        <div className="space-y-8">
          {/* EQUIPO 1 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 1</label>
            <select 
              onChange={(e) => setEquipo1({...equipo1, j1: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all appearance-none text-white"
            >
              <option value="">Seleccionar Jugador 1</option>
              {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
            <select 
              onChange={(e) => setEquipo1({...equipo1, j2: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all appearance-none text-white"
            >
              <option value="">Seleccionar Jugador 2</option>
              {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
          </div>

          <div className="text-center text-slate-700 font-black italic">VS</div>

          {/* EQUIPO 2 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 2</label>
            <select 
              onChange={(e) => setEquipo2({...equipo2, j1: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all appearance-none text-white"
            >
              <option value="">Seleccionar Jugador 3</option>
              {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
            <select 
              onChange={(e) => setEquipo2({...equipo2, j2: e.target.value})}
              className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all appearance-none text-white"
            >
              <option value="">Seleccionar Jugador 4</option>
              {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
          </div>

          {/* MARCADOR */}
          <div className="flex flex-col items-center gap-2 pt-4">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Resultado final del Set</label>
            <div className="flex gap-4 items-center justify-center">
              <input 
                type="number" 
                placeholder="Eq 1" 
                onChange={(e) => setResultado({...resultado, s1: e.target.value})}
                className="w-24 bg-slate-800 text-center text-3xl font-black p-4 rounded-2xl border border-slate-700 focus:border-green-500 outline-none text-white" 
              />
              <span className="text-2xl font-bold text-slate-700">x</span>
              <input 
                type="number" 
                placeholder="Eq 2" 
                onChange={(e) => setResultado({...resultado, s2: e.target.value})}
                className="w-24 bg-slate-800 text-center text-3xl font-black p-4 rounded-2xl border border-slate-700 focus:border-green-500 outline-none text-white" 
              />
            </div>
          </div>

          <button 
            onClick={handleGuardar}
            disabled={loading}
            className="w-full bg-green-500 text-black font-black py-5 rounded-2xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 uppercase tracking-widest"
          >
            {loading ? "GUARDANDO..." : "CONFIRMAR RESULTADO"}
          </button>
        </div>
      </motion.div>
    </main>
  );
}