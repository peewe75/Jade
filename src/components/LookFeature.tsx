import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import videoHome from '../../Video/video home.mp4';

export default function LookFeature() {
  return (
    <section className="py-28 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="order-2 lg:order-1"
        >
          <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-5">The Look</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6 leading-[0.95]">
            Pieces That Hold<br />
            <span className="italic">The Whole Mood</span>
          </h2>
          <p className="text-gray-600 text-sm md:text-[15px] leading-relaxed mb-8 max-w-md">
            Sharp structure, fluid movement and an effortless finish. Build a full look
            that feels considered without ever looking overworked.
          </p>
          <Link
            to="/shop"
            className="inline-block border border-brand-black px-8 py-3 text-[11px] uppercase tracking-[0.28em] hover:bg-brand-black hover:text-white transition-colors"
          >
            Shop The Look
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="order-1 lg:order-2"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
            <video
              src={videoHome}
              className="w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
