export default function InfoBox() {
  return (
    <div className="info-box">
      <div className="info-hero">
        <div className="info-heroContent">
          <h1>Velkommen til Abakus</h1>
          <p>
            Abakus er linjeforeningen for studentene ved <em>Datateknologi & Cybersikkerhet og datakommunikasjon</em> på NTNU, og drives av studenter ved disse studiene.
          </p>
        </div>
      </div>
      <div className="info-side">
        <div className="info-insta">
          <img src="insta_title.png" alt="" className="info-instaTitle" />
          <img src="insta.png" alt="" className="info-instaImage" />
        </div>
        <div className="info-slack">
          <img src="slack.png" alt="" className="info-slackImage" />
        </div>
      </div>
    </div>
  );
}

