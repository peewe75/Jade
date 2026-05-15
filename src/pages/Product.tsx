import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Star, Camera, X, RefreshCw, Heart } from 'lucide-react';
import { useFavorites } from '../contexts/FavoritesContext';
import { useParams, Link } from 'react-router-dom';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Tilt from 'react-parallax-tilt';
import { useTranslation } from 'react-i18next';
import { getProductText } from '../lib/i18nProduct';
import VariantSelector, { type ProductVariant } from '../components/VariantSelector';
import ProductStory, { type Story } from '../components/ProductStory';
import { useCart } from '../contexts/CartContext';

interface ProductData {
  id: string;
  name: string;
  price: number;
  basePrice?: number;
  description: string;
  images: string[];
  category: string;
  sizes?: string[];
  status?: string;
  isOneOfAKind?: boolean;
  variants?: ProductVariant[];
  translations?: { it: { name?: string; description?: string; detailsAndCare?: string; shippingAndReturns?: string }; en: { name?: string; description?: string; detailsAndCare?: string; shippingAndReturns?: string } };
  story?: Story;
  detailsAndCare?: string;
  shippingAndReturns?: string;
}

interface VtoGalleryItem {
  id: string;
  productId?: string;
  productName?: string;
  status?: string;
  imageUrl?: string;
  createdAt?: { toMillis?: () => number } | null;
  completedAt?: { toMillis?: () => number } | null;
}

/**
 * Ridimensiona e comprime un'immagine via Canvas.
 * Necessario perché Netlify Functions hanno un limite ~6MB sul body della request
 * e una foto da fotocamera moderna (4-10MB) + overhead base64 sfora facilmente.
 * Target: lato lungo max 1024px, JPEG q=0.85 → tipicamente 200-500KB.
 */
async function resizeAndEncodeImage(
  file: File,
  maxDimension = 1024,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Impossibile leggere il file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Immagine non valida.'));
    image.src = dataUrl;
  });

  const { width, height } = img;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non supportato.');
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Output JPEG per dimensioni minime
  const mimeType = 'image/jpeg';
  const outDataUrl = canvas.toDataURL(mimeType, quality);
  const base64 = outDataUrl.split(',')[1] || '';
  return { base64, mimeType };
}

