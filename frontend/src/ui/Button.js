const Button = ({
  variant = 'ghost',
  className = '',
  type = 'button',
  children,
  ...props
}) => {
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost';
  const classes = `${variantClass} ${className}`.trim();

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
};

export default Button;
