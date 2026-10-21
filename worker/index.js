// Worker de Galena: sirve ./dist y atiende el formulario de contacto.
// Lo que coincide con un archivo estático lo sirve Cloudflare directo, sin
// pasar por aquí; este script solo recibe el resto.
import { EmailMessage } from 'cloudflare:email';

const FROM = 'formulario@galena.agency';
const MAX = { name: 120, email: 200, company: 120, message: 5000 };
const PLAN_LABELS = { '01': '01 Inicial', '02': '02 Crecimiento', '03': '03 Élite' };
// Sin espacios, saltos de línea ni < > ": seguro para usarlo en Reply-To.
const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return handleContact(request, env);
    // La página de la agencia se llamaba /galena; ahora es /nosotros.
    if (pathname === '/galena' || pathname === '/galena/') {
      return Response.redirect(new URL('/nosotros/', request.url), 301);
    }
    // La página del formulario se llamaba /contacto.
    if (pathname === '/contacto' || pathname === '/contacto/') {
      return Response.redirect(new URL('/cotizar/', request.url), 301);
    }
    // La página de planes se llamaba /servicios.
    if (pathname === '/servicios' || pathname === '/servicios/') {
      return Response.redirect(new URL('/planes/', request.url), 301);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
  }

  // La isla pide JSON. Un envío sin JS (formulario nativo) vuelve a
  // /cotizar/ con #enviado o #error: la página muestra el aviso con :target,
  // sin JS.
  const wantsJson = request.headers.get('Accept')?.includes('application/json');
  const reply = (ok, status) =>
    wantsJson
      ? Response.json({ ok }, { status })
      : Response.redirect(new URL(ok ? '/cotizar/#enviado' : '/cotizar/#error', request.url), 303);

  let data;
  try {
    data = await request.formData();
  } catch {
    return reply(false, 400);
  }

  // Al enviar, el navegador convierte cada salto de línea en \r\n (2
  // caracteres) aunque maxlength lo contó como 1: se normaliza antes de medir
  // para no rechazar un mensaje que en el formulario sí cabía.
  const field = (key) => String(data.get(key) ?? '').replace(/\r\n/g, '\n').trim();
  const name = field('name');
  const email = field('email');
  const message = field('message');
  const plan = PLAN_LABELS[field('plan')] ?? 'Por definir';
  // Clínica es opcional. La casilla del aviso de privacidad es obligatoria.
  // Los dos formularios (diálogo y /cotizar) envían los mismos campos.
  const company = field('company');
  const privacy = data.has('privacy');

  // Campo trampa: solo un bot lo llena. Se le responde éxito sin enviar nada.
  // Los registros nunca incluyen nombre, correo ni mensaje.
  if (field('website')) {
    console.log('contact: campo trampa lleno, no se envía');
    return reply(true, 200);
  }

  const valid =
    name.length > 0 && name.length <= MAX.name &&
    email.length <= MAX.email && EMAIL_PATTERN.test(email) &&
    company.length <= MAX.company &&
    privacy &&
    message.length > 0 && message.length <= MAX.message;
  if (!valid) {
    console.log('contact: datos inválidos');
    return reply(false, 400);
  }

  try {
    const raw = buildMessage({ to: env.CONTACT_TO, name, email, company, plan, privacy, message });
    const result = await env.CONTACT_EMAIL.send(new EmailMessage(FROM, env.CONTACT_TO, raw));
    console.log('contact: send() aceptado', JSON.stringify(result ?? null));
    return reply(true, 200);
  } catch (error) {
    console.error('contact: envío fallido', error);
    return reply(false, 502);
  }
}

// El correo llega a Galena (no al visitante): texto plano para quien no ve
// HTML y una versión con la marca. Colores de la paleta (--bone, --silver,
// --ink) ya mezclados, porque los clientes de correo no entienden rgba ni
// variables CSS. Urbanist no se puede cargar en un correo: la pila de
// respaldo es sans-serif del sistema.
const MAIL = {
  bone: '#E4DFD6',
  silver: '#C4C0B9',
  ink: '#141414',
  soft: '#52514E', // --ink-soft sobre hueso
  line: '#C7C3BB', // --hairline sobre hueso
  font: "'Urbanist','Helvetica Neue',Helvetica,Arial,sans-serif",
};

