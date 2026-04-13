import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function ClosingCta() {
  return (
    <section className="py-28 md:py-32 px-4 sm:px-6 lg:px-8 bg-brand-black text-white">
      <div className="max-w-4xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[11px] uppercase tracking-[0.35em] text-gray-400 mb-6"
        >
          Final Edit
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl md:text-6xl font-serif mb-8 leading-[0.95]"
        >
          Enter The Collection<br />
          <span className="italic">With Intention</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-gray-400 text-sm md:text-[15px] leading-relaxed mb-10 max-w-lg mx-auto"
        >
          A final pass through the pieces designed to stay with you longer than a season.
          Clean lines, quiet confidence and a sharper way to dress.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            to="/shop"
            className="inline-block bg-white text-brand-black px-12 py-5 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-gray-200 transition-colors"
          >
            Explore Collection
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
