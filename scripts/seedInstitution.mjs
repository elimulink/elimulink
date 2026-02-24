// scripts/seedInstitution.mjs
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import process from 'process';

// Only run in dev
if (process.env.NODE_ENV === 'production') {
  throw new Error('Do not run seed in production!');
}

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

const institutionId = 'demo-uni';
const departments = [
  { id: 'guidance', name: 'Guidance' },
  { id: 'sports', name: 'Sports' },
  { id: 'research', name: 'Research' },
  { id: 'dean', name: 'Dean of Students' },
];

async function seed() {
  const instRef = db.collection('institutions').doc(institutionId);
  await instRef.set({ name: 'Demo University', createdAt: FieldValue.serverTimestamp() }, { merge: true });

  for (const dept of departments) {
    await instRef.collection('departments').doc(dept.id).set({
      ...dept,
      createdAt: FieldValue.serverTimestamp(),
      active: true,
    }, { merge: true });
  }
  console.log('Seeded demo institution and departments.');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
