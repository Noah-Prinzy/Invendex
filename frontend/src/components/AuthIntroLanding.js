import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.js';

import '../styles/authIntro.css';

const STORY_SECTIONS = Object.freeze([
  {
    eyebrow: 'Start Here',
    title: 'Welcome to Invendex',
    description:
      'See stock clearly, keep teams aligned, and run daily inventory work from one focused workspace.',
    visualKey: 'overview'
  },
  {
    eyebrow: 'Watch Operations',
    title: 'See what each warehouse is doing now.',
    description:
      'Track stock movement, purchase updates, and warehouse activity in one live control layer built for fast decisions.',
    visualKey: 'operations'
  },
  {
    eyebrow: 'Spot Issues Early',
    title: 'Know what needs attention next.',
    description:
      'Spot low stock, dead stock, and supplier issues early so you can act before they slow the business down.',
    visualKey: 'signals'
  },
  {
    eyebrow: 'Work By Role',
    title: 'Give each person the right level of control.',
    description:
      'Admins lead the operation, managers coordinate work, and staff handle daily tasks with clear permission boundaries.',
    visualKey: 'roles'
  }
]);

const AuthIntroLanding = ({
  description = '',
  onGetStarted = () => {},
  skipStoryScreen = false
}) => {
  const [hasRevealedContinuePrompt, setHasRevealedContinuePrompt] =
    useState(false);
  const [showStoryScreen, setShowStoryScreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef([]);

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
    if (!showStoryScreen) return undefined;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio
          );

        if (!visibleEntries.length) return;

        const nextIndex = Number(
          visibleEntries[0].target.getAttribute('data-story-index') || 0
        );
        setActiveIndex((current) =>
          current === nextIndex ? current : nextIndex
        );
      },
      {
        threshold: [0.25, 0.4, 0.55, 0.72],
        rootMargin: '-12% 0px -18% 0px'
      }
    );

    sectionRefs.current.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [introSections.length, showStoryScreen]);

  useEffect(() => {
    if (
      !showStoryScreen ||
      typeof window === 'undefined' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [showStoryScreen]);

  const handleRevealContinuePrompt = () => {
    if (hasRevealedContinuePrompt) return;
    setHasRevealedContinuePrompt(true);
  };

  const handleContinueToStory = (event) => {
    event.stopPropagation();
    if (skipStoryScreen) {
      onGetStarted();
      return;
    }
    setActiveIndex(0);
    setShowStoryScreen(true);
  };

  return (
    <main className="auth-landing-experience">
      {!showStoryScreen ? (
        <section
          className="auth-landing-stage auth-landing-stage-interactive"
          role="button"
          tabIndex={0}
          aria-label="Intro landing screen"
          onClick={handleRevealContinuePrompt}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleRevealContinuePrompt();
            }
          }}
        >
          <div className="auth-landing-stage-orb auth-landing-stage-orb-a" />
          <div className="auth-landing-stage-orb auth-landing-stage-orb-b" />
          <div className="auth-landing-stage-grid" />
          <img
            src="/logo600.png"
            alt="Invendex logo"
            className="auth-landing-stage-logo"
            loading="eager"
          />
          <h1 className="auth-landing-stage-title">Invendex</h1>
          <div className="auth-landing-stage-pills" aria-hidden="true">
            <span>Inventory Intelligence</span>
            <span>Warehouse Control</span>
            <span>Finance Visibility</span>
          </div>
          <button
            type="button"
            className={`auth-landing-stage-continue ${
              hasRevealedContinuePrompt ? 'is-visible' : ''
            }`}
            onClick={handleContinueToStory}
          >
            Tap to Continue
          </button>
        </section>
      ) : (
        <section className="auth-storyscape" aria-label="Invendex introduction">
          <div className="auth-storyscape-bg" aria-hidden="true">
            <span className="storyscape-grid" />
            <span className="storyscape-wave wave-a" />
            <span className="storyscape-wave wave-b" />
            <span className="storyscape-wave wave-c" />
            <span className="storyscape-glow glow-a" />
            <span className="storyscape-glow glow-b" />
            <span className="storyscape-dots" />
          </div>
          <div className="auth-storyscape-inner">
            {introSections.map((section, index) => {
              const alignmentClass =
                index % 2 === 0 ? 'story-align-right' : 'story-align-left';
              const isActive = index === activeIndex;
              const stepNumber = String(index + 1).padStart(2, '0');

              return (
                <section
                  key={section.title}
                  className={`auth-storyscape-section ${alignmentClass} ${
                    isActive ? 'is-active' : ''
                  }`}
                  data-story-index={index}
                  ref={(element) => {
                    sectionRefs.current[index] = element;
                  }}
                >
                  <div className="auth-storyscape-rail" aria-hidden="true">
                    <span className="auth-storyscape-node" />
                    {index < introSections.length - 1 ? (
                      <span className="auth-storyscape-line" />
                    ) : null}
                  </div>
                  <article
                    className={`auth-storyscape-panel panel-${section.visualKey}`}
                  >
                    <div
                      className="auth-storyscape-copy"
                      data-step={stepNumber}
                    >
                      <p className="eyebrow">{section.eyebrow}</p>
                      <p className="auth-storyscape-step">{stepNumber}</p>
                      <h2>{section.title}</h2>
                      <p>{section.description}</p>
                      <div className="auth-storyscape-meta" aria-hidden="true">
                        <span className="story-meta-chip">Live control</span>
                        <span className="story-meta-chip">Audit ready</span>
                      </div>
                    </div>
                    <div
                      className={`auth-storyscape-visual visual-${section.visualKey}`}
                      aria-hidden="true"
                    >
                      <span className="visual-grid" />
                      <span className="visual-panel" />
                      <span className="visual-ring" />
                      <span className="visual-marker" />
                      <span className="visual-beacon" />
                      <span className="visual-slab visual-slab-a" />
                      <span className="visual-slab visual-slab-b" />
                      <span className="visual-pillar pillar-a" />
                      <span className="visual-pillar pillar-b" />
                    </div>
                  </article>
                </section>
              );
            })}

            <section className="auth-storyscape-cta">
              <div className="auth-storyscape-cta-shell">
                <div className="auth-storyscape-cta-art" aria-hidden="true">
                  <span className="pulse pulse-a" />
                  <span className="pulse pulse-b" />
                  <span className="pulse pulse-c" />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="auth-storyscape-get-started-btn"
                  onClick={onGetStarted}
                >
                  Continue
                </Button>
              </div>
              <p className="auth-storyscape-cta-note">
                Sign in or create your workspace account.
              </p>
            </section>
          </div>
        </section>
      )}
    </main>
  );
};

export default AuthIntroLanding;
