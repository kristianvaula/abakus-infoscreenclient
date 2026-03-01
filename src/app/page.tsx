import VideoArea from "@/components/videoplayer/VideoArea";
import BusFooter from "@/components/bus-footer/BusFooter";
import Events from "@/components/events/Events";
import InfoBox from "@/components/InfoBox";

export default function Home() {
  return (
    <>
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <img src="/abakus_logo.svg" alt="" className="topbar-logo" />
        </div>
        <div className="topbar-right">
          <div className="topbar-title">
            <h1>Sosialt</h1>
          </div>
          <div className="topbar-title">
            <h1>Bedpres og kurs</h1>
          </div>
        </div>
      </header>

      <div className="app-main">
        <aside className="app-sidebar">
          <VideoArea />
          <InfoBox />
        </aside>
        <main className="app-content">
          <Events />
        </main>
      </div>

      <BusFooter />
    </>
  );
}
