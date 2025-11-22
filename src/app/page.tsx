import VideoArea from "@/components/videoplayer/VideoArea";
import BusFooter from "@/components/bus-footer/BusFooter";
import "../styles/app.css"
import "@/styles/components/videoplayer.css";
import Events from "@/components/events/Events";
import InfoBox from "@/components/InfoBox";

export default function Home() {
  return (
    <div className="app-root">
      <header className="topbar" role="banner">
        <div className="topbar-left">
          <img src="/abakus_logo.svg" alt="" className="topbar-logo"/>
        </div>
        <div className="topbar-right">
          <div className="titlebox">
            <h1 className="">Sosialt</h1>
          </div>
          <div className="titlebox">
            <h1 className="">Bedpres og kurs</h1>
          </div>
        </div>
      </header>
      <div className="app-container">
        <aside className="col-left">
          <VideoArea />
          <InfoBox />
        </aside>
        <main className="col-right">
          <Events />
        </main>
      </div>
      <footer>
        <BusFooter />
      </footer>
    </div>
  );
}
