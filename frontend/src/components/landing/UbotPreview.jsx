import { useRef, useState } from "react";
import { projects } from "../../data/creatorExamples.js";

export default function UbotPreview({ onPlan }) {
  const [selected, setSelected] = useState(["flora:0", "orbit:0"]);
  const [stack, setStack] = useState("React + Node.js");
  const [customStack, setCustomStack] = useState("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  const stackRef = useRef();
  const firstCheck = useRef();
  function toggle(key) {
    setSelected((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    setError("");
  }
  function preview() {
    const sources = projects
      .map((project) => ({
        ...project,
        selectedFeatures: project.features
          .slice(0, 2)
          .filter((_, i) => selected.includes(`${project.id}:${i}`)),
      }))
      .filter((p) => p.selectedFeatures.length);
    if (sources.length < 2) {
      setError("Choose features from at least two different projects.");
      firstCheck.current?.focus();
      return;
    }
    if (stack === "custom" && !customStack.trim()) {
      setError("Enter the target stack you want.");
      stackRef.current?.focus();
      return;
    }
    setError("");
    onPlan({
      sources,
      stack: stack === "custom" ? customStack.trim() : stack,
      extra: extra.trim(),
    });
  }
  return (
    <div className="composition-card">
      <div className="composition-head">
        <span className="small-label">BUILD YOUR OWN COMBINATION</span>
        <span className="tag">Interactive example</span>
      </div>
      {projects.map((project, index) => (
        <fieldset className="source-option" key={project.id}>
          <legend>
            <span className={`source-mark ${project.tone}`} aria-hidden="true">
              {index + 1}
            </span>
            {project.title}
            <span className="source-stack">{project.stack}</span>
          </legend>
          <div className="source-checkboxes">
            {project.features.slice(0, 2).map((feature, i) => (
              <label key={feature}>
                <input
                  ref={index === 0 && i === 0 ? firstCheck : null}
                  type="checkbox"
                  checked={selected.includes(`${project.id}:${i}`)}
                  onChange={() => toggle(`${project.id}:${i}`)}
                />
                <span>{feature}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="composition-fields">
        <label htmlFor="target-stack">Your target stack</label>
        <select
          id="target-stack"
          value={stack}
          onChange={(event) => {
            setStack(event.target.value);
            setError("");
          }}
        >
          <option>React + Node.js</option>
          <option>Next.js</option>
          <option>Vue + Node.js</option>
          <option value="custom">Choose another stack…</option>
        </select>
        {stack === "custom" && (
          <>
            <label className="sr-only" htmlFor="custom-stack">
              Your custom target stack
            </label>
            <input
              id="custom-stack"
              ref={stackRef}
              type="text"
              value={customStack}
              onChange={(event) => {
                setCustomStack(event.target.value);
                setError("");
              }}
              placeholder="e.g. SvelteKit + PostgreSQL"
              aria-invalid={error && !customStack.trim() ? true : undefined}
              aria-describedby={error ? "plan-error" : undefined}
            />
          </>
        )}
        <label htmlFor="extra-features">Anything you’d like to add?</label>
        <textarea
          id="extra-features"
          className="resize-none"
          rows="2"
          maxLength="1000"
          value={extra}
          onChange={(event) => setExtra(event.target.value)}
          placeholder="Describe another feature or how it should work."
        />
      </div>
      <p id="plan-error" className="field-error" role="status">
        {error}
      </p>
      <button
        className="button button-dark full-width"
        type="button"
        onClick={preview}
      >
        Preview the plan <span aria-hidden="true">↗</span>
      </button>
      <p className="example-note">
        Example only. No AI job or credits are used.
      </p>
    </div>
  );
}
