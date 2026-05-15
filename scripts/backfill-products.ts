import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// To run this:
// 1. Download service account key from Firebase Console -> Project Settings -> Service Accounts
// 2. Save it as serviceAccountKey.json in the project root
// 3. npx ts-node scripts/backfill-products.ts

const serviceAccountPath = './serviceAccountKey.json';

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: Missing ${serviceAccountPath}. Please download it from Firebase Console.`);
  process.exit(1);
}

const serviceAccount = require('.' + serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function backfill() {
  console.log('Starting backfill...');
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  let count = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Check if already backfilled
    if (data.status && data.variants && data.translations) {
      console.log(`Skipping ${doc.id} (already migrated)`);
      continue;
    }
    
    const basePrice = Math.round((data.price || 0) * 100);
    const legacySizes = data.sizes || ['One Size'];
    
    const variants = legacySizes.map((size: string, index: number) => ({
      id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
      size: size,
      stock: 1,
      reserved: 0
    }));

    const updateData = {
      status: 'active',
      isOneOfAKind: true,
      basePrice: basePrice,
      variants: variants,
      translations: {
        it: {
          name: data.name || '',
          description: data.description || '',
          detailsAndCare: data.detailsAndCare || '',
          shippingAndReturns: data.shippingAndReturns || ''
        },
        en: {
          name: data.name || '',
          description: data.description || '',
          detailsAndCare: data.detailsAndCare || '',
          shippingAndReturns: data.shippingAndReturns || ''
        }
      },
      updatedAt: new Date()
    };
    
    await doc.ref.update(updateData);
    console.log(`Updated ${doc.id} (${data.name})`);
    count++;
  }
  
  console.log(`Backfill completed! Migrated ${count} products.`);
}

backfill().catch(console.error);
