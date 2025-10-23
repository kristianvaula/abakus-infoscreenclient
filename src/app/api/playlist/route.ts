import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

const VIDEO_DIR = path.join(process.cwd(), "videos");
const MANIFEST_PATH = path.join(process.cwd(), "manifest.json");

export async function GET() {
  try {
    const text = fs.readFileSync(MANIFEST_PATH, "utf8");
    const manifest = JSON.parse(text);

    // manifest.items is an object, so get its values
    const entries = Object.values(manifest.items || {});

    const items = entries.map((it: any) => {
      const localName = it.localName || it.name || it.file || it.storageKey;
      return {
        title: it.name ?? null,
        localName,
        url: `/api/video?name=${encodeURIComponent(localName)}`,
        size: it.size,
        modifiedTime: it.modifiedTime,
      };
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    console.error("Failed to read manifest:", err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
