const Table = ({ className = '', children }) => (
  <div className={`table-wrap ${className}`.trim()}>
    <table className="data-table">{children}</table>
  </div>
);

export default Table;
