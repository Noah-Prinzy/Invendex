const PageGuide = ({
  eyebrow = 'Quick guide',
  title,
  description,
  tips = [],
  className = ''
}) => {
  const classes = `page-guide-card ${className}`.trim();

  return (
    <article className={classes}>
      <div className="page-guide-copy">
        {eyebrow ? <p className="page-guide-eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {Array.isArray(tips) && tips.length ? (
        <div className="page-guide-list" aria-label={`${title} quick tips`}>
          {tips.map((tip, index) => (
            <article
              key={`${String(tip?.label || 'tip')}-${index}`}
              className="page-guide-tip"
            >
              <p className="page-guide-tip-label">
                {tip?.label || `Tip ${index + 1}`}
              </p>
              <p className="page-guide-tip-text">{tip?.text || ''}</p>
            </article>
          ))}
        </div>
      ) : null}
    </article>
  );
};

export const SectionHint = ({ children, className = '' }) => {
  const classes = `section-context-tip ${className}`.trim();
  return <p className={classes}>{children}</p>;
};

export default PageGuide;
