// Configure upstream CyberChef before its operations list or recipe is loaded.
// CSP independently prevents remote requests, including from imported recipes.
document.addEventListener('appstart', () => {
  const blocked = new Set(['HTTP request', 'DNS over HTTPS', 'Show on map', 'RSA Verify']);
  const app = window.app;
  if (!app || !app.operations || !Array.isArray(app.categories)) throw new Error('CyberChef configuration drift');
  for (const name of blocked) delete app.operations[name];
  for (const category of app.categories) category.ops = category.ops.filter(name => !blocked.has(name));
  // Input must not be copied to the address bar by default. Visitors can still
  // explicitly export/share recipes and must check what their URLs contain.
  app.doptions.updateUrl = false;
  app.options.updateUrl = false;
}, { once: true });
