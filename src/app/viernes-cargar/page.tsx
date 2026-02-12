"use client";
import { useEffect } from "react";

export default function ViernesCargarPage() {
  useEffect(() => {
    window.location.href = "/cargar";
  }, []);

  return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Redirigiendo…</div>;
}
