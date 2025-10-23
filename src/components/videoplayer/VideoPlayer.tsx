'use client'
import React, { useEffect, useRef, useState } from "react";
import { PlaylistItem } from "../../types/types";

type VideoPlayerProps = {
  playlist?: PlaylistItem[];        // array of playlist items fetched from /api/playlist
  muted?: boolean;            // start muted (recommended for autoplay)
  loopPlaylist?: boolean;     // whether to loop the playlist when it ends
  className?: string;         // optional extra class
};

export default function VideoPlayer({
  playlist,
  muted = true,
  loopPlaylist = true,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const retryRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => { // Ensure index is valid when playlist changes
    if (!playlist || playlist.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= playlist.length) setIndex(0);
  }, [playlist, index]);

  const itemUrl = (item?: PlaylistItem) => { // Helper to get a playable URL for a playlist item
    if (!item) return null;
    if ((item as any).url) return (item as any).url as string;
    if ((item as any).localName) return `/api/video?name=${encodeURIComponent((item as any).localName)}`;
    if ((item as any).file) return `/videos/${encodeURIComponent((item as any).file)}`;
    return null;
  };
  
  useEffect(() => { // centralised load+play routine
    const v = videoRef.current;
    if (!v) return;

    retryRef.current = 0;
    
    if (!playlist || playlist.length === 0) {
      v.pause();
      v.removeAttribute("src");
      v.load();
      return;
    }
    
    const current = playlist[index];
    const src = itemUrl(current);
    if (!src) {
      console.warn("VideoPlayer: item has no usable URL, skipping to next.");
      setIndex(i => {
        const next = i + 1;
        if (next >= playlist.length) return loopPlaylist ? 0 : i;
        return next;
      });
      return;
    }

    v.playsInline = true;
    v.controls = false;
    v.loop = false;
    const requestedMuted = !!muted;
    v.muted = true;

    v.src = src;
    console.log(`Src: ${src}`)
    v.load();

    let cancelled = false;

    const tryPlay = async () => {
      if (cancelled) return;
      try {
        await v.play();
        retryRef.current = 0;

        // If parent wanted sound (muted === false), try to unmute now.
        // NOTE: many browsers will block unmute without a user gesture; this attempt may silently fail.
        if (!requestedMuted) {
          try {
            v.muted = false;
          } catch {
            // ignored
          }
        }
      } catch (err) {
        // first attempt failed — do a controlled retry strategy
        retryRef.current += 1;
        if (retryRef.current <= MAX_RETRIES) {
          // ensure muted before retrying (muted must be true to allow autoplay)
          try {
            v.muted = true;
            await new Promise(res => setTimeout(res, 200 * retryRef.current)); // small backoff
            await v.play();
            retryRef.current = 0;
            if (!requestedMuted) try { v.muted = false; } catch {}
          } catch {
            // schedule another try
            setTimeout(tryPlay, 800 * retryRef.current);
          }
        } else {
          console.warn("Video playback failed after retries:", err);
        }
      }
    };

    // Wait for canplay if needed
    if (v.readyState >= 3) {
      tryPlay();
    } else {
      const onCanPlay = () => tryPlay();
      v.addEventListener("canplay", onCanPlay, { once: true });
      // cleanup for this registration
      return () => {
        cancelled = true;
        v.removeEventListener("canplay", onCanPlay);
      };
    }

    // cleanup guard in case effect re-runs
    return () => {
      cancelled = true;
    };
  }, [index, playlist, muted, loopPlaylist]);

  useEffect(() => { // Handle end event -> advance playlist
    const v = videoRef.current;
    if (!v) return;

    const onEnded = () => {
      if (!playlist || playlist.length <= 1) {
        if (loopPlaylist) {
          try { v.currentTime = 0; v.play().catch(() => {}); } catch {}
        }
        return;
      }
      setIndex((i) => {
        const next = i + 1;
        if (next >= playlist.length) {
          return loopPlaylist ? 0 : i;
        }
        return next;
      });
    };

    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [playlist, loopPlaylist]);

  useEffect(() => {  // Pause when page hidden; resume when visible
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        try { v.pause(); } catch {}
      } else {
        v.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const currentItem = playlist && playlist.length > 0 ? playlist[index] : undefined;
  const title = currentItem?.title || "";

  return (
    <div className={`video-player-outer ${className}`} style={{ width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        className="video-player"
        playsInline
        muted={muted} // UI initial attribute; actual autoplay attempts use `muted = true` internally
        autoPlay
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />

      <div className="pt-[15px] px-[15px] pb-[10px]">
        <h2 className="video-title">
          {title || ""}
        </h2>
      </div>
    </div>
  );
}
