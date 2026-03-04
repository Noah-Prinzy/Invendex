const RequireOrganization = ({
  hasOrganization = false,
  fallback = null,
  children
}) => (hasOrganization ? children : fallback);

export default RequireOrganization;
