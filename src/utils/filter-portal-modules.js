const toModuleKey = (name) =>
  String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * Filter project portal tree by permission_master.modules (Role Master).
 * Parent shown if it has view OR any child has view.
 */
const filterPortalModulesByPermission = (modules = [], permissionModules = {}) => {
  if (!permissionModules || typeof permissionModules !== 'object') {
    return [];
  }

  const hasView = (key) => permissionModules[key]?.view === true;

  return modules
    .map((parent) => {
      const parentKey = toModuleKey(parent.name);
      const children = (parent.children ?? []).filter((child) => {
        const childKey = `${parentKey}_${toModuleKey(child.name)}`;
        return hasView(childKey);
      });

      if (children.length > 0) {
        return { ...parent, children };
      }

      if (hasView(parentKey)) {
        return { ...parent, children: [] };
      }

      return null;
    })
    .filter(Boolean);
};

module.exports = {
  toModuleKey,
  filterPortalModulesByPermission,
};
