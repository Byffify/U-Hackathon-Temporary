import Hero from "../components/landing/Hero.jsx";
import CreatorSection from "../components/landing/CreatorSection.jsx";
import PainPoints from "../components/landing/PainPoints.jsx";
import FeeSection from "../components/landing/FeeSection.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import FeatureShowcase from "../components/landing/FeatureShowcase.jsx";
import UbotSection from "../components/landing/UbotSection.jsx";
import FaqSection from "../components/landing/FaqSection.jsx";
import FinalCta from "../components/landing/FinalCta.jsx";
import SiteHeader from "../components/layout/SiteHeader.jsx";
import SiteFooter from "../components/layout/SiteFooter.jsx";
import { useEffect, useRef } from "react";
import { createLandingMotion } from "../lib/landingMotion.js";
function SlideSection({ children }) {
  return <div data-landing-slide>{children}</div>;
}

export default function CreatorLanding({ actions }) {
  const mainRef = useRef(null);
  useEffect(() => createLandingMotion(mainRef.current), []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader actions={actions} />
      <main id="main" ref={mainRef}>
        <SlideSection>
          <Hero actions={actions} />
        </SlideSection>

        <div className="manifesto-strip">
          <span>YOUR WORK, YOUR NAME.</span>
          <span className="strip-star" aria-hidden="true">
            ✳
          </span>
          <span>YOUR SOURCE, YOUR TERMS.</span>
          <span className="strip-star" aria-hidden="true">
            ✳
          </span>
          <span>SOMETHING NEW STARTS HERE.</span>
        </div>

        <SlideSection>
          <CreatorSection actions={actions} />
        </SlideSection>

        <SlideSection>
          <PainPoints actions={actions} />
        </SlideSection>

        <SlideSection>
          <FeeSection actions={actions} />
        </SlideSection>

        <SlideSection>
          <HowItWorks actions={actions} />
        </SlideSection>

        <SlideSection>
          <FeatureShowcase actions={actions} />
        </SlideSection>

        <SlideSection>
          <UbotSection actions={actions} />
        </SlideSection>

        <SlideSection>
          <FaqSection actions={actions} />
        </SlideSection>

        <SlideSection>
          <FinalCta actions={actions} />
        </SlideSection>
      </main>
      <SiteFooter actions={actions} />
    </>
  );
}
