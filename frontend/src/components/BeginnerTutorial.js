import { useEffect, useMemo, useRef, useState } from 'react';
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const safeQuerySelector = (selector) => {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    // Ignore invalid selectors rather than crashing the tutorial.
    return null;
  }
};

const resolveSpotlightRect = (selector) => {
  if (typeof window === 'undefined') return getFallbackSpotlight();
  if (!selector) return null;

  const target = safeQuerySelector(selector);
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
  const popoverRef = useRef(null);
  const headingId = 'tutorial-step-heading';
  const descriptionId = 'tutorial-step-description';

  const step = steps[currentIndex] || null;
  const shouldSpotlight = Boolean(String(step?.selector || '').trim());
  const isLastStep = currentIndex >= steps.length - 1;
  const showSkipAction = step?.showSkipAction === true;

  // Track the target element and keep the spotlight synced to it.
  useEffect(() => {
    if (typeof window === 'undefined' || !step) return undefined;

    let frameId = null;
    let attempts = 0;
    let cancelled = false;
    let hasScrolledToTarget = false;

    const syncTarget = () => {
      if (cancelled) return;
      const target = shouldSpotlight ? safeQuerySelector(step.selector) : null;
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
  }, [shouldSpotlight, step]);

  // Lock page scrolling while the tutorial is active.
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
      // Let the person scroll inside the popover itself if it has overflow.
      if (popoverRef.current?.contains(document.activeElement)) return;
      event.preventDefault();
    };

    window.addEventListener('keydown', preventScrollKeys, { passive: false });

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', preventScrollKeys);
    };
  }, [step]);

  // Keyboard navigation: Escape to skip/close, arrows to move between steps,
  // and a focus trap so Tab stays inside the popover.
  useEffect(() => {
    if (typeof window === 'undefined' || !step) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (showSkipAction) {
          onSkip();
        } else if (!isLastStep) {
          onNext();
        }
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        const target = event.target;
        const isInteractiveElement =
          target?.tagName === 'BUTTON' || target?.tagName === 'A';
        if (event.key === 'Enter' && isInteractiveElement) return;
        event.preventDefault();
        onNext();
        return;
      }

      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        event.preventDefault();
        onPrevious();
        return;
      }

      if (event.key === 'Tab' && popoverRef.current) {
        const focusable = Array.from(
          popoverRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentIndex, isLastStep, showSkipAction, onNext, onPrevious, onSkip]);

  // Move focus into the popover whenever the step changes, so screen reader
  // users and keyboard users land on fresh content automatically.
  useEffect(() => {
    if (!step || !popoverRef.current) return;
    const frameId = window.requestAnimationFrame(() => {
      const primaryButton = popoverRef.current?.querySelector('.btn-primary');
      (primaryButton || popoverRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [step]);

  const popoverStyle = useMemo(() => {
    if (!shouldSpotlight) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(440px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 32px)'
      };
    }

    return resolvePopoverStyle(spotlightRect || getFallbackSpotlight());
  }, [shouldSpotlight, spotlightRect]);

  const stepAnimationKey = String(step?.id || currentIndex || 'tutorial-step');

  if (!step) return null;

  const overlay = (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <button
        type="button"
        className="tutorial-backdrop"
        onClick={onNext}
        aria-label="Continue tutorial"
      />
      {shouldSpotlight && spotlightRect ? (
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
      ) : null}
      <article
        key={`${stepAnimationKey}-popover`}
        ref={popoverRef}
        className="tutorial-popover"
        style={popoverStyle}
        tabIndex={-1}
        aria-describedby={descriptionId}
        onClick={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="tutorial-popover-inner">
          <p className="tutorial-progress" aria-live="polite">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <h3 id={headingId}>{step.title}</h3>
          <p id={descriptionId} className="tutorial-description">
            {step.description}
          </p>
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
            Click anywhere outside this box, or press Enter, to continue.
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