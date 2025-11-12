// app/api/video/route.ts
import fs from "fs";
import path from "path";

export const runtime = "nodejs"; // must run in Node (we read the filesystem)

const VIDEO_DIR = path.join(process.cwd(), "public", "videos");
const MANIFEST_PATH = path.join(process.cwd(), "manifest.json");

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name");
    if (!name) return new Response("Missing 'name'", { status: 400 });

    // Load manifest and build whitelist
    let manifest: { items?: any[] } = { items: [] };
    try {
      if (fs.existsSync(MANIFEST_PATH)) {
        const raw = await fs.promises.readFile(MANIFEST_PATH, "utf8");
        manifest = JSON.parse(raw || "{}");
      }
    } catch (e) {
      // ignore and treat as empty manifest
    }
    const entries = Object.values(manifest.items || {});
    const allowed = new Set((entries).map((i: any) => i.localName || i.file || i.storageKey));
    if (!allowed.has(name)) {
      return new Response("Not found", { status: 404 });
    }

    // prevent path traversal
    const safeName = path.basename(name);
    const filePath = path.join(VIDEO_DIR, safeName);

    // check file exists and get size
    let stat;
    try {
      stat = await fs.promises.stat(filePath);
      if (!stat.isFile()) throw new Error("not a file");
    } catch (e) {
      return new Response("Not found", { status: 404 });
    }

    const fileSize = stat.size;
    const rangeHeader = req.headers.get("range");

    if (rangeHeader) {
      // parse range "bytes=start-end"
      const matches = rangeHeader.replace(/bytes=/, "").split("-");
      const start = Number(matches[0]);
      const end = matches[1] ? Number(matches[1]) : fileSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start < 0 || end >= fileSize) {
        return new Response("Requested Range Not Satisfiable", { status: 416 });
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      const headers = new Headers();
      headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
      headers.set("Accept-Ranges", "bytes");
      headers.set("Content-Length", String(chunkSize));
      headers.set("Content-Type", "video/mp4");

      return new Response(stream as any, { status: 206, headers });
    } else {
      // full file
      const stream = fs.createReadStream(filePath);
      const headers = new Headers();
      headers.set("Content-Length", String(fileSize));
      headers.set("Content-Type", "video/mp4");
      headers.set("Accept-Ranges", "bytes");

      return new Response(stream as any, { status: 200, headers });
    }
  } catch (err) {
    console.error("video route error", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
