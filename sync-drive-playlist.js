// sync-drive-playlist.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import { google } from "googleapis";
import * as mkdirp from "mkdirp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;
const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const MANIFEST_PATH = path.join(__dirname, "manifest.json");
const DOWNLOAD_DIR = path.join(__dirname, "videos");
const MAX_BYTES = 1_000_000_000; // 1 GB

if (!DRIVE_FOLDER_ID) {
  console.error("Error: DRIVE_FOLDER_ID environment variable not set.");
  process.exit(1);
}

mkdirp.mkdirp.sync(DOWNLOAD_DIR);

function loadJSON(p, defaultVal = null) {
  if (!fs.existsSync(p)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.warn("Warning: failed to parse", p, e);
    return defaultVal;
  }
}
function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("credentials.json not found. Create OAuth credentials and save as credentials.json");
  }
  const creds = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const clientInfo = creds.installed || creds.web;
  if (!clientInfo) throw new Error("Invalid credentials.json structure.");

  const { client_id, client_secret, redirect_uris } = clientInfo;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // try load token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // get new token
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    prompt: "consent"
  });
  console.log("Authorize this app by visiting this url:\n\n", authUrl, "\n");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(resolve => rl.question("Enter the code from that page here: ", ans => { rl.close(); resolve(ans); }));
  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log("Saved token to", TOKEN_PATH);
  return oAuth2Client;
}

async function findFilesInFolder(drive, folderId) {
  const items = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, md5Checksum, modifiedTime, size)",
      pageToken,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true
    });
    pageToken = res.data.nextPageToken;
    (res.data.files || []).forEach(f => items.push(f));
  } while (pageToken);
  return items;
}

async function downloadFileToPath(drive, fileId, destPath) {
  const dest = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    drive.files.get({ fileId, alt: "media" }, { responseType: "stream" }, (err, res) => {
      if (err) return reject(err);
      res.data
        .on("end", () => resolve())
        .on("error", e => reject(e))
        .pipe(dest);
    });
  });
}

async function main() {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  // 1) Find playlist.json in the folder
  console.log("Listing files in Drive folder...");
  const files = await findFilesInFolder(drive, DRIVE_FOLDER_ID);
  const playlistFile = files.find(f => f.name === "playlist.json");
  if (!playlistFile) {
    console.warn("playlist.json not found in Drive folder. Nothing to sync.");
    return;
  }

  console.log("Downloading playlist.json...");
  const tmpPlaylistPath = path.join(__dirname, "playlist.json.tmp");
  await downloadFileToPath(drive, playlistFile.id, tmpPlaylistPath);
  const playlistRaw = fs.readFileSync(tmpPlaylistPath, "utf8");
  fs.unlinkSync(tmpPlaylistPath);

  let playlist;
  try {
    playlist = JSON.parse(playlistRaw);
  } catch (e) {
    throw new Error("Failed to parse playlist.json from Drive: " + e.message);
  }

  // Assume every item in playlist.items is to be used; playlist items look like:
  // { "file": "abakus_promo.mp4", "title": "Velkommen til Abakus!" }
  const playlistFiles = (playlist.items || []).map(it => it.file);
  console.log("Files listed in playlist.json:", playlistFiles);

  // 2) Build map of Drive files in the folder keyed by name
  const driveByName = new Map(files.map(f => [f.name, f]));

  // 3) Load manifest to detect changes
  const manifest = loadJSON(MANIFEST_PATH, { items: {} }); // items keyed by localName
  manifest.items = manifest.items || {};

  // 4) Determine which files we need locally: those listed in playlist and present in Drive
  const toKeepDriveIds = new Set();
  const downloadTasks = [];

  for (const fileName of playlistFiles) {
    const f = driveByName.get(fileName);
    if (!f) {
      console.error(`File "${fileName}" listed in playlist.json NOT found in Drive folder. Skipping.`);
      continue;
    }
    toKeepDriveIds.add(f.id);

    // check size limit
    const sizeNum = f.size ? Number(f.size) : 0;
    if (sizeNum > MAX_BYTES) {
      console.error(`File "${fileName}" exceeds max size (${sizeNum} bytes). Skipping download.`);
      continue;
    }

    // decide whether to download: if not in manifest or md5 changed or modifiedTime changed
    const existing = Object.values(manifest.items).find(it => it.driveId === f.id || it.name === f.name);
    const md5 = f.md5Checksum || null;
    let needDownload = false;
    if (!existing) needDownload = true;
    else if (md5 && existing.md5 && md5 !== existing.md5) needDownload = true;
    else if (!md5) {
      // fallback to modifiedTime comparison
      const exUpdated = existing.modifiedTime || existing.updatedAt || null;
      if (!exUpdated || exUpdated !== f.modifiedTime) needDownload = true;
    }

    if (needDownload) {
      downloadTasks.push({ driveFile: f });
    } else {
      console.log(`Skipping download (unchanged): ${f.name}`);
    }
  }

  // 5) Download needed files
  for (const task of downloadTasks) {
    const f = task.driveFile;
    const safeName = f.name.replace(/\s+/g, "_");
    const localName = `${f.id}_${safeName}`;
    const localPath = path.join(DOWNLOAD_DIR, localName);
    try {
      console.log(`Downloading ${f.name} -> ${localName} ...`);
      await downloadFileToPath(drive, f.id, localPath);
      // after download, verify size
      const stats = fs.statSync(localPath);
      if (stats.size > MAX_BYTES) {
        fs.unlinkSync(localPath);
        console.error(`Downloaded file ${f.name} exceeded max size after download. Deleted local copy.`);
        continue;
      }
      // update manifest
      manifest.items[localName] = {
        driveId: f.id,
        name: f.name,
        md5: f.md5Checksum || null,
        modifiedTime: f.modifiedTime || null,
        localName,
        size: stats.size,
        updatedAt: new Date().toISOString()
      };
      console.log(`Saved ${localName} (size ${stats.size})`);
    } catch (e) {
      console.error("Failed to download", f.name, e.message || e);
      try { if (fs.existsSync(localPath)) fs.unlinkSync(localPath); } catch (_) {}
    }
  }

  // 6) Remove local files that are NOT in playlist (or have been removed from Drive)
  const keepLocalNames = new Set();
  Object.values(manifest.items).forEach(it => {
    if (toKeepDriveIds.has(it.driveId)) keepLocalNames.add(it.localName);
  });

  const localFiles = fs.readdirSync(DOWNLOAD_DIR);
  for (const lf of localFiles) {
    const p = path.join(DOWNLOAD_DIR, lf);
    if (!keepLocalNames.has(lf)) {
      console.log("Deleting local file not in playlist:", lf);
      try {
        fs.unlinkSync(p);
      } catch (e) {
        console.warn("Failed to delete", p, e.message || e);
      }
      if (manifest.items[lf]) delete manifest.items[lf];
    }
  }

  // 7) Persist manifest
  saveJSON(MANIFEST_PATH, manifest);
  console.log("Sync complete. Manifest saved to", MANIFEST_PATH);
}

main().catch(err => {
  console.error("Fatal error during sync:", err.message || err);
  process.exit(1);
});
