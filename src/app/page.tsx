import VideoPlayer from "@/components/videoplayer/VideoPlayer";
import BusFooter from "@/components/bus-footer/BusFooter";
import "../styles/app.css"
import Events from "@/components/events/Events";

export default function Home() {
  return (
    <div className="app-root">
        <header className="topbar" role="banner">
            <div className="topbar-left">
                <img src="/abakus_logo.svg" alt="" className="topbar-logo"/>
            </div>
          </header>
        <div className="app-container">
            <aside className="col-left">
                <div className="video-area">
                    <VideoPlayer />
                </div>
            </aside>
            <main className="col-right">
                <div className="info">
                    <Events />
                </div>
            </main>
        </div>
        <footer>
            <BusFooter />
        </footer>
    </div>
  );
}
