
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});
document.querySelectorAll('.site-nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', async event => {
  event.preventDefault();

  if (!contactForm.reportValidity()) return;

  const button = contactForm.querySelector('button[type="submit"]');
  const status = document.getElementById('contactStatus');
  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  button.disabled = true;
  button.textContent = 'Sending…';
  status.className = 'form-status';
  status.textContent = 'Sending your enquiry…';

  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Your enquiry could not be sent.');
    }

    contactForm.reset();
    status.className = 'form-status success';
    status.textContent = 'Thank you — your enquiry has been sent successfully.';
  } catch (error) {
    status.className = 'form-status error';
    status.textContent = `${error.message} Please try again or email ally@wyattandcoinnovationstudio.com.`;
  } finally {
    button.disabled = false;
    button.textContent = 'Send enquiry';
  }
});
