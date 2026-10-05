export function returnToDashboard(navigation, role) {
  let root = navigation;
  while (root.getParent?.()) root = root.getParent();
  const name = role === 'SUPERADMIN' ? 'SuperAdmin' : role === 'ADMIN' ? 'Admin' : role === 'LGU' ? 'LGU' : 'User';
  const screen = role === 'SUPERADMIN' ? 'SuperAdminDashboard' : role === 'ADMIN' ? 'AdminDashboard' : 'Home';
  root.reset({ index: 0, routes: [{ name, ...(name !== 'LGU' ? { params: { screen } } : {}) }] });
}
