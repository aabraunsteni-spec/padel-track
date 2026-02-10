"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

type TipoPartido = 'martes' | 'viernes';

export default function CargarPartido() {
  const [authorized, setAuthorized] = useState(false);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Tipo de partido
  const [tipoPartido, setTipoPartido] = useState<TipoPartido>('martes');
  
  // MARTES: Partido completo
  const [equipo1, setEquipo1] = useState({ j1: "", j2: "" });
  const [equipo2, setEquipo2] = useState({ j1: "", j2: "" });
  const [sets, setSets] = useState([
    { eq1: "", eq2: "" },
    { eq1: "", eq2: "" },
    { eq1: "", eq2: "" }
  ]);

  // VIERNES: Americano (3 sets con parejas manuales)
  const [setsViernes, setSetsViernes] = useState([
    { pareja1Nombres: ["", ""], pareja2Nombres: ["", ""], eq1: "", eq2: "" },
    { pareja1Nombres: ["", ""], pareja2Nombres: ["", ""], eq1: "", eq2: "" },
    { pareja1Nombres: ["", ""], pareja2Nombres: ["", ""], eq1: "", eq2: "" }
  ]);

  useEffect(() => {
    const prepararPagina = async () => {
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

      const { data } = await supabase
        .from('jugadores')
        .select('id, nombre, slug')
        .order('nombre', { ascending: true });
      if (data) setJugadores(data);
    };

    prepararPagina();
  }, [authorized]);

  if (!authorized) return <div className="min-h-screen bg-slate-950" />;

  // Validar set de pádel
  const validarSet = (g1: number, g2: number): string | null => {
    if (
      (g1 === 6 && g2 <= 4) ||
      (g2 === 6 && g1 <= 4) ||
      (g1 === 7 && (g2 === 5 || g2 === 6)) ||
      (g2 === 7 && (g1 === 5 || g1 === 6))
    ) {
      return null; // Válido
    }
    return `Set inválido: ${g1}-${g2}`;
  };

  const handleGuardarMartes = async () => {
    // Validar que estén todos los jugadores
    if (!equipo1.j1 || !equipo1.j2 || !equipo2.j1 || !equipo2.j2) {
      alert("Completá todos los jugadores");
      return;
    }

    // Validar sets jugados
    const setsJugados = sets.filter(s => s.eq1 && s.eq2);
    if (setsJugados.length < 2 || setsJugados.length > 3) {
      alert("Debe haber 2 o 3 sets jugados");
      return;
    }

    // Validar cada set
    for (let i = 0; i < setsJugados.length; i++) {
      const error = validarSet(parseInt(setsJugados[i].eq1), parseInt(setsJugados[i].eq2));
      if (error) {
        alert(`Set ${i + 1}: ${error}`);
        return;
      }
    }

    // Calcular sets ganados
    let setsEq1 = 0;
    let setsEq2 = 0;
    setsJugados.forEach(s => {
      if (parseInt(s.eq1) > parseInt(s.eq2)) setsEq1++;
      else setsEq2++;
    });

    // Validar que haya un ganador con 2 sets
    if (setsEq1 !== 2 && setsEq2 !== 2) {
      alert("Un equipo debe ganar 2 sets");
      return;
    }

    setLoading(true);

    // Calcular games totales
    const gamesFavorEq1 = setsJugados.reduce((sum, s) => sum + parseInt(s.eq1), 0);
    const gamesContraEq1 = setsJugados.reduce((sum, s) => sum + parseInt(s.eq2), 0);

    const ganadores = setsEq1 === 2 ? [equipo1.j1, equipo1.j2] : [equipo2.j1, equipo2.j2];
    const perdedores = setsEq1 === 2 ? [equipo2.j1, equipo2.j2] : [equipo1.j1, equipo1.j2];

    // Insertar partido
    const { error: errorPartido } = await supabase.from('partidos').insert([
      {
        equipo_1: [equipo1.j1, equipo1.j2],
        equipo_2: [equipo2.j1, equipo2.j2],
        sets_1: [setsEq1],
        sets_2: [setsEq2],
        tipo_partido: 'martes',
        fecha: new Date().toISOString()
      }
    ]);

    if (errorPartido) {
      console.error(errorPartido);
      alert("Error al guardar el partido");
      setLoading(false);
      return;
    }

    // Actualizar stats de ganadores
    for (const nombre of ganadores) {
      const jugador = jugadores.find(j => j.nombre === nombre);
      if (!jugador) continue;

      const { data: statsActuales } = await supabase
        .from('jugadores')
        .select('partidos_jugados, puntos, games_favor, games_contra')
        .eq('id', jugador.id)
        .single();

      if (statsActuales) {
        await supabase
          .from('jugadores')
          .update({
            partidos_jugados: (statsActuales.partidos_jugados || 0) + 1,
            puntos: (statsActuales.puntos || 0) + 3,
            games_favor: (statsActuales.games_favor || 0) + (setsEq1 === 2 ? gamesFavorEq1 : gamesContraEq1),
            games_contra: (statsActuales.games_contra || 0) + (setsEq1 === 2 ? gamesContraEq1 : gamesFavorEq1)
          })
          .eq('id', jugador.id);
      }
    }

    // Actualizar stats de perdedores
    for (const nombre of perdedores) {
      const jugador = jugadores.find(j => j.nombre === nombre);
      if (!jugador) continue;

      const { data: statsActuales } = await supabase
        .from('jugadores')
        .select('partidos_jugados, puntos, games_favor, games_contra')
        .eq('id', jugador.id)
        .single();

      if (statsActuales) {
        await supabase
          .from('jugadores')
          .update({
            partidos_jugados: (statsActuales.partidos_jugados || 0) + 1,
            games_favor: (statsActuales.games_favor || 0) + (setsEq1 === 2 ? gamesContraEq1 : gamesFavorEq1),
            games_contra: (statsActuales.games_contra || 0) + (setsEq1 === 2 ? gamesFavorEq1 : gamesContraEq1)
          })
          .eq('id', jugador.id);
      }
    }

    alert("¡Partido del martes registrado!");
    window.location.href = "/";
    setLoading(false);
  };

  const handleGuardarViernes = async () => {
    // Validar que cada set tenga 4 jugadores y resultado
    for (let i = 0; i < 3; i++) {
      const set = setsViernes[i];
      
      if (!set.pareja1Nombres?.[0] || !set.pareja1Nombres?.[1] || 
          !set.pareja2Nombres?.[0] || !set.pareja2Nombres?.[1]) {
        alert(`Set ${i + 1}: Completá los 4 jugadores`);
        return;
      }

      if (!set.eq1 || !set.eq2) {
        alert(`Set ${i + 1}: Completá el resultado`);
        return;
      }

      const error = validarSet(parseInt(set.eq1), parseInt(set.eq2));
      if (error) {
        alert(`Set ${i + 1}: ${error}`);
        return;
      }

      // Validar que no haya jugadores repetidos en el mismo set
      const jugadoresSet = [
        set.pareja1Nombres[0],
        set.pareja1Nombres[1],
        set.pareja2Nombres[0],
        set.pareja2Nombres[1]
      ];
      const unicos = new Set(jugadoresSet);
      if (unicos.size !== 4) {
        alert(`Set ${i + 1}: No puede haber jugadores repetidos en el mismo set`);
        return;
      }
    }

    setLoading(true);

    const grupoId = crypto.randomUUID();

    // Recolectar todos los jugadores únicos del viernes
    const todosLosJugadores = new Set<string>();
    setsViernes.forEach(set => {
      todosLosJugadores.add(set.pareja1Nombres[0]);
      todosLosJugadores.add(set.pareja1Nombres[1]);
      todosLosJugadores.add(set.pareja2Nombres[0]);
      todosLosJugadores.add(set.pareja2Nombres[1]);
    });

    // Inicializar contador de sets ganados
    const setsGanados: { [key: string]: number } = {};
    todosLosJugadores.forEach(nombre => { setsGanados[nombre] = 0; });

    // Insertar los 3 sets y contar victorias
    for (let i = 0; i < 3; i++) {
      const set = setsViernes[i];
      const g1 = parseInt(set.eq1);
      const g2 = parseInt(set.eq2);

      await supabase.from('partidos').insert([
        {
          equipo_1: set.pareja1Nombres,
          equipo_2: set.pareja2Nombres,
          sets_1: [g1],
          sets_2: [g2],
          tipo_partido: 'viernes',
          grupo_viernes: grupoId,
          fecha: new Date().toISOString()
        }
      ]);

      // Contar sets ganados
      if (g1 > g2) {
        setsGanados[set.pareja1Nombres[0]]++;
        setsGanados[set.pareja1Nombres[1]]++;
      } else {
        setsGanados[set.pareja2Nombres[0]]++;
        setsGanados[set.pareja2Nombres[1]]++;
      }
    }

    // Actualizar stats de cada jugador que participó
    for (const nombre of Array.from(todosLosJugadores)) {
      const jugador = jugadores.find(j => j.nombre === nombre);
      if (!jugador) continue;

      const { data: statsActuales } = await supabase
        .from('jugadores')
        .select('partidos_jugados, puntos')
        .eq('id', jugador.id)
        .single();

      if (statsActuales) {
        await supabase
          .from('jugadores')
          .update({
            partidos_jugados: (statsActuales.partidos_jugados || 0) + 1,
            puntos: (statsActuales.puntos || 0) + setsGanados[nombre]
          })
          .eq('id', jugador.id);
      }
    }

    alert("¡Viernes americano registrado!");
    window.location.href = "/";
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
        className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl"
      >
        <h1 className="text-3xl font-black mb-8 text-center tracking-tighter text-green-500">
          REPORTAR RESULTADO
        </h1>

        {/* SELECTOR DE TIPO */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTipoPartido('martes')}
            className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
              tipoPartido === 'martes' 
                ? 'bg-green-500 text-black' 
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            MARTES (Partido Completo)
          </button>
          <button
            onClick={() => setTipoPartido('viernes')}
            className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
              tipoPartido === 'viernes' 
                ? 'bg-green-500 text-black' 
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            VIERNES (Americano)
          </button>
        </div>

        {/* FORMULARIO MARTES */}
        {tipoPartido === 'martes' && (
          <div className="space-y-6">
            {/* Equipo 1 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 1</label>
              <select 
                onChange={(e) => setEquipo1({...equipo1, j1: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white"
              >
                <option value="">Jugador 1</option>
                {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
              </select>
              <select 
                onChange={(e) => setEquipo1({...equipo1, j2: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white"
              >
                <option value="">Jugador 2</option>
                {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
              </select>
            </div>

            <div className="text-center text-slate-700 font-black italic">VS</div>

            {/* Equipo 2 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 2</label>
              <select 
                onChange={(e) => setEquipo2({...equipo2, j1: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white"
              >
                <option value="">Jugador 3</option>
                {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
              </select>
              <select 
                onChange={(e) => setEquipo2({...equipo2, j2: e.target.value})}
                className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white"
              >
                <option value="">Jugador 4</option>
                {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
              </select>
            </div>

            {/* Sets */}
            <div className="space-y-4 pt-4">
              <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Resultados por Set</label>
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-sm text-gray-500 w-12">Set {i + 1}</span>
                  <input 
                    type="number" 
                    placeholder="Eq1"
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[i].eq1 = e.target.value;
                      setSets(newSets);
                    }}
                    className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" 
                  />
                  <span className="text-xl font-bold text-slate-700">-</span>
                  <input 
                    type="number" 
                    placeholder="Eq2"
                    onChange={(e) => {
                      const newSets = [...sets];
                      newSets[i].eq2 = e.target.value;
                      setSets(newSets);
                    }}
                    className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" 
                  />
                  {i === 2 && <span className="text-xs text-gray-600">(opcional)</span>}
                </div>
              ))}
            </div>

            <button 
              onClick={handleGuardarMartes}
              disabled={loading}
              className="w-full bg-green-500 text-black font-black py-5 rounded-2xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? "GUARDANDO..." : "CONFIRMAR MARTES"}
            </button>
          </div>
        )}

        {/* FORMULARIO VIERNES */}
        {tipoPartido === 'viernes' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-400 bg-slate-800/50 p-4 rounded-xl">
              Configurá manualmente las parejas de cada set. Los jugadores pueden rotar libremente.
            </p>

            {/* 3 Sets con selección manual */}
            <div className="space-y-6">
              {[0, 1, 2].map(setIndex => (
                <div key={setIndex} className="bg-slate-800/50 p-6 rounded-xl space-y-4">
                  <div className="text-sm font-bold text-green-400 uppercase tracking-widest">
                    Set {setIndex + 1}
                  </div>

                  {/* Pareja 1 */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase">Pareja 1</label>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          const nuevo = [...setsViernes];
                          if (!nuevo[setIndex].pareja1Nombres) nuevo[setIndex].pareja1Nombres = ["", ""];
                          nuevo[setIndex].pareja1Nombres[0] = e.target.value;
                          setSetsViernes(nuevo);
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-green-500 transition-all text-white text-sm"
                      >
                        <option value="">Jugador 1</option>
                        {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
                      </select>
                      <select
                        onChange={(e) => {
                          const nuevo = [...setsViernes];
                          if (!nuevo[setIndex].pareja1Nombres) nuevo[setIndex].pareja1Nombres = ["", ""];
                          nuevo[setIndex].pareja1Nombres[1] = e.target.value;
                          setSetsViernes(nuevo);
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-green-500 transition-all text-white text-sm"
                      >
                        <option value="">Jugador 2</option>
                        {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="text-center text-slate-700 font-bold">VS</div>

                  {/* Pareja 2 */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 uppercase">Pareja 2</label>
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          const nuevo = [...setsViernes];
                          if (!nuevo[setIndex].pareja2Nombres) nuevo[setIndex].pareja2Nombres = ["", ""];
                          nuevo[setIndex].pareja2Nombres[0] = e.target.value;
                          setSetsViernes(nuevo);
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-green-500 transition-all text-white text-sm"
                      >
                        <option value="">Jugador 3</option>
                        {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
                      </select>
                      <select
                        onChange={(e) => {
                          const nuevo = [...setsViernes];
                          if (!nuevo[setIndex].pareja2Nombres) nuevo[setIndex].pareja2Nombres = ["", ""];
                          nuevo[setIndex].pareja2Nombres[1] = e.target.value;
                          setSetsViernes(nuevo);
                        }}
                        className="flex-1 bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-green-500 transition-all text-white text-sm"
                      >
                        <option value="">Jugador 4</option>
                        {jugadores.map(j => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div className="flex items-center gap-4 justify-center pt-2">
                    <input 
                      type="number" 
                      placeholder="Eq1"
                      onChange={(e) => {
                        const nuevo = [...setsViernes];
                        nuevo[setIndex].eq1 = e.target.value;
                        setSetsViernes(nuevo);
                      }}
                      className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" 
                    />
                    <span className="text-xl font-bold text-slate-700">-</span>
                    <input 
                      type="number" 
                      placeholder="Eq2"
                      onChange={(e) => {
                        const nuevo = [...setsViernes];
                        nuevo[setIndex].eq2 = e.target.value;
                        setSetsViernes(nuevo);
                      }}
                      className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" 
                    />
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleGuardarViernes}
              disabled={loading}
              className="w-full bg-green-500 text-black font-black py-5 rounded-2xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? "GUARDANDO..." : "CONFIRMAR VIERNES"}
            </button>
          </div>
        )}
      </motion.div>
    </main>
  );
}