import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.js';

const STORY_SECTIONS = Object.freeze([
  {
    eyebrow: 'Welcome',
    title: 'Welcome to Inventra',
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildDefaultStoryMetrics = (count) =>
  Array.from({ length: count }, () => ({
    visibility: 0,
    phase: 1
  }));

const AuthIntroLanding = ({ description = '', onGetStarted = () => {} }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [storyMetrics, setStoryMetrics] = useState(() =>
    buildDefaultStoryMetrics(STORY_SECTIONS.length)
  );
  const sectionRefs = useRef([]);
  const animationFrameRef = useRef(null);

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
    const measureStoryProgress = () => {
      if (!sectionRefs.current.length) return;

      const viewportHeight = Math.max(window.innerHeight || 0, 1);
      const viewportCenter = viewportHeight / 2;
      // Start fade-in before the card enters viewport and keep a small
      // center "stick" zone where clarity is locked at max.
      const entryRange = viewportHeight * 0.82;
      const stickWindow = viewportHeight * 0.11;

      let nextActiveIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      const nextMetrics = introSections.map((_, index) => {
        const element = sectionRefs.current[index];
        if (!element) {
          return {
            visibility: 0,
            phase: 1
          };
        }
        const bounds = element.getBoundingClientRect();
        const centerOffset = bounds.top + bounds.height / 2 - viewportCenter;
        const absOffset = Math.abs(centerOffset);
        const isInStickZone = absOffset <= stickWindow;
        const phase = isInStickZone
          ? 0
          : clamp(centerOffset / entryRange, -1.2, 1.2);
        const distanceRatio = isInStickZone
          ? 0
          : clamp((absOffset - stickWindow) / (entryRange - stickWindow), 0, 1);
        const visibility = isInStickZone ? 1 : clamp(1 - distanceRatio, 0, 1);

        if (absOffset < closestDistance) {
          closestDistance = absOffset;
          nextActiveIndex = index;
        }

        return {
          visibility: Number(visibility.toFixed(4)),
          phase: Number(phase.toFixed(4))
        };
      });

      setStoryMetrics((current) => {
        let changed = current.length !== nextMetrics.length;
        if (!changed) {
          for (let index = 0; index < nextMetrics.length; index += 1) {
            const nextMetric = nextMetrics[index] || {
              visibility: 0,
              phase: 1
            };
            const currentMetric = current[index] || {
              visibility: 0,
              phase: 1
            };
            if (
              Math.abs(nextMetric.visibility - currentMetric.visibility) >
                0.01 ||
              Math.abs(nextMetric.phase - currentMetric.phase) > 0.01
            ) {
              changed = true;
              break;
            }
          }
        }
        return changed ? nextMetrics : current;
      });

      setActiveIndex((current) =>
        current === nextActiveIndex ? current : nextActiveIndex
      );
    };

    const requestMeasure = () => {
      if (animationFrameRef.current != null) return;
      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        measureStoryProgress();
      });
    };

    const handleScroll = () => {
      requestMeasure();
    };

    requestMeasure();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', requestMeasure);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', requestMeasure);
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [introSections]);

  useEffect(() => {
    setStoryMetrics((current) => {
      if (current.length === introSections.length) return current;
      return buildDefaultStoryMetrics(introSections.length);
    });
  }, [introSections.length]);

  return (
    <main className="auth-landing-experience">
      <section className="auth-landing-stage">
        <div className="auth-landing-stage-orb auth-landing-stage-orb-a" />
        <div className="auth-landing-stage-orb auth-landing-stage-orb-b" />
        <div className="auth-landing-stage-grid" />
        <img
          src="/logo600.png"
          alt="Inventra logo"
          className="auth-landing-stage-logo"
          loading="eager"
        />
        <h1 className="auth-landing-stage-title">Inventra</h1>
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
          const isFirstStoryStep = index === 0;
          const isDecisionSignalsStep = index === 2;
          const isActive = index === activeIndex;
          const metric = storyMetrics[index] || {
            visibility: 0,
            phase: 1
          };
          const progressClass =
            index < activeIndex
              ? 'story-past'
              : index > activeIndex
                ? 'story-future'
                : '';

          return (
            <div
              key={section.title}
              className={`auth-story-step-wrap ${isFirstStoryStep ? 'story-gap-after-stage' : ''} ${isDecisionSignalsStep ? 'story-gap-before-decision' : ''}`}
              ref={(element) => {
                sectionRefs.current[index] = element;
              }}
            >
              <article
                className={`auth-story-step ${alignmentClass} ${progressClass} ${isActive ? 'story-active' : ''}`}
                data-index={index}
                style={{
                  '--story-visibility': String(metric.visibility),
                  '--story-phase': String(metric.phase)
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
