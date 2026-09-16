import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  LayoutTemplate,
  Ticket,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/animation/reveal";
import { Brand, BrandMark } from "@/components/ui/brand";
import { ButtonLink } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

const features = [
  {
    icon: Compass,
    title: "Find your kind of thing.",
    description:
      "From intimate gatherings to big ideas. Make space for experiences that feel like you.",
    number: "01",
  },
  {
    icon: LayoutTemplate,
    title: "Bring your vision to life.",
    description:
      "A home for your next event, with the details that help people say, ‘I’m in.’",
    number: "02",
  },
  {
    icon: Users,
    title: "Keep people at the heart.",
    description:
      "Less back and forth. More looking forward. Bring the experience together in one place.",
    number: "03",
  },
];

export function FeatureSection() {
  return (
    <section
      id="features"
      className="landing-features"
      aria-labelledby="features-heading"
    >
      <div className="site-container">
        <Reveal className="feature-intro">
          <p className="eyebrow">Life happens together</p>
          <h2 id="features-heading" className="section-heading">
            Big ideas. Small gatherings.
            <br />
            <span>One place to make them happen.</span>
          </h2>
        </Reveal>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, description, number }, index) => (
            <Reveal key={number} delay={index * 0.08} className="feature-item">
              <div className="feature-item-top">
                <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
                <span>{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  {
    title: "Start with a spark.",
    description:
      "A shared interest, a big idea, a reason to celebrate. Every great event starts somewhere.",
  },
  {
    title: "Make it your own.",
    description:
      "Set the scene. Bring your details together and give your gathering a place to call home.",
  },
  {
    title: "Bring your people.",
    description:
      "Get the word out, bring everyone together, and make a moment worth remembering.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="site-container how-section"
      aria-labelledby="how-heading"
    >
      <Reveal className="how-artwork">
        <div className="how-photo">
          <Image
            src="/images/event-conference.jpg"
            alt="A conference room with tables and a projection screen, ready for guests"
            fill
            sizes="(max-width: 767px) 100vw, 45vw"
          />
        </div>
        <div className="how-note">
          <Ticket size={25} strokeWidth={1.5} aria-hidden="true" />
          <p>
            A little planning.
            <br />
            <em>A lasting feeling.</em>
          </p>
          <BrandMark className="size-7" />
        </div>
        <span className="eyebrow how-image-caption">
          For every “we should do this more often.”
        </span>
      </Reveal>
      <div className="how-copy">
        <Reveal>
          <p className="eyebrow">From what if to see you there</p>
          <h2 id="how-heading" className="section-heading">
            Good things
            <br />
            start with you.
          </h2>
        </Reveal>
        <ol className="how-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal delay={index * 0.07} className="how-step">
                <span className="step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <Reveal>
          <ButtonLink href={ROUTES.SIGNUP} variant="secondary">
            Create your account <ArrowUpRight size={17} aria-hidden="true" />
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="site-container">
        <div className="footer-main">
          <div>
            <Brand />
            <p>
              A reason to go.
              <br />A moment to remember.
            </p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href={ROUTES.FEATURES}>Features</Link>
            <Link href={ROUTES.HOW_IT_WORKS}>How it works</Link>
            <Link href={ROUTES.EXPLORE}>Explore</Link>
            <Link href={ROUTES.LOGIN}>Log in</Link>
            <Link href={ROUTES.SIGNUP}>
              Get started <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EventFlow</span>
          <span>
            Made for coming together.
            <BrandMark className="size-4" />
          </span>
        </div>
      </div>
    </footer>
  );
}
