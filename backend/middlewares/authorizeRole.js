// Role-based access middleware
const authorizeRole = (allowedRoles = []) => {
  // Normalize allowedRoles to array of lowercase strings
  const normalizedAllowed = (Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles]
  )
    .filter(Boolean)
    .map(r => String(r).toLowerCase());

  return (req, res, next) => {
    const userRoleRaw = req.user?.role;

    if (!userRoleRaw) {
      return res.status(403).json({ message: 'Access denied: missing role' });
    }

    const userRole = String(userRoleRaw).toLowerCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    next();
  };
};

module.exports = authorizeRole;
