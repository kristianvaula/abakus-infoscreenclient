export default function InfoBox() {
  return (
    <div className="info-container">
      <div className="image-box">
        <div className="image-content">
          <h1>Velkommen til Abakus</h1>
          <p>
            Abakus er linjeforeningen for studentene ved <em>Datateknologi & Cybersikkerhet og datakommunikasjon</em> på NTNU, og drives av studenter ved disse studiene.
          </p>
        </div>
      </div>
      <div className="some-container">
        <div className="insta-box">
          <img src="insta_title.png" alt="" className="insta-title-photo"/>
          <img src="insta.png" alt="" className="insta-photo"/>
        </div>
        <div className="slack-box">
          <img src="slack.png" alt="" className="slack-photo"/>
        </div>

      </div>
    </div>

  );
}

