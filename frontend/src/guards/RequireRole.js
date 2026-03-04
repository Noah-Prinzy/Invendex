const normalizeSet = (roles = []) =>
  new Set(
    Array.isArray(roles)
      ? roles.map((role) =>
          String(role || '')
            .trim()
            .toLowerCase()
        )
      : []
  );

const RequireRole = ({
  role = null,
  allowedRoles = [],
  fallback = null,
  children
}) => {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  const allowed = normalizeSet(allowedRoles);
  if (!allowed.size || allowed.has(normalizedRole)) {
    return children;
  }
  return fallback;
};

export default RequireRole;
