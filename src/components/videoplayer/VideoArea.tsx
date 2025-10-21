import VideoPlayer from "@/components/videoplayer/VideoPlayer";

export default function VideoArea() {
  return (
    <div className="video-area">
      <VideoPlayer 
        playlist={['example_video.mp4']}
        muted={false}
        loopPlaylist={false}
      />
    </div>
  );
}
