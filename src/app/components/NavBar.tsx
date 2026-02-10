'use client';
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  const linkClase = (ruta: string) => {
    const base = "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all";
    const activo = "bg-[#bef264]/10 text-[#bef264]";
    const inactivo = "text-slate-400 hover:text-white hover:bg-white/5";
    return `${base} ${pathname === ruta ? activo : inactivo}`;
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl">
          <a href="/" className="font-black tracking-tighter italic text-xl hover:text-[#bef264] transition-colors">
            PADEL<span className="text-[#bef264]">.</span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/" className={linkClase('/')}>
              Ranking
            </a>
            <a href="/historial" className={linkClase('/historial')}>
              Historial
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}