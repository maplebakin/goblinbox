const DB_NAME = 'goblinbox';
const STORE_NAME = 'images';

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = action(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

export async function saveHoardInner(cards) {
  const metadata = [];
  for (const card of cards) {
    const { image, ...fields } = card;
    if (image) {
      const blob = image instanceof Blob ? image : await dataUrlToBlob(image);
      await withStore('readwrite', (store) => store.put(blob, String(card.id)));
    } else {
      await withStore('readwrite', (store) => store.delete(String(card.id)));
    }
    metadata.push(fields);
  }
  localStorage.setItem('goblinHoard', JSON.stringify(metadata));
}

// Serialize saves: every saveHoard call waits for the previous one to finish
// before it starts. Without this, rapid successive updates (e.g. adding
// several large images in a row) interleave their async IndexedDB writes and
// the *earlier*, smaller save can land its localStorage write last —
// silently dropping cards. The queue guarantees the final write always
// reflects the latest state.
let saveQueue = Promise.resolve();

export function saveHoard(cards) {
  const run = saveQueue.then(() => saveHoardInner(cards));
  saveQueue = run.catch(() => {});
  return run;
}

export async function loadHoard() {
  const saved = JSON.parse(localStorage.getItem('goblinHoard') || '[]');
  const migrated = saved.some((card) => typeof card.image === 'string' && card.image.startsWith('data:'));
  const cards = [];
  for (const card of saved) {
    let blob = card.image instanceof Blob ? card.image : null;
    if (typeof card.image === 'string' && card.image.startsWith('data:')) blob = await dataUrlToBlob(card.image);
    if (blob) await withStore('readwrite', (store) => store.put(blob, String(card.id)));
    const storedBlob = blob || await withStore('readonly', (store) => store.get(String(card.id)));
    const { image: _legacyImage, ...metadata } = card;
    cards.push({ ...metadata, image: storedBlob ? URL.createObjectURL(storedBlob) : undefined });
  }
  if (migrated) await saveHoard(cards);
  return cards;
}
