'use client';
import { motion } from "framer-motion";

export default function FloatingButton() {
  return (
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
  );
}