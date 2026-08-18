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

export async function onRequestPost({ request }) {
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

  try {
    const response = await fetch('https://formsubmit.co/ajax/cbed6f9e803a9812699084208ad34129', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': 'https://www.wyattandcoinnovationstudio.com',
        'Referer': 'https://www.wyattandcoinnovationstudio.com/contact'
      },
      body: JSON.stringify({
        name,
        email,
        'Enquiry type': type,
        message,
        _subject: `Wyatt & Co website enquiry — ${type}`,
        _template: 'table',
        _captcha: 'false'
      })
    });

    const result = await response.json().catch(() => ({}));
    const succeeded = result.success === true || result.success === 'true';
    if (!response.ok || !succeeded) {
      console.error('FormSubmit rejected the contact enquiry.', response.status);
      return jsonResponse({ message: result.message || 'The enquiry could not be sent right now.' }, 502);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Contact form relay failed.', error);
    return jsonResponse({ message: 'The enquiry could not be sent right now.' }, 502);
  }
}

export function onRequest() {
  return jsonResponse({ message: 'Method not allowed.' }, 405);
}
