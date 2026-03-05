import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.js';

const STORY_SECTIONS = Object.freeze([
  {
    eyebrow: 'Welcome',
    title: 'Welcome to Ledgerly',
    description:
      'A modern inventory operations platform for teams that need realtime control, secure collaboration, and confident purchasing decisions.'
  },
  {
    eyebrow: 'Realtime Operations',
    title: 'Run inventory with live operational visibility.',
    description:
      'Monitor stock movement, purchase order events, and warehouse activity in one command layer designed for fast, reliable execution.'
  },
  {
    eyebrow: 'Decision Signals',
    title: 'Move from stock tracking to business control.',
    description:
      'Use intelligent reporting, dead-stock insights, and supplier analytics to improve cash flow, reduce stockouts, and guide purchasing decisions.'
  },
  {
    eyebrow: 'Role Aligned Access',
    title: 'Coordinate admins, managers, and staff securely.',
    description:
      'Enforce role-based workflows, approvals, and audit-ready actions so teams collaborate safely without losing operational speed.'
  }
]);

const AuthIntroLanding = ({ description = '', onGetStarted = () => {} }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollDirection, setScrollDirection] = useState('down');
  const sectionRefs = useRef([]);
  const previousScrollYRef = useRef(0);

  const introSections = useMemo(() => {
    const sectionDescription = String(description || '').trim();
    if (!sectionDescription) return STORY_SECTIONS;

    return STORY_SECTIONS.map((section, index) =>
      index === 1
        ? {
            ...section,
            description: sectionDescription
          }
        : section
    );
  }, [description]);

  useEffect(() => {
    const resolveActiveIndex = () => {
      if (!sectionRefs.current.length) return;

      const viewportCenter = window.innerHeight / 2;
      let nextIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      sectionRefs.current.forEach((element, index) => {
        if (!element) return;
        const bounds = element.getBoundingClientRect();
        const sectionCenter = bounds.top + bounds.height / 2;
        const distance = Math.abs(sectionCenter - viewportCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          nextIndex = index;
        }
      });

      setActiveIndex((current) =>
        current === nextIndex ? current : nextIndex
      );
    };

    const handleScroll = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      if (currentScrollY !== previousScrollYRef.current) {
        setScrollDirection(
          currentScrollY > previousScrollYRef.current ? 'down' : 'up'
        );
      }
      previousScrollYRef.current = currentScrollY;
      resolveActiveIndex();
    };

    previousScrollYRef.current = window.scrollY || window.pageYOffset || 0;
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', resolveActiveIndex);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resolveActiveIndex);
    };
  }, [introSections]);

  return (
    <main className="auth-landing-experience">
      <section className="auth-landing-stage">
        <div className="auth-landing-stage-orb auth-landing-stage-orb-a" />
        <div className="auth-landing-stage-orb auth-landing-stage-orb-b" />
        <div className="auth-landing-stage-grid" />
        <img
          src="/logo600.png"
          alt="Ledgerly logo"
          className="auth-landing-stage-logo"
          loading="eager"
        />
        <h1 className="auth-landing-stage-title">Ledgerly</h1>
        <div className="auth-landing-stage-pills" aria-hidden="true">
          <span>Inventory Intelligence</span>
          <span>Warehouse Control</span>
          <span>Finance Visibility</span>
        </div>
        <p className="auth-landing-stage-hint">Scroll to explore</p>
      </section>

      <section className="auth-landing-story-rail">
        {introSections.map((section, index) => {
          const alignmentClass =
            index % 2 === 0 ? 'story-align-right' : 'story-align-left';
          const isActive = index === activeIndex;
          const progressClass =
            index < activeIndex
              ? 'story-past'
              : index > activeIndex
                ? 'story-future'
                : '';
          const directionClass =
            scrollDirection === 'up'
              ? 'story-direction-up'
              : 'story-direction-down';

          return (
            <div key={section.title} className="auth-story-step-wrap">
              <article
                className={`auth-story-step ${alignmentClass} ${progressClass} ${isActive ? `story-active ${directionClass}` : ''}`}
                data-index={index}
                ref={(element) => {
                  sectionRefs.current[index] = element;
                }}
              >
                <div className="auth-story-card">
                  <p className="eyebrow">{section.eyebrow}</p>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                  <div className="auth-story-meta" aria-hidden="true">
                    <span className="story-meta-chip">Live events</span>
                    <span className="story-meta-chip">Tenant safe</span>
                    <span className="story-meta-chip">Audit ready</span>
                  </div>
                </div>
                <div className="auth-story-art" aria-hidden="true">
                  <span className="shape-grid" />
                  <span className="shape-square" />
                  <span className="shape-circle" />
                  <span className="shape-triangle" />
                </div>
              </article>
            </div>
          );
        })}

        <section className="auth-landing-cta-zone">
          <div className="auth-landing-cta-core">
            <div className="auth-landing-cta-art" aria-hidden="true">
              <span className="pulse pulse-a" />
              <span className="pulse pulse-b" />
              <span className="pulse pulse-c" />
            </div>
            <Button
              type="button"
              variant="primary"
              className="auth-landing-get-started-btn"
              onClick={onGetStarted}
            >
              Get started
            </Button>
          </div>
          <p className="auth-landing-cta-note">
            Continue to sign in or create your workspace account.
          </p>
        </section>
      </section>
    </main>
  );
};

export default AuthIntroLanding;
