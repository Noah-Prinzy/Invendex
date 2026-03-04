const Card = ({ as = 'article', className = '', children, ...props }) => {
  const Element = as;
  const classes = `data-card ${className}`.trim();
  return (
    <Element className={classes} {...props}>
      {children}
    </Element>
  );
};

export default Card;
