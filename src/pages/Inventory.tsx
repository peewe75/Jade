import { useState, useEffect, useRef, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'motion/react';
import { Trash2, Plus, RefreshCw, Upload, Image as ImageIcon, Edit2, X, Check, Search, Home, Users, LayoutGrid } from 'lucide-react';

const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const ADMIN_EMAILS = ['mmalinverno76@gmail.com', 'peewe75@gmail.com', 'mmalinverno@gmail.com', 'avv.sapone@hotmail.it'];

export default function Inventory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('All');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [productImages, setProductImages] = useState<string[]>(['', '', '', '']);
  const [description, setDescription] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  
  // Category Form state
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  
  // Product Edit state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState<number | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  
  const isAdminUser = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && !isAdminUser) {
      navigate('/');
    }
  }, [authLoading, isAdminUser, navigate, user]);

  const fetchData = async () => {
    if (!isAdminUser) return;
    setLoading(true);
    try {
      // Fetch Products
      const prodSnapshot = await getDocs(collection(db, 'products'));
      const prods = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);

      // Fetch Categories
      const catSnapshot = await getDocs(collection(db, 'categories'));
      const cats = catSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setCategories(cats);
      
      if (cats.length > 0 && !category) {
        setCategory(cats[0].name);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdminUser) {
      fetchData();
    }
  }, [user, isAdminUser]);

  const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Unable to process image.'));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.85 : undefined);
        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to load image.'));
      };

      image.src = objectUrl;
    });
  };

  const updateProductImage = (slotIndex: number, value: string) => {
    setProductImages(previousImages => previousImages.map((image, index) => (index === slotIndex ? value : image)));
  };

  const moveProductImage = (sourceIndex: number, targetIndex: number) => {
    setProductImages(previousImages => {
      if (sourceIndex === targetIndex) {
        return previousImages;
      }

      const nextImages = [...previousImages];
      const [movedImage] = nextImages.splice(sourceIndex, 1);
      nextImages.splice(targetIndex, 0, movedImage);
      return nextImages.slice(0, 4);
    });
  };

  const resetProductForm = () => {
    setName('');
    setPrice('');
    setCategory('');
    setProductImages(['', '', '', '']);
    setDescription('');
    setSelectedSizes([]);
    setFeatured(false);
    setOrder(null);
    setEditingProduct(null);
    setDraggedImageIndex(null);
  };

  // --- Category Management ---
  const handleAddCategory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdminUser) return;
    if (!newCategory.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategory.trim(),
        createdAt: serverTimestamp()
      });
      setNewCategory('');
      fetchData();
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!isAdminUser) return;
    if (window.confirm('Sei sicuro di voler eliminare questa categoria?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        fetchData();
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const startEditCategory = (cat: {id: string, name: string}) => {
    setEditingCategory(cat.id);
    setEditCategoryName(cat.name);
  };

  const saveEditCategory = async () => {
    if (!isAdminUser) return;
    if (!editingCategory || !editCategoryName.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', editingCategory), {
        name: editCategoryName.trim()
      });
      setEditingCategory(null);
      setEditCategoryName('');
      fetchData();
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  // --- Product Management ---
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const optimizedDataUrl = await fileToDataUrl(file);
      updateProductImage(slotIndex, optimizedDataUrl);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Errore durante il caricamento dell'immagine.");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleImageDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleImageDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleImageDrop = (event: DragEvent<HTMLLabelElement>, targetIndex: number) => {
    event.preventDefault();
    if (draggedImageIndex === null) return;
    moveProductImage(draggedImageIndex, targetIndex);
    setDraggedImageIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleAddProduct = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdminUser) {
      alert("Devi essere loggato con un account amministratore.");
      return;
    }
    const images = productImages.filter((image): image is string => Boolean(image));
    if (!name || !price || images.length === 0 || !category) {
      alert("Compila i campi obbligatori: nome, prezzo, categoria e almeno la copertina.");
      return;
    }

    try {
      const productData = {
        name,
        price: parseFloat(price),
        category,
        images: images.slice(0, 4),
        description: description || 'Luxury fashion piece by The Blondes Brand.',
        tags: editingProduct ? (editingProduct.tags || ['New In']) : ['New In'],
        sizes: selectedSizes.length > 0 ? selectedSizes : ['One Size'],
        featured: Boolean(featured),
        ...(featured
          ? { featuredOrder: order ?? Date.now() }
          : { featuredOrder: null }),
        updatedAt: serverTimestamp(),
      };

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        // Add new product
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
      }
      
      // Reset form
      resetProductForm();
      
      fetchData();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Errore durante il salvataggio del prodotto. Assicurati di essere loggato con l'email amministratore.");
    }
  };

  const handleEdit = (product: any) => {
    if (!isAdminUser) return;
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCategory(product.category);
    const nextImages = Array.isArray(product.images) ? product.images.slice(0, 4) : [];
    while (nextImages.length < 4) {
      nextImages.push('');
    }
    setProductImages(nextImages);
    setDescription(product.description || '');
    setSelectedSizes(product.sizes || []);
    setFeatured(product.featured || false);
    setOrder(product.featuredOrder ?? null);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    resetProductForm();
  };

  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!isAdminUser) return;
    setProductToDelete(id);
  };

  const confirmDelete = async () => {
    if (!isAdminUser) return;
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete));
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
    } finally {
      setProductToDelete(null);
    }
  };

  const cancelDelete = () => {
    setProductToDelete(null);
  };

  const seedDatabase = async () => {
    if (!isAdminUser) return;
    setIsSeeding(true);
    
    // Default categories
    const defaultCategories = ['Dresses', 'Tops', 'Bottoms', 'Accessories'];
    
    try {
      // Seed categories if empty
      if (categories.length === 0) {
        for (const cat of defaultCategories) {
          await addDoc(collection(db, 'categories'), {
            name: cat,
            createdAt: serverTimestamp()
          });
        }
      }

      const sampleProducts = [
        {
          name: "The Miami Slip Dress",
          price: 129.00,
          category: "Dresses",
          description: "The perfect slip dress that takes you from a sunset aperitivo on Lago di Garda to a glamorous night out in Miami.",
          images: ["https://picsum.photos/seed/miamidress/800/1067"],
          tags: ["Trending"],
          sizes: ["XS", "S", "M", "L"]
        },
        {
          name: "Garda Linen Blazer",
          price: 189.00,
          category: "Tops",
          description: "Elegant linen blazer perfect for the Italian summer.",
          images: ["https://picsum.photos/seed/gardablazer/800/1067"],
          tags: ["Classic"],
          sizes: ["S", "M", "L", "XL"]
        },
        {
          name: "Rodeo Drive Top",
          price: 89.00,
          category: "Tops",
          description: "Chic and minimal top inspired by Rodeo Drive.",
          images: ["https://picsum.photos/seed/rodeotop/800/1067"],
          tags: ["New In"],
          sizes: ["XS", "S", "M"]
        },
        {
          name: "Colline Avenue Trousers",
          price: 149.00,
          category: "Bottoms",
          description: "Tailored trousers for a sophisticated look.",
          images: ["https://picsum.photos/seed/collinetrousers/800/1067"],
          tags: ["Essential"],
          sizes: ["S", "M", "L"]
        },
        {
          name: "Winter Glamour Coat",
          price: 299.00,
          category: "Accessories",
          description: "Stay warm and glamorous during the winter season.",
          images: ["https://picsum.photos/seed/wintercoat/800/1067"],
          tags: ["Winter"],
          sizes: ["One Size"]
        }
      ];

      for (const product of sampleProducts) {
        await addDoc(collection(db, 'products'), {
          ...product,
          createdAt: serverTimestamp()
        });
      }
      fetchData();
    } catch (error) {
      console.error("Error seeding database:", error);
      alert("Errore durante il popolamento. Assicurati di essere loggato con l'email amministratore.");
    } finally {
      setIsSeeding(false);
    }
  };

  if (authLoading) return <div className="pt-32 text-center">Loading...</div>;
  if (!user) return null;
  if (!isAdminUser) {
    return (
      <main className="flex-grow pt-32 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto w-full">
        <div className="bg-white border border-gray-200 p-8 text-center">
          <h1 className="text-3xl font-serif mb-3">Accesso non autorizzato</h1>
          <p className="text-gray-600">
            Questa dashboard è riservata agli account amministratore.
          </p>
        </div>
      </main>
    );
  }

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = searchCategory === 'All' || product.category === searchCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="flex-grow pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="mb-12 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-serif mb-2">Magazzino</h1>
          <p className="text-gray-500 text-sm">Gestisci i prodotti, le categorie e le immagini del catalogo.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/admin" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
              <Home className="w-4 h-4" />
              Dashboard
            </a>
            <a href="/admin/crm" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
              <Users className="w-4 h-4" />
              CRM
            </a>
            <a href="#products" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Prodotti
            </a>
            <a href="#categories" className="border border-gray-200 px-4 py-2 text-xs uppercase tracking-widest hover:border-brand-black transition-colors flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Categorie
            </a>
          </div>
        </div>
        
        {/* Search & Filter */}
        <div className="flex-1 max-w-xl flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cerca prodotto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 text-sm focus:outline-none focus:border-brand-black"
            />
          </div>
          <select 
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:border-brand-black bg-white"
          >
            <option value="All">Tutte le categorie</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={seedDatabase}
          disabled={isSeeding}
          className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-brand-black px-4 py-2 text-xs uppercase tracking-widest font-medium transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>Popola Database</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Forms */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Manage Categories Form */}
          <div id="categories" className="bg-gray-50 p-6 border border-gray-100 scroll-mt-32">
            <h2 className="text-lg font-serif mb-6">Gestione Categorie</h2>
            
            {/* List Categories */}
            <ul className="space-y-2 mb-6">
              {categories.map(cat => (
                <li key={cat.id} className="flex items-center justify-between bg-white border border-gray-200 p-2 text-sm">
                  {editingCategory === cat.id ? (
                    <div className="flex items-center w-full space-x-2">
                      <input 
                        type="text" 
                        value={editCategoryName} 
                        onChange={e => setEditCategoryName(e.target.value)}
                        className="flex-1 border border-gray-300 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <button onClick={saveEditCategory} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <span>{cat.name}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => startEditCategory(cat)} className="text-gray-400 hover:text-brand-black"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </>
                  )}
                </li>
              ))}
              {categories.length === 0 && <p className="text-xs text-gray-500">Nessuna categoria. Aggiungine una.</p>}
            </ul>

            {/* Add Category */}
            <form onSubmit={handleAddCategory} className="flex space-x-2">
              <input 
                type="text" 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)} 
                placeholder="Nuova categoria..."
                className="flex-1 border border-gray-300 p-2 text-sm" 
              />
              <button type="submit" className="bg-brand-black text-white px-3 hover:bg-gray-900 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Add/Edit Product Form */}
          <div id="products" className="bg-gray-50 p-6 border border-gray-100 scroll-mt-32">
            <h2 className="text-lg font-serif mb-6">{editingProduct ? 'Modifica Prodotto' : 'Aggiungi Prodotto'}</h2>
            
            {editingProduct && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 text-sm">
                ⚠️ Stai modificando: <strong>{editingProduct.name}</strong>
              </div>
            )}

            <div className="mb-4 p-4 bg-yellow-100 border-4 border-yellow-500 rounded-lg">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-6 h-6 mr-3"
                />
                <label htmlFor="featured" className="text-base font-bold">MOSTRA IN HOME PAGE</label>
              </div>
              {featured && (
                <div className="mt-3 ml-9">
                  <input 
                    type="number" 
                    value={order ?? ''} 
                    onChange={(e) => setOrder(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border-2 border-yellow-400 p-2"
                    placeholder="Numero ordine (1 = primo)"
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Prezzo (€)</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Categoria</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm bg-white">
                  <option value="" disabled>Seleziona una categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
                {categories.length === 0 && <p className="text-xs text-red-500 mt-1">Aggiungi prima una categoria sopra.</p>}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Taglie Disponibili</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-1 text-xs border transition-colors ${
                        selectedSizes.includes(size) 
                          ? 'bg-brand-black text-white border-brand-black' 
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Foto Prodotto</label>
                <p className="text-xs text-gray-400 mb-4">Carica fino a 4 foto: la prima è la copertina, le altre compaiono solo nel dettaglio prodotto.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productImages.map((image, index) => (
                    <div key={index} className="border border-dashed border-gray-300 bg-white p-3">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase tracking-widest text-gray-500">
                          {index === 0 ? 'Copertina' : `Foto ${index + 1}`}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400">
                          {index === 0 ? 'Obbligatoria' : 'Facoltativa'}
                        </span>
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`image-upload-${index}`}
                        onChange={(event) => handleFileUpload(event, index)}
                      />

                      <label
                        htmlFor={`image-upload-${index}`}
                        draggable={Boolean(image)}
                        onDragStart={() => handleImageDragStart(index)}
                        onDragOver={handleImageDragOver}
                        onDrop={(event) => handleImageDrop(event, index)}
                        onDragEnd={handleImageDragEnd}
                        className={`flex items-center justify-center w-full aspect-[3/4] cursor-pointer transition-colors ${
                          draggedImageIndex === index ? 'opacity-50' : ''
                        } ${
                          image ? 'bg-gray-50 border border-gray-200' : 'border-2 border-dashed border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Caricamento...</span>
                          </div>
                        ) : image ? (
                          <div className="relative w-full h-full">
                            <img src={image} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                updateProductImage(index, '');
                              }}
                              className="absolute top-2 right-2 bg-black/70 text-white text-[10px] uppercase tracking-widest px-2 py-1"
                            >
                              Rimuovi
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center space-y-2 text-gray-500">
                            <Upload className="w-5 h-5" />
                            <span className="text-sm">Carica foto</span>
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Descrizione</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
              </div>

              <hr className="border-gray-200 my-4" />

              <button type="submit" disabled={isUploading || categories.length === 0} className="w-full bg-brand-black text-white py-3 text-xs uppercase tracking-widest font-medium hover:bg-gray-900 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50">
                {editingProduct ? <RefreshCw className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{editingProduct ? 'Salva Modifiche' : 'Aggiungi Prodotto'}</span>
              </button>

              {editingProduct && (
                <button 
                  type="button" 
                  onClick={cancelEdit}
                  className="w-full bg-white text-gray-500 py-3 text-xs uppercase tracking-widest font-medium border border-gray-200 hover:text-brand-black hover:border-brand-black transition-colors"
                >
                  Annulla Modifica
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Product List */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-serif mb-6">Prodotti Attuali ({filteredProducts.length})</h2>
          
          {loading ? (
            <p className="text-gray-500 text-sm">Caricamento dati...</p>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-100">
              <p className="text-gray-500 text-sm mb-4">Nessun prodotto trovato.</p>
              {products.length === 0 && (
                <p className="text-xs text-gray-400">Usa il bottone "Popola Database" in alto per inserire dei prodotti di prova.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex space-x-4 border border-gray-100 p-4 relative group">
                  <div className="w-20 h-24 bg-gray-100 shrink-0">
                    {product.images && product.images[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{product.category}</p>
                    <h3 className="text-sm font-medium mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">€{product.price}</p>
                    {product.featured && (
                      <span className="inline-block text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mr-2">
                        In evidenza #{product.featuredOrder || '?'}
                      </span>
                    )}
                    {product.sizes && (
                      <div className="flex flex-wrap gap-1">
                        {product.sizes.map((size: string) => (
                          <span key={size} className="text-[10px] border border-gray-200 px-1.5 py-0.5 text-gray-500">
                            {size}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleEdit(product)}
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 border border-blue-200"
                    >
                      Modifica
                    </button>
                    <button 
                      onClick={() => handleDelete(product.id)}
                      className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 border border-red-200"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-sm w-full">
            <h3 className="text-lg font-serif mb-2">Conferma Eliminazione</h3>
            <p className="text-sm text-gray-500 mb-6">Sei sicuro di voler eliminare questo prodotto? Questa azione non può essere annullata.</p>
            <div className="flex justify-end space-x-4">
              <button 
                onClick={cancelDelete}
                className="px-4 py-2 text-sm uppercase tracking-widest font-medium text-gray-500 hover:text-brand-black transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm uppercase tracking-widest font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
