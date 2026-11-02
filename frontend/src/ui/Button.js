import { forwardRef } from 'react';

const VARIANT_CLASSES = Object.freeze({
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger'
});

const Button = forwardRef(
  (
    {
      variant = 'ghost',
      size = 'md',
      className = '',
      type = 'button',
      isLoading = false,
      loadingLabel = 'Working...',
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.ghost;
    const classes = [
      variantClass,
      'btn-' + size,
      isLoading ? 'is-loading' : '',
      className
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="btn-spinner" aria-hidden="true" />
            <span>{loadingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