const escapeHtml = (text) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function buildHtml({ name, email, company, plan, privacy, message }) {
  const { bone, silver, ink, soft, line, font } = MAIL;
  const label = (text) =>
    `<div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${soft};padding-bottom:6px;">${text}</div>`;
  const row = (title, valueHtml) =>
    `<tr><td style="padding:20px 0;border-top:1px solid ${line};font-family:${font};">${label(title)}<div style="font-size:17px;line-height:1.5;color:${ink};">${valueHtml}</div></td></tr>`;
  const mailto = `mailto:${escapeHtml(email)}?subject=${encodeURIComponent('Tu cotización con Galena')}`;
  const firstName = name.split(/\s+/)[0];
  const rows = [
    row('Correo', `<a href="mailto:${escapeHtml(email)}" style="color:${ink};text-decoration:underline;">${escapeHtml(email)}</a>`),
    company ? row('Clínica', escapeHtml(company)) : '',
    row('Plan', escapeHtml(plan)),
    row('Aviso de privacidad', privacy ? 'Aceptado' : 'No aceptado'),
  ].join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Nueva solicitud de cotización</title>
</head>
<body style="margin:0;padding:0;background:${bone};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(name)} pidió una cotización${company ? ` para ${escapeHtml(company)}` : ''}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bone};">
<tr><td align="center" style="padding:40px 16px 0;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
    <tr><td style="padding-bottom:48px;font-family:${font};font-size:20px;font-weight:200;letter-spacing:0.4em;text-transform:uppercase;color:${ink};">Galena</td></tr>
    <tr><td style="padding-bottom:16px;font-family:${font};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${soft};">Nueva solicitud de cotización</td></tr>
    <tr><td style="padding-bottom:40px;font-family:${font};font-size:36px;font-weight:200;line-height:1.15;letter-spacing:-0.01em;color:${ink};">${escapeHtml(name)}</td></tr>
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
        <tr><td style="padding:20px 0 8px;border-top:1px solid ${line};font-family:${font};">${label('Mensaje')}<div style="font-size:17px;line-height:1.65;color:${ink};white-space:pre-wrap;">${escapeHtml(message).replace(/\n/g, '<br>')}</div></td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:32px 0 56px;">
      <a href="${mailto}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:${ink};color:${bone};font-family:${font};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Responder a ${escapeHtml(firstName)}</a>
    </td></tr>
  </table>
</td></tr>
<tr><td align="center" style="background:${silver};padding:24px 16px;">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;">
    <tr><td style="font-family:${font};font-size:11px;line-height:1.6;letter-spacing:0.12em;text-transform:uppercase;color:${ink};">Enviado desde el formulario de galena.agency. Responde a este correo para contestar directamente.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function buildMessage({ to, name, email, company, plan, privacy, message }) {
  const singleLine = (text) => text.replace(/[\r\n]+/g, ' ');
  const boundary = `galena-${crypto.randomUUID()}`;
  const headers = [
    `From: ${encodeWord('Formulario Galena')} <${FROM}>`,
    `To: <${to}>`,
    `Reply-To: ${encodeWord(singleLine(name))} <${email}>`,
    `Subject: ${encodeWord(`Contacto web: ${singleLine(name)}`)}`,
    `Message-ID: <${crypto.randomUUID()}@galena.agency>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const lines = [`Nombre: ${name}`, `Correo: ${email}`];
  if (company) lines.push(`Clínica: ${company}`);
  lines.push(`Plan: ${plan}`);
  lines.push(`Aviso de privacidad: ${privacy ? 'aceptado' : 'no aceptado'}`);
  const text = `${lines.join('\n')}\n\n${message}\n`;
  const html = buildHtml({ name, email, company, plan, privacy, message });

  const part = (type, content) =>
    `--${boundary}\r\nContent-Type: ${type}; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64(content).replace(/.{76}/g, '$&\r\n')}\r\n`;
  return `${headers.join('\r\n')}\r\n\r\n${part('text/plain', text)}${part('text/html', html)}--${boundary}--\r\n`;
}

// RFC 2047: permite acentos y ñ en encabezados sin romper el formato.
const encodeWord = (text) => `=?UTF-8?B?${base64(text)}?=`;

function base64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
