import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const getFallbackSpotlight = () => {
  if (typeof window === 'undefined') {
    return {
      top: 120,
      left: 56,
      width: 640,
      height: 200
    };
  }

  return {
    top: Math.max(window.innerHeight * 0.24, 120),
    left: Math.max(window.innerWidth * 0.2, 56),
    width: Math.min(window.innerWidth * 0.6, 720),
    height: Math.min(window.innerHeight * 0.24, 220)
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const SCROLL_LOCK_KEYS = new Set([
  ' ',
  'Spacebar',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown'
]);

const resolveSpotlightRect = (selector) => {
  if (typeof window === 'undefined') return getFallbackSpotlight();
  if (!selector) return getFallbackSpotlight();

  const target = document.querySelector(selector);
  if (!target) return getFallbackSpotlight();

  const rect = target.getBoundingClientRect();
  if (!Number.isFinite(rect?.width) || !Number.isFinite(rect?.height)) {
    return getFallbackSpotlight();
  }

  const padding = 10;
  return {
    top: clamp(rect.top - padding, 12, window.innerHeight - 60),
    left: clamp(rect.left - padding, 12, window.innerWidth - 60),
    width: clamp(rect.width + padding * 2, 120, window.innerWidth - 24),
    height: clamp(rect.height + padding * 2, 64, window.innerHeight - 24)
  };
};

const resolvePopoverStyle = (rect) => {
  if (typeof window === 'undefined') {
    return {
      top: '18vh',
      left: '50%',
      transform: 'translateX(-50%)',
      maxHeight: 'calc(100vh - 32px)'
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontalPadding = 16;
  const verticalPadding = 16;
  const gap = 18;
  const popoverWidth = Math.min(400, viewportWidth - horizontalPadding * 2);
  const belowTop = rect.top + rect.height + gap;
  const belowSpace = viewportHeight - belowTop - verticalPadding;
  const aboveSpace = rect.top - gap - verticalPadding;
  const centeredLeft = rect.left + rect.width / 2 - popoverWidth / 2;
  const left = Math.round(
    clamp(centeredLeft, horizontalPadding, viewportWidth - popoverWidth - horizontalPadding)
  );

  if (belowSpace >= 220 || belowSpace >= aboveSpace) {
    return {
      top: `${Math.round(Math.max(verticalPadding, belowTop))}px`,
      left: `${left}px`,
      width: `${Math.round(popoverWidth)}px`,
      maxHeight: `${Math.round(
        Math.max(220, viewportHeight - Math.max(verticalPadding, belowTop) - verticalPadding)
      )}px`
    };
  }

  return {
    top: `${verticalPadding}px`,
    left: `${left}px`,
    width: `${Math.round(popoverWidth)}px`,
    maxHeight: `${Math.round(Math.max(220, aboveSpace))}px`
  };
};

const BeginnerTutorial = ({
  steps = [],
  currentIndex = 0,
  onNext = () => {},
  onPrevious = () => {},
  onSkip = () => {}
}) => {
  const [spotlightRect, setSpotlightRect] = useState(
    typeof window === 'undefined' ? null : getFallbackSpotlight()
  );
  const step = steps[currentIndex] || null;

  useEffect(() => {
    if (typeof window === 'undefined' || !step) return undefined;

    let frameId = null;
    let attempts = 0;
    let cancelled = false;
    let hasScrolledToTarget = false;

    const syncTarget = () => {
      if (cancelled) return;
      const target = step.selector ? document.querySelector(step.selector) : null;
      if (
        target &&
        !hasScrolledToTarget &&
        typeof target.scrollIntoView === 'function'
      ) {
        target.scrollIntoView({
          block: 'center',
          inline: 'nearest',
          behavior: 'smooth'
        });
        hasScrolledToTarget = true;
      }

      setSpotlightRect(resolveSpotlightRect(step.selector));

      attempts += 1;
      if (attempts < 24) {
        frameId = window.requestAnimationFrame(syncTarget);
      }
    };

    syncTarget();

    const handleResize = () => {
      setSpotlightRect(resolveSpotlightRect(step.selector));
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      cancelled = true;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [step]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !step) {
      return undefined;
    }

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    const preventScrollKeys = (event) => {
      if (!SCROLL_LOCK_KEYS.has(event.key)) return;
      event.preventDefault();
    };

    window.addEventListener('keydown', preventScrollKeys, { passive: false });

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', preventScrollKeys);
    };
  }, [step]);

  const popoverStyle = useMemo(
    () => resolvePopoverStyle(spotlightRect || getFallbackSpotlight()),
    [spotlightRect]
  );
  const stepAnimationKey = String(step?.id || currentIndex || 'tutorial-step');
  const showSkipAction = step?.showSkipAction === true;

  if (!step || !spotlightRect) return null;

  const isLastStep = currentIndex >= steps.length - 1;
  const overlay = (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="tutorial-backdrop"
        onClick={onNext}
        aria-label="Continue tutorial"
      />
      <div
        key={`${stepAnimationKey}-spotlight`}
        className="tutorial-spotlight"
        style={{
          top: `${Math.round(spotlightRect.top)}px`,
          left: `${Math.round(spotlightRect.left)}px`,
          width: `${Math.round(spotlightRect.width)}px`,
          height: `${Math.round(spotlightRect.height)}px`
        }}
        aria-hidden="true"
      />
      <article
        key={`${stepAnimationKey}-popover`}
        className="tutorial-popover"
        style={popoverStyle}
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="tutorial-popover-inner">
          <p className="tutorial-progress">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <h3>{step.title}</h3>
          <p className="tutorial-description">{step.description}</p>
          {Array.isArray(step.tips) && step.tips.length ? (
            <div className="tutorial-tip-list">
              {step.tips.map((tip, index) => (
                <article
                  key={`${String(tip?.label || 'tip')}-${index}`}
                  className="tutorial-tip-card"
                >
                  <p className="tutorial-tip-label">
                    {tip?.label || `Tip ${index + 1}`}
                  </p>
                  <p className="tutorial-tip-text">{tip?.text || ''}</p>
                </article>
              ))}
            </div>
          ) : null}
          <p className="tutorial-footnote">
            Click anywhere outside this box to continue.
          </p>
          <div className="tutorial-actions">
            {showSkipAction ? (
              <button type="button" className="btn-ghost" onClick={onSkip}>
                Skip tutorial
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            <div className="tutorial-actions-right">
              <button
                type="button"
                className="btn-ghost"
                onClick={onPrevious}
                disabled={currentIndex === 0}
              >
                Previous
              </button>
              <button type="button" className="btn-primary" onClick={onNext}>
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );

  if (typeof document === 'undefined' || !document.body) {
    return overlay;
  }

  return createPortal(overlay, document.body);
};

export default BeginnerTutorial;
