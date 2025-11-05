'use client';
import React, { useEffect, useState } from "react";
import VideoPlayer from "@/components/videoplayer/VideoPlayer";
import { PlaylistItem } from "../../types/types";

export default function VideoArea() {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const API_PATH = "/api/playlist";

  async function fetchPlaylist() {
    try {
      const res = await fetch(API_PATH);
      if (!res.ok) throw new Error("Failed to fetch playlist");
      const json = await res.json();
      const playlistItems: PlaylistItem[] = (json.items || [])
      setItems(playlistItems);
    } catch (err) {
      console.error("Failed to load playlist:", err);
      setItems([]);
    }
  }

  useEffect(() => {
    fetchPlaylist();
    // refresh periodically (in case signed URLs expire)
    const interval = setInterval(fetchPlaylist, 1000 * 60 * 10);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
    {(items.length <= 0)  ? (
      <div className="video-area">
        <VideoPlayer
          playlist={items}
          muted={false}
          loopPlaylist={false}
        />
    </div>
    ) : (
    <div className="flex justify-center items-center w-full">
      <img
        src="abakus-banner.png"
        alt="Centered"
        className="max-w-full h-auto object-contain"
      />
    </div>
    )
    }
    </>
  );
}
