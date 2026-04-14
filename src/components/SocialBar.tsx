import { motion } from 'motion/react';
import { Instagram, Facebook, Pin } from 'lucide-react';

export default function SocialBar() {
  const socials = [
    { icon: <Instagram className="w-4 h-4" />, href: 'https://instagram.com/theblondesconcept', label: 'Instagram' },
    { 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
      ), 
      href: '#', 
      label: 'TikTok' 
    },
    { icon: <Pin className="w-4 h-4" />, href: '#', label: 'Pinterest' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1, duration: 0.8 }}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col space-y-6"
    >
      <div className="w-[1px] h-12 bg-gray-300 mx-auto opacity-50"></div>
      {socials.map((social, index) => (
        <a 
          key={index}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-brand-black transition-colors duration-300 transform hover:scale-110"
          aria-label={social.label}
        >
          {social.icon}
        </a>
      ))}
      <div className="w-[1px] h-12 bg-gray-300 mx-auto opacity-50"></div>
      
      {/* Vertical text label */}
      <span className="text-[9px] uppercase tracking-[0.4em] text-gray-400 rotate-90 mt-8 origin-center whitespace-nowrap">
        Follow Us
      </span>
    </motion.div>
  );
}
