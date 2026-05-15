let admin;
try {
  admin = require('firebase-admin');
} catch {
  admin = require('../functions/node_modules/firebase-admin');
}

admin.initializeApp({
  projectId: 'sito-web-28a07',
});

const db = admin.firestore();

async function main() {
  await db.collection('config').doc('orderCounter').set(
    { count: 0 },
    { merge: true }
  );

  await db.collection('config').doc('bankDetails').set(
    {
      beneficiary: 'The Blondes Concept',
      iban: 'IT00X0000000000000000000000',
      bic: 'XXXXXXXX',
      bank: 'Banca Esempio',
    },
    { merge: true }
  );

  console.log('Seeded Firestore config documents for sito-web-28a07.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Failed to seed Firestore config documents:', error);
  process.exit(1);
});
