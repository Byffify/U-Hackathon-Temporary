export default function PainPoints() {
  return (
    <section className="pain-section" aria-labelledby="pain-title">
      <div className="container pain-inner">
        <div className="pain-copy">
          <p className="eyebrow">SOUND FAMILIAR?</p>
          <h2 id="pain-title">
            Built with care.
            <br />
            Buried in a folder.
          </h2>
          <p>
            The project is good.
            <br />
            It just needs its next person.
          </p>
          <span className="pain-scribble" aria-hidden="true">
            Let’s change that. ↗
          </span>
        </div>
        <div className="notes">
          <article className="pain-note note-lilac">
            <span className="note-pin" aria-hidden="true"></span>
            <p>
              “I spent weeks
              <br />
              building this.
              <br />
              Now what?”
            </p>
            <span>A very real side-project feeling</span>
          </article>
          <article className="pain-note note-yellow">
            <span className="note-pin" aria-hidden="true"></span>
            <p>
              Great portfolio.
              <br />
              Zero way to buy
              <br />
              the actual project.
            </p>
            <span>There should be a next step.</span>
          </article>
          <article className="pain-note note-aqua">
            <span className="note-pin" aria-hidden="true"></span>
            <p>
              Sharing a demo
              <br />
              shouldn’t mean
              <br />
              giving it all away.
            </p>
            <span>Show the work. Set the terms.</span>
          </article>
          <article className="pain-note note-peach">
            <span className="note-pin" aria-hidden="true"></span>
            <p>
              Someone’s
              <br />
              “unfinished” is
              <br />
              another’s head start.
            </p>
            <span>Good code deserves another life.</span>
          </article>
        </div>
      </div>
    </section>
  );
}
