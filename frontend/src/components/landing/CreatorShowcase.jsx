import { useRef, useState } from "react";
import { creators, projects } from "../../data/creatorExamples.js";
import { ProjectCard } from "./ProjectArt.jsx";
import { useMediaQuery } from "../../hooks/useMediaQuery.js";

function Tabs({ items, active, onChange, label, vertical = false }) {
  const refs = useRef({});
  const isNarrow = useMediaQuery("(max-width: 640px)");
  function keyDown(event, index) {
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (["ArrowRight", "ArrowDown"].includes(event.key))
      next = (index + 1) % items.length;
    else if (["ArrowLeft", "ArrowUp"].includes(event.key))
      next = (index - 1 + items.length) % items.length;
    if (next !== undefined) {
      event.preventDefault();
      onChange(items[next].id);
      refs.current[items[next].id]?.focus({ preventScroll: true });
    }
  }
  return (
    <div
      className={vertical ? "creator-tabs" : "profile-tabs"}
      role="tablist"
      aria-label={label}
      aria-orientation={vertical && !isNarrow ? "vertical" : "horizontal"}
    >
      {items.map((item, index) => (
        <button
          ref={(node) => {
            refs.current[item.id] = node;
          }}
          key={item.id}
          id={item.tabId}
          className={vertical ? "creator-tab" : "profile-tab"}
          role="tab"
          aria-selected={active === item.id}
          aria-controls={item.panelId}
          tabIndex={active === item.id ? 0 : -1}
          type="button"
          onClick={() => onChange(item.id)}
          onKeyDown={(event) => keyDown(event, index)}
        >
          {item.icon && (
            <span className={`specialty-icon ${item.tone}`} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span>{item.label}</span>
          {vertical && (
            <span className="tab-arrow" aria-hidden="true">
              ↗
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default function CreatorShowcase({ onProject, onFees }) {
  const query = new URLSearchParams(location.search);
  const [creatorId, setCreator] = useState(
    creators.some((c) => c.id === query.get("creator"))
      ? query.get("creator")
      : "maya",
  );
  const [profileTab, setProfileTab] = useState(
    ["projects", "about", "rights"].includes(query.get("profile"))
      ? query.get("profile")
      : "projects",
  );
  const creator = creators.find((c) => c.id === creatorId);
  function persist(id, tab) {
    const url = new URL(location.href);
    url.searchParams.set("creator", id);
    url.searchParams.set("profile", tab);
    history.replaceState(null, "", url);
  }
  function chooseCreator(id) {
    setCreator(id);
    persist(id, profileTab);
  }
  function chooseTab(id) {
    setProfileTab(id);
    persist(creatorId, id);
  }
  return (
    <div className="creator-layout">
      <div className="creator-rail">
        <Tabs
          items={creators.map((c, i) => ({
            id: c.id,
            label: c.specialty,
            tone: c.tone,
            icon: ["⌘", "{ }", "✳"][i],
            tabId: `creator-${c.id}`,
            panelId: "creator-panel",
          }))}
          active={creatorId}
          onChange={chooseCreator}
          label="Example creator specialties"
          vertical
        />
        <p className="sample-caption">
          Illustrative creators and projects.
          <br />A look at what your profile could be.
        </p>
        <div className="drawn-arrow" aria-hidden="true">
          ↳
        </div>
      </div>
      <div
        id="creator-panel"
        className="creator-panel"
        role="tabpanel"
        aria-labelledby={`creator-${creatorId}`}
        tabIndex="0"
      >
        <div className={`creator-cover ${creator.tone}`}>
          <span className="cover-word">
            made of
            <br />
            <b>possibilities.</b>
          </span>
          <div className="cover-scribble" aria-hidden="true">
            ✳
          </div>
          <span className="cover-label">EXAMPLE CREATOR PROFILE</span>
        </div>
        <div className="profile-info">
          <div className={`profile-avatar ${creator.tone}`} aria-hidden="true">
            {creator.initials}
          </div>
          <div className="profile-name">
            <h3>
              {creator.name}{" "}
              <span className="creator-spark" aria-hidden="true">
                ✳
              </span>
            </h3>
            <p>
              {creator.role}{" "}
              <span className="profile-location">· {creator.location}</span>
            </p>
          </div>
          <span className="profile-chip">Independent maker</span>
        </div>
        <p className="profile-bio">{creator.bio}</p>
        <Tabs
          items={["projects", "about", "rights"].map((id, i) => ({
            id,
            label: ["Projects", "About", "License & rights"][i],
            tabId: `profile-tab-${id}`,
            panelId: "profile-content",
          }))}
          active={profileTab}
          onChange={chooseTab}
          label="Example profile sections"
        />
        <div
          id="profile-content"
          className="profile-content"
          role="tabpanel"
          aria-labelledby={`profile-tab-${profileTab}`}
          tabIndex="0"
        >
          {profileTab === "projects" ? (
            <div className="profile-project-grid">
              {creator.projects.map((id) => (
                <ProjectCard
                  key={id}
                  project={projects.find((p) => p.id === id)}
                  onProject={onProject}
                />
              ))}
            </div>
          ) : profileTab === "about" ? (
            <div className="profile-about">
              <h4>Made with curiosity.</h4>
              <p>{creator.bio}</p>
              <p>
                This is an illustrative profile, not a real creator account.
              </p>
              <div className="stack-tags">
                {creator.stack.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="profile-about">
              <h4>Source comes with clear terms.</h4>
              <p>
                Creators set original-license resale and derivative-sale
                permission separately. Read the terms before buying or combining
                source.
              </p>
              <p>
                One purchase includes updates in the same listing. The platform
                fee is 10%, including purchase gas.
              </p>
              <button
                className="text-button"
                type="button"
                onClick={() => onFees("profile")}
              >
                See the fee breakdown <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
