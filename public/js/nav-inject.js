// Fetch and inject the shared nav fragment, then mark the active link
(async function injectNav(){
  try{
    const res = await fetch('/nav.html');
    if (!res.ok) throw new Error('Nav fetch failed');
    const html = await res.text();
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    placeholder.innerHTML = html;
    const path = location.pathname.replace(/\/+$/, '') || '/';
    const links = document.querySelectorAll('.sidepanel a.link');
    links.forEach(a => { if (a.getAttribute('href') === path) a.classList.add('active'); });
  }catch(e){ console.warn('Failed to load nav fragment', e); }
})();
