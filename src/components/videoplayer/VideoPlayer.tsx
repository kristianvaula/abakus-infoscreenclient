'use client'
import { useEffect, useRef, useState } from "react";

type VideoPlayerProps = {
  playlist?: string[];        // array of video URLs (relative to site root or absolute)
  titles?: string[],          // titles to display with the promo videoes
  muted?: boolean;            // start muted (recommended for autoplay)
  loopPlaylist?: boolean;     // whether to loop the playlist when it ends
  className?: string;         // optional extra class
};
export default function VideoPlayer({
  playlist = ["/example_video.mp4"],
  muted = true,
  loopPlaylist = true,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const retryRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || playlist.length === 0) return;

    v.muted = muted;
    v.playsInline = true;
    v.autoplay = true;
    v.controls = false;
    v.loop = false;
    v.src = playlist[index];
    v.load();

    const tryPlay = async () => {
      try {
        await v.play();
        retryRef.current = 0;
      } catch (err) {
       retryRef.current += 1;
        if (retryRef.current <= MAX_RETRIES) {
          try {
            v.muted = true;
            await v.play();
            retryRef.current = 0;
          } catch {
            setTimeout(tryPlay, 800 * retryRef.current);
          }
        } else {
          console.warn("Video playback failed after retries:", err);
        }
      }
    };

    if (v.readyState >= 3) {
      tryPlay();
    } else {
      const onCanPlay = () => tryPlay();
      v.addEventListener("canplay", onCanPlay, { once: true });
      return () => v.removeEventListener("canplay", onCanPlay);
    }
  }, [index, playlist, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onEnded = () => {
      if (playlist.length <= 1) {
        // single file -> restart it
        if (loopPlaylist) {
          v.currentTime = 0;
          v.play().catch(() => {});
        }
      } else {
        // advance to next in playlist
        setIndex((i) => {
          const next = i + 1;
          if (next >= playlist.length) {
            return loopPlaylist ? 0 : i; // loop back or stay
          }
          return next;
        });
      }
    };

    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [playlist, loopPlaylist]);

  // Pause when page is hidden; resume when visible (helps CPU/battery and ensures resume)
  useEffect(() => {
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        try { v.pause(); } catch {
          // intentionally ignore pause errors
        }
      } else {
        // try resuming
        v.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Render
  return (
    <div className={`video-player-outer ${className}`} style={{ width: "100%", height: "100%" }}>
      <video
        ref={videoRef}
        className="video-player"
        playsInline
        muted={muted}
        autoPlay
        preload="auto"
        // controls intentionally omitted for kiosk mode
      />
      <div className="pt-[15px] px-[15px] pb-[10px]">
        <h2 className="video-title">
          Dette er en eksempel tittel
        </h2>
      </div>

    </div>
  );
}
