'use client'
import { useEffect, useRef, useState } from "react";

type VideoPlayerProps = {
  playlist?: string[];         // array of video URLs (relative to site root or absolute)
  muted?: boolean;            // start muted (recommended for autoplay)
  loopPlaylist?: boolean;     // whether to loop the playlist when it ends
  className?: string;         // optional extra class
};

/**
 * VideoPlayer: autoplaying, looped, no-controls player for info screens.
 *
 * By default it plays "/example_video.mp4" — put your test file in the project's public folder.
 */
export default function VideoPlayer({
  playlist = ["/example_video.mp4"],
  muted = true,
  loopPlaylist = true,
  className = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const retryRef = useRef(0); // simple retry counter for play failures
  const MAX_RETRIES = 3;

  // set source & attempt to play when the index or playlist changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || playlist.length === 0) return;

    // assign attributes / ensure muted state
    v.muted = muted;
    v.playsInline = true;
    v.autoplay = true;
    v.controls = false;
    v.loop = false; // we handle looping in the logic (so we can loop playlists)
    // set src and load
    v.src = playlist[index];
    v.load();

    // try playing (autoplay may be rejected)
    const tryPlay = async () => {
      try {
        await v.play();
        retryRef.current = 0;
      } catch (err) {
        // autoplay rejected — try to recover: ensure muted then retry a couple times
        retryRef.current += 1;
        if (retryRef.current <= MAX_RETRIES) {
          try {
            v.muted = true;
            await v.play();
            retryRef.current = 0;
          } catch {
            // schedule another short retry
            setTimeout(tryPlay, 800 * retryRef.current);
          }
        } else {
          // give up silently — the device might require user gesture.
          console.warn("Video playback failed after retries:", err);
        }
      }
    };

    // if the video is already ready, attempt play immediately; otherwise wait for canplay
    if (v.readyState >= 3) {
      tryPlay();
    } else {
      const onCanPlay = () => tryPlay();
      v.addEventListener("canplay", onCanPlay, { once: true });
      return () => v.removeEventListener("canplay", onCanPlay);
    }
  }, [index, playlist, muted]);

  // handle 'ended' events -> advance playlist or restart
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
