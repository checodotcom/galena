// Envío de los formularios de contacto (diálogo y página /contacto): errores
// junto a cada campo, estados del botón Enviar (enviando → palomita) y el
// mensaje final. Lo importan las islas ContactDialog.astro y ContactPage.astro.

const MIN_LOADING_MS = 2000;
const CONTACT_EMAIL = 'hola@galena.agency';
const MESSAGES = {
  idle: '',
  sending: 'Enviando…',
  sent: 'Mensaje enviado.',
};

export function enhanceContactForm(form) {
  const fields = form.querySelector('.contact-form__fields');
  const status = form.querySelector('.contact-form__status');
  const send = form.querySelector('.send');
  // Todo lo que se llena, incluida la casilla de privacidad, que vive fuera
  // del <fieldset> (en el pie, junto a Enviar).
  const controls = [...form.querySelectorAll('input, select, textarea')].filter(
    (control) => control.name !== 'website',
  );

  // Con JS, los errores se muestran junto a cada campo (CSS) en lugar del globo
  // del navegador. Sin JS esta línea no corre y la validación nativa sigue.
  form.noValidate = true;

  // El mensaje de error solo se asocia al campo mientras se ve: si no, un
  // lector de pantalla lo leería en cada foco aunque el campo esté bien.
  for (const control of controls) {
    const errorId = control.getAttribute('aria-describedby');
    if (!errorId) continue;
    control.dataset.errorId = errorId;
    control.removeAttribute('aria-describedby');
  }

  // Mismo criterio que el CSS: el error se muestra si la persona ya tocó el
  // campo (:user-invalid) o si ya intentó enviar (data-checked).
  const syncInvalid = (control) => {
    const shown =
      !control.validity.valid &&
      (control.matches(':user-invalid') || 'checked' in form.dataset);
    if (shown) {
      control.setAttribute('aria-invalid', 'true');
      if (control.dataset.errorId) {
        control.setAttribute('aria-describedby', control.dataset.errorId);
      }
    } else {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  };

  // `required` acepta un campo con puros espacios, pero el Worker lo recorta
  // y lo rechaza: se marca inválido aquí para mostrar el error del campo y
  // no el genérico "No se pudo enviar".
  const checkBlank = (control) => {
    if (!control.required || !('value' in control) || control.type === 'checkbox') return;
    const blank = control.value.length > 0 && control.value.trim() === '';
    control.setCustomValidity(blank ? 'Solo espacios' : '');
  };

  const syncAll = () => controls.forEach(syncInvalid);
  // Los eventos también llegan desde enlaces y botones; solo cuentan campos.
  const syncFromEvent = (event) => {
    if (!controls.includes(event.target)) return;
    checkBlank(event.target);
    syncInvalid(event.target);
  };
  form.addEventListener('input', syncFromEvent);
  form.addEventListener('change', syncFromEvent);
  form.addEventListener('focusout', syncFromEvent);

  const setState = (state) => {
    form.dataset.state = state;
    const locked = state === 'sending' || state === 'sent';
    fields.disabled = locked;
    for (const control of controls) {
      if (!fields.contains(control)) control.disabled = locked;
    }

    if (state === 'error') {
      const link = document.createElement('a');
      link.href = `mailto:${CONTACT_EMAIL}`;
      link.textContent = CONTACT_EMAIL;
      status.replaceChildren('No se pudo enviar. Escríbenos a ', link, '.');
    } else {
      status.textContent = MESSAGES[state];
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.state === 'sending' || form.dataset.state === 'sent') return;

    // Campos sin tocar también muestran su error tras el primer intento.
    controls.forEach(checkBlank);
    if (!form.checkValidity()) {
      form.dataset.checked = '';
      syncAll();
      form.querySelector(':is(input, select, textarea):invalid')?.focus();
      return;
    }

    // Se lee antes de deshabilitar: los campos deshabilitados no se envían.
    const body = new FormData(form);
    // Al enviar con Enter el foco está en un campo que se va a deshabilitar;
    // se pasa a Enviar para que no caiga fuera del diálogo.
    send.focus();
    setState('sending');

    const minimumWait = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
    let ok = false;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
      });
      ok = response.ok && (await response.json()).ok === true;
    } catch {
      ok = false;
    }

    await minimumWait;
    setState(ok ? 'sent' : 'error');
    if (ok) form.dispatchEvent(new CustomEvent('contact:sent'));
  });

  // Deja el formulario listo para otro mensaje. `message` conserva un aviso
  // en el estado (la página muestra "Mensaje enviado." tras reiniciarse).
  const reset = ({ message = '' } = {}) => {
    form.reset();
    delete form.dataset.checked;
    controls.forEach(checkBlank);
    setState('idle');
    status.textContent = message;
    syncAll();
  };

  // Quita un error de envío sin borrar lo escrito (al cerrar el diálogo).
  const clearError = () => {
    if (form.dataset.state === 'error') setState('idle');
  };

  return { reset, clearError };
}
