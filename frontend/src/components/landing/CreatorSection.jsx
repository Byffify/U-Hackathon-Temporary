import CreatorShowcase from "./CreatorShowcase.jsx";
export default function CreatorSection() {
  return (
    <section
      className="section container creator-section"
      id="creators"
      aria-labelledby="creator-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">A PORTFOLIO WITH POSSIBILITIES</p>
          <h2 id="creator-title">
            More than a link
            <br />
            on your résumé.
          </h2>
        </div>
        <p>
          Let people meet the maker, try the work,
          <br />
          and take the next step when it clicks.
        </p>
      </div>
      <CreatorShowcase />
      <div className="creator-bottom">
        <p>
          Your work tells the story.
          <br />
          <strong>Give it somewhere to go.</strong>
        </p>
      </div>
    </section>
  );
}
