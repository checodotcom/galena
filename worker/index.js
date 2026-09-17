// Worker de Galena: sirve ./dist y atiende el formulario de contacto.
// Lo que coincide con un archivo estático lo sirve Cloudflare directo, sin
// pasar por aquí; este script solo recibe el resto.
import { EmailMessage } from 'cloudflare:email';

const FROM = 'formulario@galena.agency';
const MAX = { name: 120, email: 200, message: 5000 };
// Sin espacios, saltos de línea ni < > ": seguro para usarlo en Reply-To.
const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return handleContact(request, env);
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // La isla pide JSON. Un envío sin JS (formulario nativo) recibe texto plano.
  const wantsJson = request.headers.get('Accept')?.includes('application/json');
  const reply = (ok, status) =>
    wantsJson
      ? Response.json({ ok }, { status })
      : new Response(ok ? 'Mensaje enviado.' : 'No se pudo enviar el mensaje.', {
          status,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

  let data;
  try {
    data = await request.formData();
  } catch {
    return reply(false, 400);
  }

  const field = (key) => String(data.get(key) ?? '').trim();
  const name = field('name');
  const email = field('email');
  const message = field('message');

  // Campo trampa: solo un bot lo llena. Se le responde éxito sin enviar nada.
  // Los registros nunca incluyen nombre, correo ni mensaje.
  if (field('website')) {
    console.log('contact: campo trampa lleno, no se envía');
    return reply(true, 200);
  }

  const valid =
    name.length > 0 && name.length <= MAX.name &&
    email.length <= MAX.email && EMAIL_PATTERN.test(email) &&
    message.length > 0 && message.length <= MAX.message;
  if (!valid) {
    console.log('contact: datos inválidos');
    return reply(false, 400);
  }

  try {
    const raw = buildMessage({ to: env.CONTACT_TO, name, email, message });
    const result = await env.CONTACT_EMAIL.send(new EmailMessage(FROM, env.CONTACT_TO, raw));
    console.log('contact: send() aceptado', JSON.stringify(result ?? null));
    return reply(true, 200);
  } catch (error) {
    console.error('contact: envío fallido', error);
    return reply(false, 502);
  }
}

function buildMessage({ to, name, email, message }) {
  const singleLine = (text) => text.replace(/[\r\n]+/g, ' ');
  const headers = [
    `From: ${encodeWord('Formulario Galena')} <${FROM}>`,
    `To: <${to}>`,
    `Reply-To: ${encodeWord(singleLine(name))} <${email}>`,
    `Subject: ${encodeWord(`Contacto web: ${singleLine(name)}`)}`,
    `Message-ID: <${crypto.randomUUID()}@galena.agency>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
  ];
  const body = `Nombre: ${name}\nCorreo: ${email}\n\n${message}\n`;
  return `${headers.join('\r\n')}\r\n\r\n${base64(body).replace(/.{76}/g, '$&\r\n')}\r\n`;
}

// RFC 2047: permite acentos y ñ en encabezados sin romper el formato.
const encodeWord = (text) => `=?UTF-8?B?${base64(text)}?=`;

function base64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
