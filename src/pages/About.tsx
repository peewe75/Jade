import { motion } from 'motion/react';

export default function About() {
  return (
    <main className="flex-grow pt-24 pb-16">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24 text-center">
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-6"
        >
          Our Story
        </motion.p>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-6xl lg:text-7xl font-serif max-w-4xl mx-auto leading-tight"
        >
          Luxury Fashion Born Between Lago di Garda & Miami.
        </motion.h1>
      </section>

      {/* Image Header with Effect */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative w-full h-[70vh] md:h-[90vh] mb-24 overflow-hidden bg-[#be1818]"
      >
        {/* Blurred background extension */}
        <div className="absolute inset-0">
          <img 
            src="/images/22.jpeg" 
            alt="Background Effect" 
            className="w-full h-full object-cover blur-3xl scale-110 opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[#be1818]/10" />
        </div>

        {/* Sharp centered image */}
        <div className="relative h-full flex justify-center items-center z-10">
          <img 
            src="/images/22.jpeg" 
            alt="Fashion Lifestyle" 
            className="h-full object-contain mx-auto shadow-2xl"
            referrerPolicy="no-referrer"
          />
          {/* Subtle vignette/soften edges */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(190,24,24,0.3)]" />
        </div>
      </motion.section>

      {/* Text & Image Split */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-24">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <h2 className="text-3xl md:text-4xl font-serif mb-6">The Vision</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              The Blondes Brand was born from a desire to bridge two distinct worlds: the timeless, effortless elegance of Italian style, deeply rooted in the serene landscapes of Lago di Garda, and the vibrant, bold, and glamorous energy of Miami's Rodeo Road and Colline Avenue.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We create pieces for the modern woman who is confident, dynamic, and unapologetic. Our collections are designed to make you feel luxurious whether you are strolling by the lake or attending an exclusive rooftop party in the city.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 aspect-[4/5] bg-gray-100"
          >
            <img 
              src="/images/19.jpeg" 
              alt="Founder Vision" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Quality Section */}
      <section className="bg-brand-black text-white py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-serif mb-8">Uncompromising Quality</h2>
          <p className="text-gray-300 leading-relaxed text-lg">
            Every piece in The Blondes Cube is meticulously crafted. We source only the finest fabrics and work with skilled artisans to ensure that our garments not only look stunning but stand the test of time. It's not just fashion; it's an investment in your confidence.
          </p>
        </div>
      </section>
    </main>
  );
}
