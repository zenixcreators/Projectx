const sidebar = document.getElementById('sidebar');

if (sidebar) {
  document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

function switchView(btn) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');

  const targetId = btn.getAttribute('data-target');
  if (!targetId) return;

  document.getElementById('current-view-title').innerText = btn.getAttribute('data-title') || '';
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));

  const target = document.getElementById(targetId);
  if (target) target.classList.add('active');
}

function autoResize(el) {
  el.style.height = 'auto';
  const newHeight = Math.min(el.scrollHeight, 200);
  el.style.height = newHeight + 'px';
  el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
}
