import Hero from "../components/landing/Hero.jsx";
import CreatorSection from "../components/landing/CreatorSection.jsx";
import PainPoints from "../components/landing/PainPoints.jsx";
import FeeSection from "../components/landing/FeeSection.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import FeatureShowcase from "../components/landing/FeatureShowcase.jsx";
import UbotSection from "../components/landing/UbotSection.jsx";
import FaqSection from "../components/landing/FaqSection.jsx";
import FinalCta from "../components/landing/FinalCta.jsx";
import SiteFooter from "../components/layout/SiteFooter.jsx";
import { useEffect, useRef } from "react";
import { createLandingMotion } from "../lib/landingMotion.js";
function SlideSection({ children }) {
  return <div data-landing-slide>{children}</div>;
}

export default function CreatorLanding() {
  const mainRef = useRef(null);
  useEffect(() => createLandingMotion(mainRef.current), []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <main id="main" ref={mainRef}>
        <SlideSection>
          <Hero />
        </SlideSection>

        <SlideSection>
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
        </SlideSection>

        <SlideSection>
          <CreatorSection />
        </SlideSection>

        <SlideSection>
          <PainPoints />
        </SlideSection>

        <SlideSection>
          <FeeSection />
        </SlideSection>

        <SlideSection>
          <HowItWorks />
        </SlideSection>

        <SlideSection>
          <FeatureShowcase />
        </SlideSection>

        <SlideSection>
          <UbotSection />
        </SlideSection>

        <SlideSection>
          <FaqSection />
        </SlideSection>

        <SlideSection>
          <FinalCta />
        </SlideSection>
      </main>
      <SiteFooter />
    </>
  );
}
