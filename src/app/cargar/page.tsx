"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Jugador } from "@/lib/types";

type SetForm = { eq1: string; eq2: string };

const recomputeEndpoint = async (url: string, defaultError: string) => {
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || defaultError);
  }
};

export default function CargarPartido() {
  const [authorized, setAuthorized] = useState(false);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(false);
  const [equipo1, setEquipo1] = useState({ j1: "", j2: "" });
  const [equipo2, setEquipo2] = useState({ j1: "", j2: "" });
  const [sets, setSets] = useState<SetForm[]>([
    { eq1: "", eq2: "" },
    { eq1: "", eq2: "" },
    { eq1: "", eq2: "" },
  ]);

  useEffect(() => {
    const prepararPagina = async () => {
      const claveIngresada = prompt("Ingresá la clave de administrador:");
      const claveCorrecta = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

      if (claveIngresada !== claveCorrecta || claveCorrecta === undefined) {
        alert("Clave incorrecta. Volviendo al ranking...");
        window.location.href = "/";
        return;
      }

      setAuthorized(true);

      const { data } = await supabase
        .from("jugadores")
        .select("id, nombre, slug")
        .order("nombre", { ascending: true });
      if (data) setJugadores(data);
    };

    void prepararPagina();
  }, []);

  const validarSet = (g1: number, g2: number): string | null => {
    if ((g1 === 6 && g2 <= 4) || (g2 === 6 && g1 <= 4) || (g1 === 7 && (g2 === 5 || g2 === 6)) || (g2 === 7 && (g1 === 5 || g1 === 6))) {
      return null;
    }
    return `Set inválido: ${g1}-${g2}`;
  };

  const handleGuardarMartes = async () => {
    if (!equipo1.j1 || !equipo1.j2 || !equipo2.j1 || !equipo2.j2) {
      alert("Completá todos los jugadores");
      return;
    }

    const participantes = [equipo1.j1, equipo1.j2, equipo2.j1, equipo2.j2];
    if (new Set(participantes).size !== 4) {
      alert("Los 4 jugadores deben ser distintos");
      return;
    }

    const setsJugados = sets.filter((s) => s.eq1 && s.eq2);
    if (setsJugados.length < 2 || setsJugados.length > 3) {
      alert("Debe haber 2 o 3 sets jugados");
      return;
    }

    let setsEq1 = 0;
    let setsEq2 = 0;

    for (let i = 0; i < setsJugados.length; i++) {
      const g1 = parseInt(setsJugados[i].eq1, 10);
      const g2 = parseInt(setsJugados[i].eq2, 10);
      const error = validarSet(g1, g2);
      if (error) {
        alert(`Set ${i + 1}: ${error}`);
        return;
      }
      if (g1 > g2) setsEq1 += 1;
      if (g2 > g1) setsEq2 += 1;
    }

    if (setsEq1 !== 2 && setsEq2 !== 2) {
      alert("Un equipo debe ganar 2 sets");
      return;
    }

    setLoading(true);

    const gamesFavorEq1 = setsJugados.reduce((sum, s) => sum + parseInt(s.eq1, 10), 0);
    const gamesContraEq1 = setsJugados.reduce((sum, s) => sum + parseInt(s.eq2, 10), 0);

    const equipo1Ids = [equipo1.j1, equipo1.j2].map((nombre) => jugadores.find((j) => j.nombre === nombre)?.id ?? "");
    const equipo2Ids = [equipo2.j1, equipo2.j2].map((nombre) => jugadores.find((j) => j.nombre === nombre)?.id ?? "");

    const { error: errorPartido } = await supabase.from("partidos").insert([
      {
        equipo_1: [equipo1.j1, equipo1.j2],
        equipo_2: [equipo2.j1, equipo2.j2],
        equipo_1_ids: equipo1Ids.every(Boolean) ? equipo1Ids : null,
        equipo_2_ids: equipo2Ids.every(Boolean) ? equipo2Ids : null,
        sets_1: [setsEq1],
        sets_2: [setsEq2],
        games_1: gamesFavorEq1,
        games_2: gamesContraEq1,
        tipo_partido: "martes",
        fecha: new Date().toISOString(),
      },
    ]);

    if (errorPartido) {
      alert("Error al guardar el partido");
      setLoading(false);
      return;
    }

    try {
      await recomputeEndpoint("/api/elo/recompute", "No se pudo recomputar elo");
      await recomputeEndpoint("/api/stats/recompute", "No se pudo recomputar stats");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      alert(`Se guardó el partido, pero falló la recomputación: ${message}`);
      setLoading(false);
      return;
    }

    alert("¡Partido del martes registrado!");
    window.location.href = "/";
  };

  if (!authorized) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
      <Link href="/" className="fixed top-6 left-6 text-gray-500 hover:text-white transition-all flex items-center gap-2 text-sm font-mono uppercase tracking-widest z-50">
        ← Volver
      </Link>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
        <h1 className="text-3xl font-black mb-3 text-center tracking-tighter text-green-500">REPORTAR MARTES (BO3)</h1>
        <p className="text-center text-sm text-gray-400 mb-8">
          Para cargar una noche de viernes con múltiples sets, usá{' '}
          <Link href="/viernes-cargar" className="text-green-400 hover:underline">Viernes – Cargar sets</Link>.
        </p>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 1</label>
            <select onChange={(e) => setEquipo1({ ...equipo1, j1: e.target.value })} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white">
              <option value="">Jugador 1</option>
              {jugadores.map((j) => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
            <select onChange={(e) => setEquipo1({ ...equipo1, j2: e.target.value })} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white">
              <option value="">Jugador 2</option>
              {jugadores.map((j) => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
          </div>

          <div className="text-center text-slate-700 font-black italic">VS</div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Equipo 2</label>
            <select onChange={(e) => setEquipo2({ ...equipo2, j1: e.target.value })} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white">
              <option value="">Jugador 3</option>
              {jugadores.map((j) => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
            <select onChange={(e) => setEquipo2({ ...equipo2, j2: e.target.value })} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:border-green-500 transition-all text-white">
              <option value="">Jugador 4</option>
              {jugadores.map((j) => <option key={j.id} value={j.nombre}>{j.nombre}</option>)}
            </select>
          </div>

          <div className="space-y-4 pt-4">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase">Resultados por Set</label>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-12">Set {i + 1}</span>
                <input type="number" placeholder="Eq1" onChange={(e) => setSets((prev) => prev.map((set, idx) => idx === i ? { ...set, eq1: e.target.value } : set))} className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" />
                <span className="text-xl font-bold text-slate-700">-</span>
                <input type="number" placeholder="Eq2" onChange={(e) => setSets((prev) => prev.map((set, idx) => idx === i ? { ...set, eq2: e.target.value } : set))} className="w-20 bg-slate-800 text-center text-xl font-black p-3 rounded-xl border border-slate-700 focus:border-green-500 outline-none text-white" />
                {i === 2 && <span className="text-xs text-gray-600">(opcional)</span>}
              </div>
            ))}
          </div>

          <button onClick={handleGuardarMartes} disabled={loading} className="w-full bg-green-500 text-black font-black py-5 rounded-2xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 uppercase tracking-widest">
            {loading ? "GUARDANDO..." : "CONFIRMAR MARTES"}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
