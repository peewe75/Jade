import { motion } from 'motion/react';

const communityImages = [
  'https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=400&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=400&auto=format&fit=crop',
];

export default function CommunitySection() {
  return (
    <section className="py-28 md:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-12 md:mb-14">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-4"
        >
          Community
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-3xl md:text-4xl lg:text-5xl font-serif"
        >
          Worn With Love
        </motion.h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {communityImages.map((src, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.08 }}
            className="aspect-square overflow-hidden"
          >
            <img
              src={src}
              alt={`Community ${index + 1}`}
              className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-12 md:mt-14">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gray-400">
          @jadeeditorial
        </p>
      </div>
    </section>
  );
}
