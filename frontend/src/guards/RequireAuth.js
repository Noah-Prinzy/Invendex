const RequireAuth = ({ isAuthenticated = false, fallback = null, children }) =>
  isAuthenticated ? children : fallback;

export default RequireAuth;
