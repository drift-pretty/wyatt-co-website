const ALLOWED_ORIGINS = new Set([
  'https://wyattandcoinnovationstudio.com',
  'https://www.wyattandcoinnovationstudio.com'
]);

const ENQUIRY_TYPES = new Set([
  'General enquiry',
  'App enquiry',
  'Patent licensing',
  'Partnership',
  'Media'
]);

const jsonResponse = (body, status = 200) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  }
});

const clean = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const escapeHtml = value => value.replace(/[&<>'"]/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
})[character]);

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ message: 'This form can only be submitted from the Wyatt & Co website.' }, 403);
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (contentLength > 25000) {
    return jsonResponse({ message: 'The enquiry is too large.' }, 413);
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ message: 'The enquiry could not be read.' }, 400);
  }

  if (clean(data.company, 200)) {
    return jsonResponse({ success: true });
  }

  const name = clean(data.name, 100);
  const email = clean(data.email, 254).toLowerCase();
  const type = clean(data.type, 50);
  const message = clean(data.message, 5000);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (name.length < 2 || !emailPattern.test(email) || !ENQUIRY_TYPES.has(type) || message.length < 10) {
    return jsonResponse({ message: 'Please check your name, email, enquiry type and message.' }, 400);
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_EMAIL_TOKEN) {
    console.error('Contact form email configuration is missing.');
    return jsonResponse({ message: 'The enquiry service is temporarily unavailable.' }, 503);
  }

  const text = [
    'New Wyatt & Co website enquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Enquiry type: ${type}`,
    '',
    'Message:',
    message
  ].join('\n');

  const html = `
    <h2>New Wyatt &amp; Co website enquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Enquiry type:</strong> ${escapeHtml(type)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CLOUDFLARE_EMAIL_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'ally@wyattandcoinnovationstudio.com',
          from: {
            address: 'website@wyattandcoinnovationstudio.com',
            name: 'Wyatt & Co Website'
          },
          reply_to: email,
          subject: `Website enquiry — ${type}`,
          text,
          html
        })
      }
    );

    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
      console.error('Cloudflare Email Service rejected the contact enquiry.', response.status, result.errors || []);
      return jsonResponse({ message: 'The enquiry could not be sent right now.' }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Contact form email request failed.', error);
    return jsonResponse({ message: 'The enquiry could not be sent right now.' }, 502);
  }
}

export function onRequest() {
  return jsonResponse({ message: 'Method not allowed.' }, 405);
}
