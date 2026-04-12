import { motion } from 'motion/react';

export default function Marquee() {
  const text = "FREE SHIPPING OVER 150€ • LUXURY FASHION • BORN IN GARDA, LOVED IN MIAMI • ";
  
  return (
    <div className="bg-brand-black text-white py-3 overflow-hidden flex whitespace-nowrap">
      <motion.div
        className="flex space-x-8"
        animate={{ x: [0, -1035] }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration: 20,
        }}
      >
        <span className="text-xs tracking-[0.2em] uppercase font-medium">{text}</span>
        <span className="text-xs tracking-[0.2em] uppercase font-medium">{text}</span>
        <span className="text-xs tracking-[0.2em] uppercase font-medium">{text}</span>
        <span className="text-xs tracking-[0.2em] uppercase font-medium">{text}</span>
      </motion.div>
    </div>
  );
}
