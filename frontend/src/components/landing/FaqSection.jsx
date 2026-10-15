import Faq from "./Faq.jsx";
export default function FaqSection() {
  return (
    <section
      className="section container faq-section"
      aria-labelledby="faq-title"
    >
      <div>
        <p className="eyebrow">A FEW GOOD QUESTIONS</p>
        <h2 id="faq-title">
          Before your
          <br />
          next chapter.
        </h2>
      </div>
      <Faq />
    </section>
  );
}
