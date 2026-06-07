async function loadFeaturePartials() {
  const slots = [...document.querySelectorAll('[data-partial]')];

  await Promise.all(slots.map(async slot => {
    const url = slot.getAttribute('data-partial');
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Could not load ${url}`);
    }

    slot.outerHTML = await response.text();
  }));

  document.dispatchEvent(new CustomEvent('creo:partials-loaded'));
}

loadFeaturePartials().catch(error => {
  console.error(error);
  const workspace = document.querySelector('.workspace');
  if (workspace) {
    workspace.innerHTML = '<div style="padding:32px;color:#dc2626;">Could not load feature views.</div>';
  }
});
