"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import type { Jugador } from "@/lib/types";

type SetCard = {
  id: string;
  a1: string;
  a2: string;
  b1: string;
  b2: string;
  games1: string;
  games2: string;
};

const createSet = (): SetCard => ({ id: crypto.randomUUID(), a1: "", a2: "", b1: "", b2: "", games1: "", games2: "" });

const recomputeEndpoint = async (url: string, defaultError: string) => {
  const response = await fetch(url, { method: "POST" });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.error || defaultError);
  }
};

const toIsoFromDate = (date: string) => new Date(`${date}T20:00:00`).toISOString();

export default function ViernesCargarPage() {
  const [authorized, setAuthorized] = useState(false);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [sets, setSets] = useState<SetCard[]>([createSet()]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      const claveIngresada = prompt("Ingresá la clave de administrador:");
      const claveCorrecta = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
      if (claveIngresada !== claveCorrecta || claveCorrecta === undefined) {
        alert("Clave incorrecta. Volviendo al ranking...");
        window.location.href = "/";
        return;
      }
      setAuthorized(true);

      const { data } = await supabase.from("jugadores").select("id, nombre, slug").order("nombre", { ascending: true });
      if (data) setJugadores(data);
    };

    void init();
  }, []);

  const errors = useMemo(() => {
    return sets.map((set) => {
      if (!set.a1 || !set.a2 || !set.b1 || !set.b2) return "Completá los 4 jugadores";
      const unique = new Set([set.a1, set.a2, set.b1, set.b2]);
      if (unique.size !== 4) return "No puede haber jugadores repetidos";

      const g1 = Number(set.games1);
      const g2 = Number(set.games2);
      if (!Number.isInteger(g1) || !Number.isInteger(g2) || g1 < 0 || g2 < 0) return "Completá un score válido";
      if (g1 === g2) return "Debe haber un ganador";

      return null;
    });
  }, [sets]);

  const canSave = sets.length > 0 && errors.every((err) => err === null);

  const updateSet = (id: string, patch: Partial<SetCard>) => {
    setSets((prev) => prev.map((set) => (set.id === id ? { ...set, ...patch } : set)));
  };

  const handleGuardarNoche = async () => {
    if (!canSave) {
      alert("Revisá los sets: hay datos inválidos.");
      return;
    }

    setLoading(true);
    const sessionDateIso = toIsoFromDate(fecha);

    const { data: session, error: sessionError } = await supabase
      .from("viernes_sesiones")
      .insert([{ fecha }])
      .select("id")
      .single();

    if (sessionError || !session) {
      alert("No se pudo crear la sesión de viernes.");
      setLoading(false);
      return;
    }

    const partidosPayload = sets.map((set) => {
      const team1Names = [set.a1, set.a2];
      const team2Names = [set.b1, set.b2];
      const team1Ids = team1Names.map((name) => jugadores.find((j) => j.nombre === name)?.id ?? "");
      const team2Ids = team2Names.map((name) => jugadores.find((j) => j.nombre === name)?.id ?? "");

      return {
        fecha: sessionDateIso,
        tipo_partido: "viernes",
        grupo_viernes: session.id,
        equipo_1: team1Names,
        equipo_2: team2Names,
        equipo_1_ids: team1Ids,
        equipo_2_ids: team2Ids,
        sets_1: [1],
        sets_2: [0],
        games_1: Number(set.games1),
        games_2: Number(set.games2),
      };
    });

    const { error: insertError } = await supabase.from("partidos").insert(partidosPayload);

    if (insertError) {
      alert("No se pudieron guardar los sets de viernes.");
      setLoading(false);
      return;
    }

    try {
      await recomputeEndpoint("/api/elo/recompute", "No se pudo recomputar Elo");
      await recomputeEndpoint("/api/stats/recompute", "No se pudo recomputar stats");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      alert(`Se guardó la sesión, pero falló la recomputación: ${message}.`);
      setLoading(false);
      return;
    }

    alert("¡Noche de viernes guardada!");
    window.location.href = "/";
  };

  if (!authorized) return <div className="min-h-screen bg-slate-950" />;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto py-10">
        <Link href="/" className="text-gray-500 hover:text-white transition-all flex items-center gap-2 text-sm font-mono uppercase tracking-widest mb-8">
          ← Volver
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 border border-slate-800 p-8 rounded-[2rem] backdrop-blur-xl shadow-2xl">
          <h1 className="text-3xl font-black tracking-tighter text-green-500 mb-3">VIERNES – CARGAR SETS</h1>
          <p className="text-sm text-gray-400 mb-6">Podés cargar varios sets en una misma noche. Las parejas pueden cambiar set a set.</p>

          <div className="mb-8">
            <label className="text-xs font-bold text-gray-500 tracking-widest uppercase block mb-2">Fecha de la sesión</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-white" />
          </div>

          <div className="space-y-6">
            {sets.map((set, index) => (
              <div key={set.id} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/70">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-bold text-green-400 uppercase tracking-widest">Set {index + 1}</p>
                  {sets.length > 1 && (
                    <button onClick={() => setSets((prev) => prev.filter((item) => item.id !== set.id))} className="text-xs text-red-400 hover:text-red-300 uppercase tracking-widest">
                      Eliminar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <select value={set.a1} onChange={(e) => updateSet(set.id, { a1: e.target.value })} className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white">
                    <option value="">Equipo 1 - Jugador 1</option>
                    {jugadores.map((j) => <option key={`${set.id}-a1-${j.id}`} value={j.nombre}>{j.nombre}</option>)}
                  </select>
                  <select value={set.a2} onChange={(e) => updateSet(set.id, { a2: e.target.value })} className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white">
                    <option value="">Equipo 1 - Jugador 2</option>
                    {jugadores.map((j) => <option key={`${set.id}-a2-${j.id}`} value={j.nombre}>{j.nombre}</option>)}
                  </select>
                  <select value={set.b1} onChange={(e) => updateSet(set.id, { b1: e.target.value })} className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white">
                    <option value="">Equipo 2 - Jugador 1</option>
                    {jugadores.map((j) => <option key={`${set.id}-b1-${j.id}`} value={j.nombre}>{j.nombre}</option>)}
                  </select>
                  <select value={set.b2} onChange={(e) => updateSet(set.id, { b2: e.target.value })} className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white">
                    <option value="">Equipo 2 - Jugador 2</option>
                    {jugadores.map((j) => <option key={`${set.id}-b2-${j.id}`} value={j.nombre}>{j.nombre}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input type="number" min={0} value={set.games1} onChange={(e) => updateSet(set.id, { games1: e.target.value })} placeholder="Games Eq1" className="w-28 bg-slate-900 border border-slate-700 p-3 rounded-xl text-center font-black" />
                  <span className="text-xl text-slate-500">-</span>
                  <input type="number" min={0} value={set.games2} onChange={(e) => updateSet(set.id, { games2: e.target.value })} placeholder="Games Eq2" className="w-28 bg-slate-900 border border-slate-700 p-3 rounded-xl text-center font-black" />
                </div>

                {errors[index] && <p className="mt-3 text-xs text-amber-300 uppercase tracking-wider">⚠ {errors[index]}</p>}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <button onClick={() => setSets((prev) => [...prev, createSet()])} className="px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 font-bold uppercase tracking-widest text-xs">
              + Agregar set
            </button>
            <button disabled={!canSave || loading} onClick={handleGuardarNoche} className="flex-1 py-3 rounded-xl bg-green-500 text-black hover:bg-green-400 disabled:opacity-50 font-black uppercase tracking-widest">
              {loading ? "GUARDANDO..." : "Guardar noche"}
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
