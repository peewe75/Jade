import re

with open('src/pages/Inventory.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
content = content.replace("import { motion } from 'motion/react';", "import { motion } from 'motion/react';\nimport { uploadImageToStorage } from '../lib/storage';")

# 2. Add new states
state_injection = """  // Category Form state
  const [newCategory, setNewCategory] = useState('');"""

new_states = """  // New E-commerce states
  const [status, setStatus] = useState('active');
  const [isOneOfAKind, setIsOneOfAKind] = useState(false);
  const [variants, setVariants] = useState<{size: string, stock: number}[]>([]);
  
  const [nameIt, setNameIt] = useState('');
  const [descIt, setDescIt] = useState('');
  const [detailsIt, setDetailsIt] = useState('');
  const [shippingIt, setShippingIt] = useState('');

  const [nameEn, setNameEn] = useState('');
  const [descEn, setDescEn] = useState('');
  const [detailsEn, setDetailsEn] = useState('');
  const [shippingEn, setShippingEn] = useState('');

  // Category Form state
  const [newCategory, setNewCategory] = useState('');"""
content = content.replace(state_injection, new_states)

# 3. fileToDataUrl -> fileToBlob
file_to_data_url_old = """  const fileToDataUrl = (file: File) => {
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
  };"""

file_to_blob_new = """  const fileToBlob = (file: File): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
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
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) resolve(blob);
          else reject(new Error('Canvas to Blob failed'));
        }, mimeType, mimeType === 'image/jpeg' ? 0.85 : undefined);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to load image.'));
      };

      image.src = objectUrl;
    });
  };"""
content = content.replace(file_to_data_url_old, file_to_blob_new)

# 4. handleFileUpload
upload_old = """    setIsUploading(true);
    try {
      const optimizedDataUrl = await fileToDataUrl(file);
      updateProductImage(slotIndex, optimizedDataUrl);
    } catch (error) {"""

upload_new = """    setIsUploading(true);
    try {
      const blob = await fileToBlob(file);
      const path = `products/${Date.now()}_${file.name}`;
      const downloadUrl = await uploadImageToStorage(new File([blob], file.name, { type: blob.type }), path);
      updateProductImage(slotIndex, downloadUrl);
    } catch (error) {"""
content = content.replace(upload_old, upload_new)

# 5. resetProductForm
reset_old = """    setShippingAndReturns('');
    setSelectedSizes([]);"""
reset_new = """    setShippingAndReturns('');
    setSelectedSizes([]);
    setStatus('active');
    setIsOneOfAKind(false);
    setVariants([]);
    setNameIt(''); setDescIt(''); setDetailsIt(''); setShippingIt('');
    setNameEn(''); setDescEn(''); setDetailsEn(''); setShippingEn('');"""
content = content.replace(reset_old, reset_new)

# 6. handleAddProduct data
add_old = """      const productData = {
        name,
        price: parseFloat(price),
        category,
        images: images.slice(0, 4),
        description: description || 'Luxury fashion piece by The Blondes Brand.',
        detailsAndCare: detailsAndCare || '',
        shippingAndReturns: shippingAndReturns || '',
        tags: editingProduct ? (editingProduct.tags || ['New In']) : ['New In'],
        sizes: selectedSizes.length > 0 ? selectedSizes : ['One Size'],
        featured: Boolean(featured),
        ...(featured
          ? { featuredOrder: order ?? Date.now() }
          : { featuredOrder: null }),
        updatedAt: serverTimestamp(),
      };"""

add_new = """      const basePrice = Math.round(parseFloat(price) * 100);
      const activeVariants = variants.length > 0 ? variants : selectedSizes.map(s => ({ size: s, stock: 10 }));
      if (activeVariants.length === 0) activeVariants.push({ size: 'One Size', stock: 10 });
      
      const productData = {
        name: nameIt || name,
        price: parseFloat(price),
        category,
        images: images.slice(0, 4),
        description: descIt || description || 'Luxury fashion piece by The Blondes Concept.',
        detailsAndCare: detailsIt || detailsAndCare || '',
        shippingAndReturns: shippingIt || shippingAndReturns || '',
        tags: editingProduct ? (editingProduct.tags || ['New In']) : ['New In'],
        sizes: activeVariants.map(v => v.size),
        featured: Boolean(featured),
        ...(featured
          ? { featuredOrder: order ?? Date.now() }
          : { featuredOrder: null }),
          
        status,
        isOneOfAKind,
        basePrice,
        variants: activeVariants.map((v, i) => {
          // Keep existing variant ID if editing
          const existingVariant = editingProduct?.variants?.find((ev: any) => ev.size === v.size);
          return {
            id: existingVariant?.id || `var-${Date.now()}-${i}`,
            size: v.size,
            stock: Number(v.stock),
            reserved: existingVariant?.reserved || 0
          };
        }),
        translations: {
          it: {
            name: nameIt || name,
            description: descIt || description,
            detailsAndCare: detailsIt || detailsAndCare,
            shippingAndReturns: shippingIt || shippingAndReturns
          },
          en: {
            name: nameEn,
            description: descEn,
            detailsAndCare: detailsEn,
            shippingAndReturns: shippingEn
          }
        },
        updatedAt: serverTimestamp(),
      };"""
content = content.replace(add_old, add_new)

# 7. handleEdit
edit_old = """    setSelectedSizes(product.sizes || []);
    setFeatured(product.featured || false);
    setOrder(product.featuredOrder ?? null);"""
edit_new = """    setSelectedSizes(product.sizes || []);
    setFeatured(product.featured || false);
    setOrder(product.featuredOrder ?? null);
    
    setStatus(product.status || 'active');
    setIsOneOfAKind(product.isOneOfAKind || false);
    setVariants(product.variants ? product.variants.map((v: any) => ({ size: v.size, stock: v.stock })) : (product.sizes || []).map((s: string) => ({ size: s, stock: 10 })));
    
    if (product.translations) {
      setNameIt(product.translations.it?.name || product.name || '');
      setDescIt(product.translations.it?.description || product.description || '');
      setDetailsIt(product.translations.it?.detailsAndCare || product.detailsAndCare || '');
      setShippingIt(product.translations.it?.shippingAndReturns || product.shippingAndReturns || '');
      
      setNameEn(product.translations.en?.name || '');
      setDescEn(product.translations.en?.description || '');
      setDetailsEn(product.translations.en?.detailsAndCare || '');
      setShippingEn(product.translations.en?.shippingAndReturns || '');
    } else {
      setNameIt(product.name || '');
      setDescIt(product.description || '');
      setDetailsIt(product.detailsAndCare || '');
      setShippingIt(product.shippingAndReturns || '');
    }
"""
content = content.replace(edit_old, edit_new)

# 8. Add variant management UI
variant_ui = """              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2">Varianti & Stock</label>
                <div className="flex flex-col gap-2">
                  {variants.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={v.size} onChange={e => {
                        const newV = [...variants];
                        newV[i].size = e.target.value;
                        setVariants(newV);
                      }} className="border p-2 text-sm bg-white">
                        {AVAILABLE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input type="number" value={v.stock} onChange={e => {
                        const newV = [...variants];
                        newV[i].stock = parseInt(e.target.value) || 0;
                        setVariants(newV);
                      }} placeholder="Stock" className="border p-2 w-24 text-sm" />
                      <button type="button" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">Rimuovi</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setVariants([...variants, { size: 'One Size', stock: 10 }])} className="text-xs uppercase tracking-widest border border-gray-300 py-2 mt-1 hover:bg-gray-50 text-center">
                    + Aggiungi Variante
                  </button>
                </div>
              </div>"""

# Replace old sizes UI with variants
sizes_old = """              <div>
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
              </div>"""
content = content.replace(sizes_old, variant_ui)

# 9. Replace old Name/Description with translations
form_old = """              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Prezzo (€)</label>
                <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Categoria</label>"""

form_new = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome (IT)</label>
                  <input type="text" value={nameIt} onChange={e => { setNameIt(e.target.value); setName(e.target.value); }} required className="w-full border border-gray-300 p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome (EN)</label>
                  <input type="text" value={nameEn} onChange={e => setNameEn(e.target.value)} className="w-full border border-gray-300 p-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Prezzo (€)</label>
                  <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className="w-full border border-gray-300 p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border border-gray-300 p-2 text-sm bg-white">
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Categoria</label>"""
content = content.replace(form_old, form_new)

desc_old = """              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Descrizione</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Details &amp; Care</label>
                <textarea
                  value={detailsAndCare}
                  onChange={e => setDetailsAndCare(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 p-2 text-sm"
                  placeholder={"Una riga per punto, ad esempio:\\n95% Silk, 5% Elastane\\nDry clean only\\nMade in Italy"}
                ></textarea>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-400">Una riga = un bullet nella pagina prodotto</p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Shipping &amp; Returns</label>
                <textarea
                  value={shippingAndReturns}
                  onChange={e => setShippingAndReturns(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 p-2 text-sm"
                  placeholder="Testo libero per spedizioni, resi e condizioni."
                ></textarea>
              </div>"""

desc_new = """              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Descrizione (IT)</label>
                  <textarea value={descIt} onChange={e => { setDescIt(e.target.value); setDescription(e.target.value); }} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Descrizione (EN)</label>
                  <textarea value={descEn} onChange={e => setDescEn(e.target.value)} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Details &amp; Care (IT)</label>
                  <textarea value={detailsIt} onChange={e => { setDetailsIt(e.target.value); setDetailsAndCare(e.target.value); }} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Details &amp; Care (EN)</label>
                  <textarea value={detailsEn} onChange={e => setDetailsEn(e.target.value)} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Shipping (IT)</label>
                  <textarea value={shippingIt} onChange={e => { setShippingIt(e.target.value); setShippingAndReturns(e.target.value); }} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Shipping (EN)</label>
                  <textarea value={shippingEn} onChange={e => setShippingEn(e.target.value)} rows={3} className="w-full border border-gray-300 p-2 text-sm"></textarea>
                </div>
              </div>
              
              <div className="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="oneOfAKind"
                  checked={isOneOfAKind}
                  onChange={(e) => setIsOneOfAKind(e.target.checked)}
                  className="w-4 h-4 mr-2"
                />
                <label htmlFor="oneOfAKind" className="text-sm">Pezzo unico (One of a kind)</label>
              </div>"""
content = content.replace(desc_old, desc_new)

with open('src/pages/Inventory.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
