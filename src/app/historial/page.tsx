'use client';
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NavBar from "@/app/components/NavBar";
import FloatingButton from "@/app/components/FloatingButton";

type Filtros = {
  año: string;
  mes: string;
  dia: string;
  tipo: string;
  jugador: string;
};

export default function HistorialPage() {
  const [partidos, setPartidos] = useState<any[]>([]);
  const [partidosFiltrados, setPartidosFiltrados] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [paginaActual, setPaginaActual] = useState(1);
  const partidosPorPagina = 20;

  const [filtros, setFiltros] = useState<Filtros>({
    año: "", mes: "", dia: "", tipo: "", jugador: ""
  });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { aplicarFiltros(); }, [filtros, partidos]);

  const fetchData = async () => {
    setLoading(true);
    const { data: dataPartidos } = await supabase
      .from('partidos')
      .select('*')
      .order('fecha', { ascending: false });

    const { data: dataJugadores } = await supabase
      .from('jugadores')
      .select('nombre')
      .order('nombre', { ascending: true });

    if (dataPartidos) setPartidos(dataPartidos);
    if (dataJugadores) setJugadores(dataJugadores);
    setLoading(false);
  };

  const aplicarFiltros = () => {
    let resultado = [...partidos];

    if (filtros.año) {
      resultado = resultado.filter(p => new Date(p.fecha).getFullYear().toString() === filtros.año);
    }
    if (filtros.mes) {
      resultado = resultado.filter(p => (new Date(p.fecha).getMonth() + 1).toString() === filtros.mes);
    }
    if (filtros.dia) {
      resultado = resultado.filter(p => new Date(p.fecha).getDate().toString() === filtros.dia);
    }
    if (filtros.tipo) {
      resultado = resultado.filter(p => p.tipo_partido === filtros.tipo);
    }
    if (filtros.jugador) {
      resultado = resultado.filter(p =>
        p.equipo_1?.includes(filtros.jugador) || p.equipo_2?.includes(filtros.jugador)
      );
    }

    setPartidosFiltrados(resultado);
    setPaginaActual(1);
  };

  const limpiarFiltros = () => {
    setFiltros({ año: "", mes: "", dia: "", tipo: "", jugador: "" });
  };

  const indiceUltimo = paginaActual * partidosPorPagina;
  const indicePrimero = indiceUltimo - partidosPorPagina;
  const partidosActuales = partidosFiltrados.slice(indicePrimero, indiceUltimo);
  const totalPaginas = Math.ceil(partidosFiltrados.length / partidosPorPagina);

  const cambiarPagina = (numeroPagina: number) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const añosUnicos = [...new Set(partidos.map(p => new Date(p.fecha).getFullYear()))].sort((a, b) => b - a);

  const selectClase = "w-full bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-[#bef264] transition-all text-white [&>option]:bg-slate-800 [&>option]:text-white";
  const inputClase = "w-full bg-slate-800 border border-slate-700 p-3 rounded-xl focus:outline-none focus:border-[#bef264] transition-all text-white placeholder:text-slate-500";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-white text-xl font-mono tracking-widest">Cargando historial...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pt-28">
      <NavBar />

      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black tracking-tighter text-[#bef264] mb-8 uppercase drop-shadow-[0_0_10px_rgba(190,242,100,0.3)]"
        >
          Historial de Partidos
        </motion.h1>

        {/* Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Filtros</h2>
            <button
              onClick={limpiarFiltros}
              className="text-xs text-gray-500 hover:text-[#bef264] transition-all uppercase tracking-wider hover:underline"
            >
              Limpiar todo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Año */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block">Año</label>
              <select
                value={filtros.año}
                onChange={(e) => setFiltros({...filtros, año: e.target.value})}
                className={selectClase}
              >
                <option value="">Todos</option>
                {añosUnicos.map(año => (
                  <option key={año} value={año}>{año}</option>
                ))}
              </select>
            </div>

            {/* Mes */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block">Mes</label>
              <input
                type="month"
                value={filtros.año && filtros.mes ? `${filtros.año}-${filtros.mes.padStart(2, '0')}` : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [año, mes] = e.target.value.split('-');
                    setFiltros({...filtros, año, mes: parseInt(mes).toString()});
                  } else {
                    setFiltros({...filtros, mes: ''});
                  }
                }}
                className={inputClase}
              />
            </div>

            {/* Fecha completa */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block">Fecha exacta</label>
              <input
                type="date"
                value={
                  filtros.año && filtros.mes && filtros.dia
                    ? `${filtros.año}-${filtros.mes.padStart(2, '0')}-${filtros.dia.padStart(2, '0')}`
                    : ''
                }
                onChange={(e) => {
                  if (e.target.value) {
                    const [año, mes, dia] = e.target.value.split('-');
                    setFiltros({
                      ...filtros,
                      año,
                      mes: parseInt(mes).toString(),
                      dia: parseInt(dia).toString()
                    });
                  } else {
                    setFiltros({...filtros, dia: ''});
                  }
                }}
                className={inputClase}
              />
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block">Tipo</label>
              <select
                value={filtros.tipo}
                onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
                className={selectClase}
              >
                <option value="">Todos</option>
                <option value="martes">Martes</option>
                <option value="viernes">Viernes</option>
              </select>
            </div>

            {/* Jugador */}
            <div className="space-y-2">
              <label className="text-xs text-gray-500 uppercase tracking-wider block">Jugador</label>
              <select
                value={filtros.jugador}
                onChange={(e) => setFiltros({...filtros, jugador: e.target.value})}
                className={selectClase}
              >
                <option value="">Todos</option>
                {jugadores.map(j => (
                  <option key={j.nombre} value={j.nombre}>{j.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contador */}
          <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#bef264] rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">
              {partidosFiltrados.length} partido{partidosFiltrados.length !== 1 ? 's' : ''} encontrado{partidosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>

        {/* Tabla */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        >
          {partidosActuales.length === 0 ? (
            <div className="p-20 text-center">
              <div className="text-6xl mb-4 opacity-20">🎾</div>
              <div className="text-gray-500 text-lg">No hay partidos que coincidan con los filtros</div>
              <button
                onClick={limpiarFiltros}
                className="mt-6 text-[#bef264] hover:underline text-sm uppercase tracking-wider"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/[0.05] text-slate-500 text-[10px] uppercase tracking-[0.2em]">
                  <tr>
                    <th className="p-4 md:p-6 text-left">Fecha</th>
                    <th className="p-4 md:p-6 text-left">Tipo</th>
                    <th className="p-4 md:p-6 text-left">Equipo 1</th>
                    <th className="p-4 md:p-6 text-center">Sets</th>
                    <th className="p-4 md:p-6 text-left">Equipo 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {partidosActuales.map((partido) => {
                    const fecha = new Date(partido.fecha);
                    const eq1Gano = partido.sets_1?.[0] > partido.sets_2?.[0];
                    return (
                      <tr key={partido.id} className="hover:bg-[#bef264]/5 transition-all">
                        <td className="p-4 md:p-6 text-sm text-gray-400 font-mono whitespace-nowrap">
                          {fecha.toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4 md:p-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            partido.tipo_partido === 'martes'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          }`}>
                            {partido.tipo_partido || 'martes'}
                          </span>
                        </td>
                        <td className={`p-4 md:p-6 font-bold text-sm md:text-base ${eq1Gano ? 'text-white' : 'text-slate-600'}`}>
                          {partido.equipo_1?.[0]} <span className="opacity-30">&</span> {partido.equipo_1?.[1]}
                        </td>
                        <td className="p-4 md:p-6 text-center">
                          <div className="inline-block bg-[#bef264] text-black px-4 py-1 rounded-xl font-black text-xl shadow-[0_0_20px_rgba(190,242,100,0.3)] skew-x-[-12deg]">
                            {partido.sets_1?.[0] || 0}-{partido.sets_2?.[0] || 0}
                          </div>
                        </td>
                        <td className={`p-4 md:p-6 font-bold text-sm md:text-base ${!eq1Gano ? 'text-white' : 'text-slate-600'}`}>
                          {partido.equipo_2?.[0]} <span className="opacity-30">&</span> {partido.equipo_2?.[1]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row justify-between items-center gap-4 mt-8 bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6"
          >
            <button
              onClick={() => cambiarPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
              className="px-6 py-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm uppercase tracking-wider border border-slate-700"
            >
              ← Anterior
            </button>

            <div className="flex gap-2 flex-wrap justify-center">
              {[...Array(totalPaginas)].map((_, i) => {
                const pagina = i + 1;
                const mostrar =
                  pagina === 1 ||
                  pagina === totalPaginas ||
                  (pagina >= paginaActual - 1 && pagina <= paginaActual + 1);

                if (!mostrar) {
                  if (pagina === 2 || pagina === totalPaginas - 1) {
                    return <span key={i} className="px-2 text-gray-600 self-center">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={i}
                    onClick={() => cambiarPagina(pagina)}
                    className={`w-12 h-12 rounded-xl font-bold transition-all ${
                      paginaActual === pagina
                        ? 'bg-[#bef264] text-black shadow-[0_0_20px_rgba(190,242,100,0.3)]'
                        : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
                    }`}
                  >
                    {pagina}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => cambiarPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
              className="px-6 py-3 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm uppercase tracking-wider border border-slate-700"
            >
              Siguiente →
            </button>
          </motion.div>
        )}
      </div>

      <FloatingButton />
    </main>
  );
}