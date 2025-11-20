'use client'
import React, { useEffect, useRef, useState } from "react";
import { PlaylistItem } from "../../types/types";

type VideoPlayerProps = {
  playlist?: PlaylistItem[];
  muted?: boolean;
  loopPlaylist?: boolean;
  className?: string;
};

export default function VideoPlayer({
  playlist,
  muted = true,
  loopPlaylist = true,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!playlist || playlist.length === 0) {
      setIndex(0);
      return;
    }
    if (index >= playlist.length) setIndex(0);
  }, [playlist, index]);

  const itemUrl = (item?: PlaylistItem) => {
    if (!item) return null;
    if ((item as any).url) return (item as any).url as string;
    if ((item as any).localName) return `/api/video?name=${encodeURIComponent((item as any).localName)}`;
    if ((item as any).file) return `/videos/${encodeURIComponent((item as any).file)}`;
    return null;
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // if no playlist, clear source
    if (!playlist || playlist.length === 0) {
      v.pause();
      v.removeAttribute("src");
      v.load();
      return;
    }

    const src = itemUrl(playlist[index]);
    if (!src) {
      setIndex(i => {
        const next = i + 1;
        return next >= (playlist?.length ?? 0) ? (loopPlaylist ? 0 : i) : next;
      });
      return;
    }

    // reset previous listeners & source
    v.pause();
    try { v.onended = null; v.onerror = null; } catch {}
    v.removeAttribute("src");
    v.load();

    v.playsInline = true;
    v.controls = false;
    v.loop = playlist.length === 1 && loopPlaylist; // native loop for single-item playlists
    const requestedMuted = !!muted;
    v.muted = true; // ensure autoplay allowed

    v.src = src;
    v.load();

    let mounted = true;

    const advanceIndex = () =>
      setIndex(i => {
        if (!playlist || playlist.length === 0) return 0;
        if (playlist.length === 1) return i; // single item handled by native loop
        const next = i + 1;
        return next >= playlist.length ? (loopPlaylist ? 0 : i) : next;
      });

    const onEnded = () => {
      if (!mounted) return;
      // single-item handled by native loop above
      if (playlist && playlist.length > 1) advanceIndex();
    };

    const onError = () => {
      console.warn("Video error, skipping to next:", src);
      if (!mounted) return;
      // small delay so UI can update
      setTimeout(advanceIndex, 50);
    };

    const tryPlay = async () => {
      try {
        await v.play();
        if (!requestedMuted) try { v.muted = false; } catch {}
      } catch {
        // quick fallback: ensure muted and try once; if still fails, skip
        try {
          v.muted = true;
          await v.play();
          if (!requestedMuted) try { v.muted = false; } catch {}
        } catch {
          setTimeout(advanceIndex, 100);
        }
      }
    };

    // attach listeners (cleaned up below)
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    if (v.readyState >= 3) tryPlay();
    else v.addEventListener("canplay", tryPlay, { once: true });

    return () => {
      mounted = false;
      try {
        v.removeEventListener("ended", onEnded);
        v.removeEventListener("error", onError);
        v.removeEventListener("canplay", tryPlay as EventListener);
      } catch {}
    };
  }, [index, playlist, muted, loopPlaylist]);

  const currentItem = playlist && playlist.length > 0 ? playlist[index] : undefined;
  const title = currentItem?.title || "";

  return (
    <div className="video-area">
      <div className={`video-player-outer ${className}`} style={{ width: "100%", height: "100%" }}>
        <video
          ref={videoRef}
          className="video-player"
          playsInline
          muted={muted}
          autoPlay
          preload="auto"
        />
        <div className="video-caption">
        {/*  <h2 className="video-title">{title}</h2> */}
        </div>
      </div>
    </div>
  );
}
