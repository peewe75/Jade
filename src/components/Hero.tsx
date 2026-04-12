import { motion } from 'motion/react';

export default function Hero() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2000&auto=format&fit=crop"
          alt="Fashion Model"
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white text-sm md:text-base uppercase tracking-[0.3em] mb-4 font-medium"
        >
          Born Between Garda & Miami
        </motion.p>
        
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-white text-6xl md:text-8xl lg:text-9xl font-serif mb-12 max-w-5xl leading-[0.9] tracking-tighter"
        >
          The New <br className="md:hidden" /> <span className="italic">Collection</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href="#shop"
            className="btn-premium inline-block bg-white text-brand-black px-12 py-5 text-xs uppercase tracking-[0.3em] font-semibold hover:tracking-[0.4em] transition-all duration-500"
          >
            Explore Shop
          </a>
        </motion.div>
      </div>
    </div>
  );
}
