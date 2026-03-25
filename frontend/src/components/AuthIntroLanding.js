import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.js';

import '../styles/authIntro.css';

const STORY_SECTIONS = Object.freeze([
  {
    eyebrow: 'Operational Visibility',
    title: 'Start with one clear view of the business.',
    description:
      'Bring inventory, purchasing, and finance into one operating view so decisions are based on the same live numbers.',
    highlights: ['Shared visibility', 'Live inventory'],
    visualKey: 'overview'
  },
  {
    eyebrow: 'Warehouse Activity',
    title: 'Follow movement across warehouses in real time.',
    description:
      'Track receipts, transfers, and purchase-order progress with a workspace designed for fast operational follow-through.',
    highlights: ['Movement tracking', 'Purchase flow'],
    visualKey: 'operations'
  },
  {
    eyebrow: 'Decision Signals',
    title: 'Spot risk before it slows the operation.',
    description:
      'Surface low stock, stagnant inventory, and supplier pressure early so teams can respond before service or cash flow is affected.',
    highlights: ['Early alerts', 'Inventory health'],
    visualKey: 'signals'
  },
  {
    eyebrow: 'Role Control',
    title: 'Give every team member the right level of access.',
    description:
      'Keep leadership, managers, and frontline staff aligned with permissions that match responsibility and protect critical workflows.',
    highlights: ['Structured access', 'Safer workflows'],
    visualKey: 'roles'
  }
]);

const AuthIntroLanding = ({
  eyebrow = '',
  title = 'Welcome to Invendex',
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

  const stageDescription =
    String(description || '').trim() ||
    'Inventory, purchasing, and finance in one focused workspace.';
  const stageEyebrow = String(eyebrow || '').trim();

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

  const handleJumpToStorySection = (index) => {
    setActiveIndex(index);

    const targetSection = sectionRefs.current[index];
    if (!targetSection || typeof targetSection.scrollIntoView !== 'function') {
      return;
    }

    targetSection.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
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
          <div className="auth-landing-stage-shell">
            <div className="auth-landing-stage-brand">
              <div className="auth-landing-stage-logo-wrap" aria-hidden="true">
                <span className="auth-landing-stage-logo-glow" />
                <img
                  src="/logo600.png"
                  alt="Invendex logo"
                  className="auth-landing-stage-logo"
                  loading="eager"
                />
              </div>
              <div className="auth-landing-stage-copy">
                {stageEyebrow ? (
                  <p className="auth-landing-stage-eyebrow">{stageEyebrow}</p>
                ) : null}
                <h1 className="auth-landing-stage-title">{title}</h1>
                <p className="auth-landing-stage-description">
                  {stageDescription}
                </p>
              </div>
            </div>
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
          </div>
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
            <header className="auth-storyscape-overview">
              <div className="auth-storyscape-overview-copy">
                <p className="auth-storyscape-overview-eyebrow">
                  Platform Tour
                </p>
                <h2 className="auth-storyscape-overview-title">
                  See how Invendex keeps inventory, purchasing, and finance
                  aligned.
                </h2>
                <p className="auth-storyscape-overview-description">
                  A quick walkthrough of how the workspace is structured, what
                  it surfaces, and how teams stay coordinated inside it.
                </p>
              </div>
              <nav
                className="auth-storyscape-nav"
                aria-label="Introduction sections"
              >
                {introSections.map((section, index) => {
                  const stepNumber = String(index + 1).padStart(2, '0');
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={section.title}
                      type="button"
                      className={`auth-storyscape-nav-item ${
                        isActive ? 'is-active' : ''
                      }`}
                      onClick={() => handleJumpToStorySection(index)}
                    >
                      <span className="auth-storyscape-nav-step">
                        {stepNumber}
                      </span>
                      <span className="auth-storyscape-nav-copy">
                        <span className="auth-storyscape-nav-label">
                          {section.eyebrow}
                        </span>
                        <span className="auth-storyscape-nav-title">
                          {section.title}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </header>
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
                        {section.highlights.map((highlight) => (
                          <span key={highlight} className="story-meta-chip">
                            {highlight}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div
                      className={`auth-storyscape-visual visual-${section.visualKey}`}
                      aria-hidden="true"
                    >
                      <span className="visual-grid" />
                      <span className="visual-header" />
                      <span className="visual-panel" />
                      <span className="visual-ring" />
                      <span className="visual-marker" />
                      <span className="visual-beacon" />
                      <span className="visual-card card-a" />
                      <span className="visual-card card-b" />
                      <span className="visual-card card-c" />
                      <span className="visual-line line-a" />
                      <span className="visual-line line-b" />
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
                <div className="auth-storyscape-cta-content">
                  <div className="auth-storyscape-cta-copy">
                    <p className="auth-storyscape-cta-eyebrow">
                      Ready to Enter Invendex?
                    </p>
                    <h2 className="auth-storyscape-cta-title">
                      Step into the workspace with the same clarity you just
                      explored.
                    </h2>
                    <p className="auth-storyscape-cta-description">
                      Continue to sign in or create your account, then bring
                      inventory, purchasing, and finance into one coordinated
                      operating flow.
                    </p>
                  </div>
                  <div className="auth-storyscape-cta-actions">
                    <div
                      className="auth-storyscape-cta-highlights"
                      aria-hidden="true"
                    >
                      <span>Secure sign-in</span>
                      <span>Role-based access</span>
                      <span>Fast workspace setup</span>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="auth-storyscape-get-started-btn"
                      aria-label="Continue"
                      onClick={onGetStarted}
                    >
                      Continue to Workspace
                    </Button>
                    <p className="auth-storyscape-cta-note">
                      Sign in or create your workspace account.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      )}
    </main>
  );
};

export default AuthIntroLanding;
