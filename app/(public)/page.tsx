import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { LandingNav } from "@/features/landing/components/landing-nav";
import { HeroArtwork } from "@/features/landing/components/hero-artwork";
import {
  FeatureSection,
  HowItWorks,
  LandingFooter,
} from "@/features/landing/components/landing-sections";
import { EventShowcase } from "@/features/landing/components/event-showcase";
import "@/features/landing/landing.css";

export default function HomePage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <main id="main-content">
        <section
          className="site-container landing-hero"
          aria-labelledby="hero-heading"
        >
          <div className="hero-copy">
            <Reveal>
              <p className="eyebrow hero-eyebrow">
                <span /> A little less logistics. A lot more life.
              </p>
            </Reveal>
            <Reveal delay={0.07}>
              <h1 id="hero-heading">
                Make room
                <br />
                for the
                <br />
                <em>unforgettable.</em>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="hero-description">
                The best things happen when people come together. Discover your
                next experience, or make one of your own.
              </p>
              <div className="hero-actions">
                <ButtonLink href={ROUTES.SIGNUP}>
                  Make it happen <ArrowUpRight size={17} aria-hidden="true" />
                </ButtonLink>
                <a href={ROUTES.EXPLORE} className="text-link">
                  Find your next thing{" "}
                  <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <p className="hero-note">
                For the hosts. The guests. The good times.
              </p>
            </Reveal>
          </div>
          <HeroArtwork />
          <div className="hero-bottom">
            <span className="eyebrow">Real people. Shared moments.</span>
            <span>
              Scroll to find your flow{" "}
              <ArrowDown size={14} aria-hidden="true" />
            </span>
          </div>
        </section>
        <FeatureSection />
        <EventShowcase />
        <HowItWorks />
        <section className="landing-cta" aria-labelledby="cta-heading">
          <div className="site-container">
            <Reveal>
              <p className="eyebrow">Something good starts here</p>
              <h2 id="cta-heading">
                Your people.
                <br />
                <em>Your kind of moment.</em>
              </h2>
              <ButtonLink href={ROUTES.SIGNUP}>
                Let’s bring it to life{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </ButtonLink>
            </Reveal>
            <span className="cta-orbit cta-orbit-one" aria-hidden="true" />
            <span className="cta-orbit cta-orbit-two" aria-hidden="true" />
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
