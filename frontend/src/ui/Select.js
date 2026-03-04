const Select = ({
  id,
  label = '',
  options = [],
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const selectNode = (
    <select id={id} className={className} {...props}>
      {options.map((option) => (
        <option key={String(option.value)} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label) return selectNode;

  return (
    <label htmlFor={id} className={wrapperClassName}>
      {label}
      {selectNode}
    </label>
  );
};

export default Select;