export default function Product() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addItem } = useCart();
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
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
  const [myTryOns, setMyTryOns] = useState<VtoGalleryItem[]>([]);
  const [isMyTryOnsLoading, setIsMyTryOnsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as ProductData;
          setProduct(data);
          if (data.variants && data.variants.length > 0) {
            const first = data.variants.find(v => v.stock - (v.reserved ?? 0) > 0) ?? data.variants[0];
            setSelectedVariantId(first.id);
          }
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

  useEffect(() => {
    if (!user) {
      setMyTryOns([]);
      setIsMyTryOnsLoading(false);
      return;
    }

    setIsMyTryOnsLoading(true);
    const jobsQuery = query(
      collection(db, 'vto_jobs'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const nextItems = snapshot.docs
          .map((jobDoc) => ({
            id: jobDoc.id,
            ...jobDoc.data(),
          }) as VtoGalleryItem)
          .filter((item) => item.status === 'completed' && typeof item.imageUrl === 'string' && item.imageUrl.length > 0)
          .sort((a, b) => {
            const aTime = a.completedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.completedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
          });

        setMyTryOns(nextItems);
        setIsMyTryOnsLoading(false);
      },
      (error) => {
        console.error('My try-on gallery error:', error);
        setMyTryOns([]);
        setIsMyTryOnsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Cleanup della sottoscrizione Firestore al risultato VTO (un solo listener alla volta).
  const vtoUnsubRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      vtoUnsubRef.current?.();
      vtoUnsubRef.current = null;
    };
  }, []);

  const handleVtoSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vtoFile || !vtoConsent || !displayProduct) return;
    if (!user) {
      alert("Devi essere loggata per usare il camerino virtuale.");
      return;
    }

    // Chiudi eventuale listener precedente
    vtoUnsubRef.current?.();
    vtoUnsubRef.current = null;

    setIsVtoProcessing(true);
    setVtoResultImage(null);
    setVtoPhase('generating');

    try {
      // 1. Resize + compress lato client
      const { base64, mimeType } = await resizeAndEncodeImage(vtoFile, 1024, 0.85);

      // 2. jobId casuale + ID token Firebase per autenticare la scrittura dal server
      const jobId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // 3. Crea il doc pending in Firestore — la Cloud Function lo aggiornerà
      const jobRef = doc(db, 'vto_jobs', jobId);
      await setDoc(jobRef, {
        userId: user.uid,
        status: 'pending',
        productId: displayProduct.id,
        productName: displayProduct.name,
        createdAt: serverTimestamp(),
      });

      // 4. Sottoscrivi il doc — ricevi il risultato appena la function finisce
      const unsub = onSnapshot(
        jobRef,
        (snap) => {
          const data = snap.data();
          if (!data) return;
          if (data.status === 'completed' && data.imageUrl) {
            setVtoResultImage(data.imageUrl);
            setIsVtoProcessing(false);
            setVtoPhase('idle');
            vtoUnsubRef.current?.();
            vtoUnsubRef.current = null;
          } else if (data.status === 'failed') {
            alert(data.error || "Errore durante la generazione.");
            setIsVtoProcessing(false);
            setVtoPhase('idle');
            vtoUnsubRef.current?.();
            vtoUnsubRef.current = null;
          }
        },
        (err) => {
          console.error('VTO snapshot error:', err);
          alert('Errore di connessione al camerino.');
          setIsVtoProcessing(false);
          setVtoPhase('idle');
        }
      );
      vtoUnsubRef.current = unsub;

      // 5. Chiama la Cloud Function Firebase (fire — non blocchiamo la UI in attesa).
      //    La function scrive il risultato in Firestore; il listener onSnapshot lo riceve.
      //    Timeout client a 300s per matchare quello backend (Gemini image può impiegare 30-120s).
      const vtoCall = httpsCallable(functions, 'vtoTryon', {
        timeout: 300000,
      });
      vtoCall({
        jobId,
        userImageBase64: base64,
        userMimeType: mimeType,
        productImageUrl: displayProduct.images?.[0] || '',
        productName: displayProduct.name,
        productCategory: displayProduct.category || 'Clothing',
      }).catch((err) => {
        const code = err?.code || '';
        // deadline-exceeded: il client ha smesso di aspettare ma la function può ancora
        // completare. Lasciamo che sia onSnapshot a chiudere il flusso via Firestore.
        if (
          code === 'functions/deadline-exceeded' ||
          code === 'deadline-exceeded'
        ) {
          console.warn('vtoTryon callable timeout — awaiting Firestore update');
          return;
        }
        const msg = err?.message || 'Errore durante la generazione.';
        console.error('vtoTryon callable error:', msg);
        // Solo se lo snapshot non ha già gestito lo stato
        if (vtoUnsubRef.current) {
          alert(msg);
          vtoUnsubRef.current?.();
          vtoUnsubRef.current = null;
          setIsVtoProcessing(false);
          setVtoPhase('idle');
        }
      });
      // Restiamo in attesa del listener onSnapshot che guida la UI.
    } catch (error) {
      console.error("VTO Process Error:", error);
      alert("Errore di connessione al camerino.");
      vtoUnsubRef.current?.();
      vtoUnsubRef.current = null;
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

  const displayVariants: ProductVariant[] = displayProduct.variants && displayProduct.variants.length > 0
    ? displayProduct.variants
    : (displayProduct.sizes || ['One Size']).map((s, i) => ({ id: `legacy-${i}`, size: s, stock: 1, reserved: 0 }));

  const selectedVariant = displayVariants.find(v => v.id === selectedVariantId);
  const isSoldOut = displayProduct.status === 'sold_out' || (selectedVariant ? selectedVariant.stock - (selectedVariant.reserved ?? 0) <= 0 : false);

  const displayName = getProductText(displayProduct, i18n.language, 'name') || displayProduct.name;
  const displayDescription = getProductText(displayProduct, i18n.language, 'description') || displayProduct.description;
  const displayDetails = getProductText(displayProduct, i18n.language, 'detailsAndCare') || displayProduct.detailsAndCare || '';
  const displayShipping = getProductText(displayProduct, i18n.language, 'shippingAndReturns') || displayProduct.shippingAndReturns || '';

  const detailsAndCareItems = (displayDetails)
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
  const shippingAndReturnsText = displayShipping;
  const myTryOnsForProduct = myTryOns.filter((item) => item.productId === displayProduct.id);
  const featuredTryOns = myTryOnsForProduct.length > 0 ? myTryOnsForProduct : myTryOns;

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
            <h1 className="text-3xl md:text-4xl font-serif mb-4">{displayName}</h1>
            <p className="text-xl mb-4">€{(selectedVariant?.priceOverride ? selectedVariant.priceOverride / 100 : displayProduct.price).toFixed(2)}</p>
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
              {displayDescription}
            </p>
          </div>

          <VariantSelector
            variants={displayVariants}
            selectedId={selectedVariantId}
            onChange={setSelectedVariantId}
            isOneOfAKind={displayProduct.isOneOfAKind}
          />

          {/* Add to Cart & VTO */}
          <div className="space-y-3 mb-8">
            <button
              disabled={isSoldOut || isAddingToCart}
              onClick={async () => {
                if (isSoldOut || !selectedVariant) return;
                const priceSnapshot = selectedVariant.priceOverride
                  ?? displayProduct.basePrice
                  ?? Math.round(displayProduct.price * 100);

                setIsAddingToCart(true);
                try {
                  await addItem({
                    productId: displayProduct.id,
                    variantId: selectedVariant.id,
                    qty: 1,
                    priceSnapshot,
                    nameSnapshot: displayName,
                    imageSnapshot: heroImage || '',
                    ...(selectedVariant.size ? { sizeLabel: selectedVariant.size } : {}),
                    ...(selectedVariant.color ? { colorLabel: selectedVariant.color } : {}),
                  });
                  setAddedToCart(true);
                  window.setTimeout(() => setAddedToCart(false), 1600);
                } catch (error) {
                  console.error('Add to cart error:', error);
                  alert(t('cart.addError'));
                } finally {
                  setIsAddingToCart(false);
                }
              }}
              className="w-full bg-brand-black text-white py-4 uppercase tracking-widest text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSoldOut ? t('product.soldOut') : addedToCart ? t('cart.added') : isAddingToCart ? t('common.loading') : t('product.addToCart')}
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

            {user && (
              <button 
                onClick={() => {
                  if (displayProduct) {
                    toggleFavorite({
                      id: displayProduct.id || id || '1',
                      name: displayProduct.name,
                      price: typeof displayProduct.price === 'number' ? displayProduct.price : Number(displayProduct.price),
                      images: Array.isArray(displayProduct.images) ? displayProduct.images : [displayProduct.image || '']
                    } as any);
                  }
                }}
                className={`w-full py-4 uppercase tracking-widest text-sm font-medium transition-all flex items-center justify-center space-x-2 border border-gray-100 ${
                  isFavorite(displayProduct.id) 
                    ? 'bg-red-50 text-red-500 border-red-100' 
                    : 'bg-white text-gray-400 hover:text-red-500 hover:border-red-100'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite(displayProduct.id) ? 'fill-red-500' : ''}`} />
                <span>{isFavorite(displayProduct.id) ? t('favorites.remove') : t('nav.favorites')}</span>
              </button>
            )}
          </div>

          {user && (
            <section className="mb-10 border-t border-gray-200 pt-8">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gray-500">Virtual Dressing Room</p>
                    <h2 className="text-2xl font-serif">I miei try-on</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    {featuredTryOns.length > 0 && (
                      <span className="text-[10px] uppercase tracking-[0.25em] text-gray-500">
                        {myTryOnsForProduct.length > 0 ? 'Su questo prodotto' : 'Ultimi salvati'}
                      </span>
                    )}
                    <Link
                      to="/my-try-ons"
                      className="text-[10px] uppercase tracking-[0.24em] text-gray-500 transition-colors hover:text-brand-black"
                    >
                      Vedi tutto
                    </Link>
                  </div>
              </div>

              {isMyTryOnsLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse space-y-2">
                      <div className="aspect-[3/4] bg-gray-100" />
                      <div className="h-3 w-3/4 bg-gray-100" />
                      <div className="h-2 w-1/2 bg-gray-100" />
                    </div>
                  ))}
                </div>
              ) : featuredTryOns.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {featuredTryOns.slice(0, 6).map((item) => {
                    const isCurrentProduct = item.productId === displayProduct.id;
                    return (
                      <article key={item.id} className="group">
                        <button
                          type="button"
                          onClick={() => setLightboxImage(item.imageUrl || null)}
                          className="relative block aspect-[3/4] w-full overflow-hidden bg-gray-100"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.productName || 'Try-on AI'}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-90" />
                          <div className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">
                              {isCurrentProduct ? 'Questo look' : 'Archivio'}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em]">
                              {item.productName || 'Virtual try-on'}
                            </p>
                          </div>
                        </button>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setVtoResultImage(item.imageUrl || null);
                              setVtoPreviewImage(null);
                              setVtoFile(null);
                              setVtoConsent(true);
                              setIsVtoModalOpen(true);
                            }}
                            className="text-[10px] uppercase tracking-[0.22em] text-gray-500 transition-colors hover:text-brand-black"
                          >
                            Apri
                          </button>
                          {!isCurrentProduct && item.productId && (
                            <Link
                              to={`/product/${item.productId}`}
                              className="text-[10px] uppercase tracking-[0.22em] text-gray-500 transition-colors hover:text-brand-black"
                            >
                              Vai al capo
                            </Link>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-gray-200 bg-gray-50 px-5 py-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gray-500">Empty gallery</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    Nessun try-on salvato ancora. Genera la tua prima prova virtuale e comparir&agrave; qui.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Accordions */}
          <div className="border-t border-gray-200">
            {/* Details */}
            <div className="border-b border-gray-200">
              <button 
                onClick={() => toggleAccordion('details')}
                className="w-full py-4 flex justify-between items-center text-sm uppercase tracking-wider font-medium"
              >
                {t('product.details')}
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
                {t('product.shipping')}
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

      {/* Product Story */}
      {displayProduct.story && <ProductStory story={displayProduct.story} />}

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
