const Input = ({
  id,
  label = '',
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const inputNode = <input id={id} className={className} {...props} />;

  if (!label) return inputNode;

  return (
    <label htmlFor={id} className={wrapperClassName}>
      {label}
      {inputNode}
    </label>
  );
};

export default Input;
