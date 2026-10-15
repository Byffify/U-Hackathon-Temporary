import { faqs } from "../../data/creatorExamples.js";
export default function Faq() {
  return (
    <div className="faq-list">
      {faqs.map(([title, body]) => (
        <details key={title}>
          <summary>
            {title}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{body}</p>
        </details>
      ))}
    </div>
  );
}
