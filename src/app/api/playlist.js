// pages/api/playlist.js (Vercel/Next.js)
// Assumes you have a manifest in DB or a JSON file mapping playlist order -> storageKey
import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEYFILE // use secret in Vercel
});
const BUCKET = process.env.GCS_BUCKET;

// Example: load manifest file (produced by sync job)
import manifest from '../../playlist-manifest.json'; // or read from DB

export default async function handler(req, res) {
  try {
    const items = await Promise.all((manifest.items || []).map(async (it) => {
      const file = storage.bucket(BUCKET).file(it.storageKey); // storageKey produced by sync job
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 12 // 12 hours
      });
      return { title: it.title || null, url, filename: it.storageKey, original: it.file };
    }));
    res.status(200).json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'playlist error' });
  }
}
