import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

const products = [
  {
    id: 1,
    name: "The Miami Slip Dress",
    price: "€129.00",
    image: "https://picsum.photos/seed/miamidress/800/1067",
    tag: "Trending"
  },
  {
    id: 2,
    name: "Garda Linen Blazer",
    price: "€189.00",
    image: "https://picsum.photos/seed/gardablazer/800/1067",
  },
  {
    id: 3,
    name: "Rodeo Drive Top",
    price: "€89.00",
    image: "https://picsum.photos/seed/rodeotop/800/1067",
    tag: "New In"
  },
  {
    id: 4,
    name: "Colline Avenue Trousers",
    price: "€149.00",
    image: "https://picsum.photos/seed/collinetrousers/800/1067",
  }
];

export default function FeaturedProducts() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="shop">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
        <div>
          <h2 className="text-3xl md:text-4xl font-serif mb-4">Trending Now</h2>
          <p className="text-gray-500 text-sm tracking-wide uppercase">As seen on TikTok & Instagram</p>
        </div>
        <Link to="/shop" className="hidden md:inline-block border-b border-brand-black pb-1 text-sm uppercase tracking-widest hover:text-gray-500 hover:border-gray-500 transition-colors">
          View All
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map((product, index) => (
          <motion.div 
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <Link to={`/product/${product.id}`} className="block">
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 mb-4">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  referrerPolicy="no-referrer"
                />
                {product.tag && (
                  <div className="absolute top-4 left-4 bg-white px-3 py-1 text-[10px] uppercase tracking-widest font-medium">
                    {product.tag}
                  </div>
                )}
                
                {/* Quick Add Button (appears on hover) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                  <button 
                    className="w-full bg-white/90 backdrop-blur-sm text-brand-black py-3 text-xs uppercase tracking-widest font-medium hover:bg-brand-black hover:text-white transition-colors"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent navigation when clicking Quick Add
                      // Add to cart logic here
                    }}
                  >
                    Quick Add
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500">{product.price}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 text-center md:hidden">
        <Link to="/shop" className="inline-block border border-brand-black px-8 py-3 text-sm uppercase tracking-widest hover:bg-brand-black hover:text-white transition-colors">
          View All Collection
        </Link>
      </div>
    </section>
  );
}


