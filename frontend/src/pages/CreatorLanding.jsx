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

export default function CreatorLanding({ actions }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader actions={actions} />
      <main id="main">
        <Hero actions={actions} />

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

        <CreatorSection actions={actions} />

        <PainPoints actions={actions} />

        <FeeSection actions={actions} />

        <HowItWorks actions={actions} />

        <FeatureShowcase actions={actions} />

        <UbotSection actions={actions} />

        <FaqSection actions={actions} />

        <FinalCta actions={actions} />
      </main>
      <SiteFooter actions={actions} />
    </>
  );
}
