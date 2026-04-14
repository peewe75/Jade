import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Star, Camera, X, RefreshCw } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Tilt from 'react-parallax-tilt';

interface ProductData {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  category: string;
  sizes?: string[];
  detailsAndCare?: string;
  shippingAndReturns?: string;
}

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>('details');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // VTO State
  const [isVtoModalOpen, setIsVtoModalOpen] = useState(false);
  const [vtoFile, setVtoFile] = useState<File | null>(null);
  const [vtoConsent, setVtoConsent] = useState(false);
  const [isVtoProcessing, setIsVtoProcessing] = useState(false);
  const [vtoResultImage, setVtoResultImage] = useState<string | null>(null);
  const [vtoPreviewImage, setVtoPreviewImage] = useState<string | null>(null);
  const [vtoPhase, setVtoPhase] = useState<'idle' | 'analyzing' | 'generating'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as ProductData);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (!vtoFile) {
      setVtoPreviewImage(null);
      return;
    }

    const previewUrl = URL.createObjectURL(vtoFile);
    setVtoPreviewImage(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [vtoFile]);

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const handleVtoSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vtoFile || !vtoConsent || !displayProduct) return;

    setIsVtoProcessing(true);
    setVtoResultImage(null);
    setVtoPhase('analyzing');

    try {
      // Step 1: Analyze images to get a prompt
      const formData = new FormData();
      formData.append('userImage', vtoFile);
      formData.append('productImageUrl', displayProduct.images[0]);
      formData.append('productName', displayProduct.name);
      formData.append('productCategory', displayProduct.category);

      const analyzeResponse = await fetch('/api/vto/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!analyzeResponse.ok) {
        let errorMsg = `Errore analisi (${analyzeResponse.status})`;
        try {
          const errorData = await analyzeResponse.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {}
        
        console.error("Analysis Error Details:", errorMsg);
        alert(errorMsg);
        setIsVtoProcessing(false);
        return;
      }

      const analyzeData = await analyzeResponse.json();
      if (!analyzeData.success) {
        alert(analyzeData.error || "Errore durante l'analisi.");
        return;
      }

      // Step 2: Generate final image using the prompt
      setVtoPhase('generating');
      
      const generateResponse = await fetch('/api/vto/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagenPrompt: analyzeData.imagenPrompt }),
      });

      if (!generateResponse.ok) {
        const text = await generateResponse.text();
        console.error("Generation Error:", generateResponse.status, text);
        alert(`Errore generazione (${generateResponse.status}). Riprova.`);
        return;
      }

      const generateData = await generateResponse.json();
      if (generateData.success) {
        setVtoResultImage(generateData.imageUrl);
      } else {
        alert(generateData.error || "Errore nella generazione finale.");
      }

    } catch (error) {
      console.error("VTO Process Error:", error);
      alert("Errore di connessione al camerino.");
    } finally {
      setIsVtoProcessing(false);
      setVtoPhase('idle');
    }
  };

  if (loading) {
    return (
      <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="animate-pulse flex flex-col md:flex-row gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 aspect-[3/4] bg-gray-200"></div>
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-4 bg-gray-200 w-1/4"></div>
            <div className="h-10 bg-gray-200 w-3/4"></div>
            <div className="h-6 bg-gray-200 w-1/4"></div>
            <div className="h-24 bg-gray-200 w-full mt-8"></div>
          </div>
        </div>
      </main>
    );
  }

  // Fallback for hardcoded products from the home page that don't exist in DB yet
  const displayProduct = product || {
    id: id || '1',
    name: "The Miami Slip Dress",
    price: 129.00,
    category: "Dresses",
    description: "The perfect slip dress that takes you from a sunset aperitivo on Lago di Garda to a glamorous night out in Miami. Crafted from premium silk-blend satin, it features a cowl neckline and an elegant open back.",
    images: [
      "https://picsum.photos/seed/miamidress/800/1067",
      "https://picsum.photos/seed/miamidress2/800/1067",
      "https://picsum.photos/seed/miamidress3/800/1067"
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL']
  };

  const displayImages = displayProduct.images.filter(Boolean);
  const heroImage = displayImages[0];
  const galleryImages = displayImages.slice(1);

  const availableSizes = displayProduct.sizes || ['XS', 'S', 'M', 'L', 'XL'];
  const detailsAndCareItems = (displayProduct.detailsAndCare || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const shippingAndReturnsText = displayProduct.shippingAndReturns || '';

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
        
        {/* Left: Images */}
        <div className="w-full md:w-1/2 space-y-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="aspect-[3/4] bg-gray-100 overflow-hidden cursor-zoom-in"
            onClick={() => heroImage && setLightboxImage(heroImage)}
          >
            <Tilt
              className="w-full h-full"
              tiltMaxAngleX={15}
              tiltMaxAngleY={15}
              perspective={1500}
              scale={1.05}
              transitionSpeed={1000}
              gyroscope={true}
              glareEnable={true}
              glareMaxOpacity={0.25}
              glarePosition="all"
            >
              <img 
                src={heroImage} 
                alt={displayProduct.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </Tilt>
          </motion.div>
          {galleryImages.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((img, index) => {
                const actualIndex = index + 1;
                return (
                <button
                  key={`${img}-${actualIndex}`}
                  type="button"
                  onClick={() => setLightboxImage(img)}
                  className="aspect-[3/4] overflow-hidden bg-gray-100 border border-transparent transition-all hover:border-brand-black cursor-zoom-in"
                >
                  <img 
                    src={img} 
                    alt={`Detail ${actualIndex + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="w-full md:w-1/2 md:sticky md:top-24 h-fit">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">{displayProduct.category}</p>
            <h1 className="text-3xl md:text-4xl font-serif mb-4">{displayProduct.name}</h1>
            <p className="text-xl mb-4">€{displayProduct.price.toFixed(2)}</p>
            <div className="flex items-center space-x-1 text-sm mb-6">
              <div className="flex text-black">
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
                <Star className="w-4 h-4 fill-current" />
              </div>
              <span className="text-gray-500 ml-2">(42 Reviews)</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {displayProduct.description}
            </p>
          </div>

          {/* Size Selector */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium uppercase tracking-wider">Size</span>
              <button className="text-xs text-gray-500 underline hover:text-black transition-colors">Size Guide</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`py-3 px-6 text-sm transition-colors border ${
                    selectedSize === size 
                      ? 'border-brand-black bg-brand-black text-white' 
                      : 'border-gray-200 hover:border-brand-black text-brand-black'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Add to Cart & VTO */}
          <div className="space-y-3 mb-8">
            <button className="w-full bg-brand-black text-white py-4 uppercase tracking-widest text-sm font-medium hover:bg-gray-900 transition-colors">
              Add to Cart
            </button>
            
            <button 
              onClick={() => {
                if (!user) {
                  alert("Devi effettuare l'accesso per usare il Camerino Virtuale.");
                  return;
                }
                setIsVtoModalOpen(true);
              }}
              className="w-full bg-white text-brand-black border border-brand-black py-4 uppercase tracking-widest text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Camera className="w-4 h-4" />
              <span>Camerino Virtuale (AI)</span>
            </button>
          </div>

          {/* Accordions */}
          <div className="border-t border-gray-200">
            {/* Details */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => toggleAccordion('details')}
                className="w-full py-4 flex justify-between items-center text-sm uppercase tracking-wider font-medium"
              >
                Details & Care
                {openAccordion === 'details' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordion === 'details' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="pb-4 text-sm text-gray-600 leading-relaxed"
                >
                  {detailsAndCareItems.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                      {detailsAndCareItems.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="list-disc pl-4 space-y-1">
                      <li>95% Silk, 5% Elastane</li>
                      <li>Cowl neckline</li>
                      <li>Adjustable spaghetti straps</li>
                      <li>Dry clean only</li>
                      <li>Made in Italy</li>
                    </ul>
                  )}
                </motion.div>
              )}
            </div>

            {/* Shipping */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => toggleAccordion('shipping')}
                className="w-full py-4 flex justify-between items-center text-sm uppercase tracking-wider font-medium"
              >
                Shipping & Returns
                {openAccordion === 'shipping' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {openAccordion === 'shipping' && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="pb-4 text-sm text-gray-600 leading-relaxed"
                >
                  {shippingAndReturnsText ? (
                    <p className="whitespace-pre-line">{shippingAndReturnsText}</p>
                  ) : (
                    <>
                      <p className="mb-2"><strong>Free standard shipping</strong> on all orders over €150.</p>
                      <p>Returns are accepted within 14 days of delivery. Items must be unworn with all tags attached.</p>
                    </>
                  )}
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* VTO Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setLightboxImage(null)}
              aria-label="Chiudi immagine ingrandita"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative z-10 w-full max-w-5xl"
            >
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
                aria-label="Chiudi popup immagine"
              >
                <X className="w-7 h-7" />
              </button>
              <div className="max-h-[88vh] overflow-hidden bg-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <img
                  src={lightboxImage}
                  alt={displayProduct.name}
                  className="w-full max-h-[88vh] object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        )}

        {isVtoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isVtoProcessing && setIsVtoModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-sm"
            >
              <button 
                onClick={() => setIsVtoModalOpen(false)}
                disabled={isVtoProcessing}
                className="absolute top-6 right-6 z-10 text-gray-400 hover:text-brand-black disabled:opacity-50 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-10 premium-gradient">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-serif mb-3 tracking-tight">Camerino Virtuale <span className="italic">AI</span></h2>
                  <div className="w-12 h-[1px] bg-brand-black mx-auto mb-4"></div>
                  <p className="text-brand-gray-dark text-xs uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                    Personalized AI experience. full-body photo suggested for optimal results.
                  </p>
                </div>

                {vtoResultImage ? (
                  <div className="space-y-6">
                    <div className="aspect-[3/4] max-w-sm mx-auto bg-gray-100 overflow-hidden">
                      <img src={vtoResultImage} alt="VTO Result" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex justify-center">
                      <button 
                        onClick={() => {
                          setVtoResultImage(null);
                          setVtoFile(null);
                        }}
                        className="text-sm underline underline-offset-4 text-gray-500 hover:text-brand-black"
                      >
                        Riprova con un'altra foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVtoSubmit} className="space-y-6">
                    {/* File Upload */}
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        ref={fileInputRef}
                        onChange={(e) => setVtoFile(e.target.files?.[0] || null)}
                        className="hidden" 
                        id="vto-upload"
                      />
                      <label 
                        htmlFor="vto-upload" 
                        className={`group flex flex-col items-center justify-center w-full aspect-video border-[1px] p-8 cursor-pointer transition-all duration-300 ${
                          vtoFile ? 'border-brand-black bg-brand-gray-light' : 'border-gray-200 hover:border-brand-black bg-white'
                        }`}
                      >
                        {vtoFile ? (
                          <div className="relative w-full h-full">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setVtoFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-2 right-2 z-20 w-8 h-8 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all shadow-lg"
                              title="Rimuovi foto"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {vtoPreviewImage && (
                              <img
                                src={vtoPreviewImage}
                                alt="Anteprima foto caricata"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/20" />
                            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center text-white px-4">
                              <div className="w-12 h-12 bg-black/70 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-6 h-6" />
                              </div>
                              <p className="text-sm font-semibold mb-1">Photo Uploaded</p>
                              <p className="text-xs uppercase tracking-widest break-all">{vtoFile.name}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-4 text-brand-gray-dark group-hover:text-brand-black transition-colors">
                            <Camera className="w-10 h-10 stroke-[1px]" />
                            <div className="text-center">
                              <p className="text-xs uppercase tracking-[0.2em] font-medium">Upload Selection</p>
                              <p className="text-[10px] uppercase tracking-widest mt-2 opacity-60">Full-body shot recommended</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* GDPR Consent */}
                    <div className="flex items-start space-x-3 bg-gray-50 p-4 border border-gray-100">
                      <input 
                        type="checkbox" 
                        id="vto-consent" 
                        checked={vtoConsent}
                        onChange={(e) => setVtoConsent(e.target.checked)}
                        className="mt-1 w-4 h-4 text-brand-black border-gray-300 rounded focus:ring-brand-black"
                      />
                      <label htmlFor="vto-consent" className="text-xs text-gray-600 leading-relaxed">
                        <strong>Privacy & GDPR:</strong> Acconsento al trattamento della mia immagine personale per la generazione del camerino virtuale. Le immagini vengono elaborate in modo sicuro sui server Google Cloud e non vengono salvate permanentemente.
                      </label>
                    </div>

                    {/* Submit */}
                    <button 
                      type="submit" 
                      disabled={!vtoFile || !vtoConsent || isVtoProcessing}
                      className="w-full bg-brand-black text-white py-4 uppercase tracking-widest text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isVtoProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>
                            {vtoPhase === 'analyzing' ? 'Analizzando la foto...' : 'Creando il tuo outfit...'}
                          </span>
                        </>
                      ) : (
                        <span>Genera Prova Virtuale</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
