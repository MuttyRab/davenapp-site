// Daven · davenapp.com — shared behavior for every page.

// Reveal-on-scroll: elements marked .rise fade up once, 240ms, ease-out.
(function reveals() {
  const items = document.querySelectorAll('.rise');
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
  // The hero plays immediately on load, not on scroll.
  requestAnimationFrame(() => document.querySelectorAll('.hero .rise').forEach((el) => el.classList.add('in')));
})();

// Footer year.
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

// Contact form → the Daven contact endpoint. The message is emailed to the
// developer; replies go to the address the sender enters.
(function contact() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const ENDPOINT = 'https://rmzhcaofizqyjvfunfiy.supabase.co/functions/v1/contact';
  const chips = form.querySelectorAll('.chip');
  let kind = 'suggestion';
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      kind = chip.dataset.kind;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    });
  });

  const errorEl = form.querySelector('.form__error');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorEl.textContent = 'Enter the email address you want a reply at.'; form.email.focus(); return; }
    if (message.length < 10) { errorEl.textContent = 'Add a little more detail so we can help.'; form.message.focus(); return; }
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, email, message, website: form.website.value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'The message could not be sent right now — please try again shortly.');
      form.hidden = true;
      document.getElementById('contact-success').hidden = false;
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'The message could not be sent right now — please try again shortly.';
      button.disabled = false;
      button.textContent = 'Send message';
    }
  });
})();
