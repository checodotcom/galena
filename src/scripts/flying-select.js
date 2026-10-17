// Desplegable del campo Plan (diálogo de contacto y /cotizar). Sustituye la
// lista nativa, que no se puede estilizar, por un combobox con el mismo
// <select> oculto debajo: el formulario, la validación y el envío siguen
// leyendo ese <select>. Sin JS no corre y queda el <select> nativo.
//
// Efecto: el panel se disuelve en píxeles. Al abrir, aparece de arriba hacia
// abajo, con el borde granulado; al cerrar, se deshace de abajo hacia el
// campo. Al elegir, el texto del campo se descifra letra por letra. La
// disolución es una máscara (canvas → mask-image), así que no hay
// dependencias ni se pinta nada fuera de la paleta.

const CELL = 6; // tamaño del píxel de la disolución, en px
const OPEN_MS = 520;
const CLOSE_MS = 380;
const SCRAMBLE_MS = 420;
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

let uid = 0;

export function enhanceSelect(select) {
  const wrap = select.closest('.select-wrap');
  const label = select.id && document.querySelector(`label[for="${select.id}"]`);
  if (!wrap || select.dataset.enhanced) return;
  select.dataset.enhanced = '';
  const id = `fs-${++uid}`;
  const options = [...select.options];

  // ---- Estructura ---------------------------------------------------------
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'field__input select__button';
  button.setAttribute('role', 'combobox');
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', `${id}-list`);

  // El texto que se ve se anima y va oculto a los lectores de pantalla; el
  // sr-only trae siempre el valor final.
  const shown = document.createElement('span');
  shown.className = 'select__value';
  shown.setAttribute('aria-hidden', 'true');
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  if (label) {
    label.id ||= `${id}-label`;
    button.setAttribute('aria-labelledby', `${label.id} ${id}-spoken`);
  }
  spoken.id = `${id}-spoken`;
  button.append(shown, spoken);

  const panel = document.createElement('ul');
  panel.className = 'select__panel';
  panel.id = `${id}-list`;
  panel.setAttribute('role', 'listbox');
  if (label) panel.setAttribute('aria-labelledby', label.id);
  panel.hidden = true;

  const items = options.map((option, i) => {
    const li = document.createElement('li');
    li.className = 'select__option';
    li.id = `${id}-opt-${i}`;
    li.setAttribute('role', 'option');
    li.textContent = option.textContent;
    panel.append(li);
    return li;
  });

  select.hidden = true;
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  wrap.prepend(button);
  wrap.append(panel);

  // ---- Estado -------------------------------------------------------------
  let open = false;
  let active = select.selectedIndex;
  let frameId = 0; // disolución en curso
  let scrambleId = 0;
  let progress = 0; // 0 = oculto, 1 = visible
  let thresholds = [];
  let grid = { cols: 0, rows: 0 };

  const labelOf = (index) => options[index]?.textContent ?? '';

  const setActive = (index) => {
    active = Math.max(0, Math.min(items.length - 1, index));
    items.forEach((li, i) => li.classList.toggle('is-active', i === active));
    button.setAttribute('aria-activedescendant', open ? items[active].id : '');
    items[active].scrollIntoView({ block: 'nearest' });
  };

  // Pinta el estado actual del <select> sin animar (carga, reset, valor
  // asignado por código).
  const paint = () => {
    const index = select.selectedIndex;
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
    spoken.textContent = labelOf(index);
    shown.textContent = labelOf(index);
    button.classList.toggle('is-placeholder', select.value === '');
  };

  // Texto que se descifra: las letras ya resueltas quedan fijas, el resto
  // baraja caracteres. Los espacios y signos no cambian.
  const scramble = (text) => {
    cancelAnimationFrame(scrambleId);
    if (reducedMotion()) {
      shown.textContent = text;
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / SCRAMBLE_MS);
      const fixed = Math.floor(t * text.length);
      let out = text.slice(0, fixed);
      for (let i = fixed; i < text.length; i++) {
        out += /[a-z0-9áéíóúñ]/i.test(text[i])
          ? GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
          : text[i];
      }
      shown.textContent = out;
      if (t < 1) scrambleId = requestAnimationFrame(step);
    };
    scrambleId = requestAnimationFrame(step);
  };

  // ---- Disolución en píxeles ----------------------------------------------
  // Cada celda tiene un umbral: sube con la fila (arriba aparece primero y
  // abajo se va primero) más un poco de azar para el grano. Una celda se ve
  // cuando el progreso alcanza su umbral.
  const buildGrid = () => {
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    grid = { cols: Math.ceil(w / CELL), rows: Math.ceil(h / CELL) };
    thresholds = Array.from({ length: grid.rows * grid.cols }, (_, n) => {
      const row = Math.floor(n / grid.cols);
      return 0.62 * (row / Math.max(1, grid.rows - 1)) + 0.38 * Math.random();
    });
  };

  const canvas = document.createElement('canvas');
  const setMask = (p) => {
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    if (p >= 1) {
      panel.style.maskImage = panel.style.webkitMaskImage = '';
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    for (let n = 0; n < thresholds.length; n++) {
      if (p < thresholds[n]) continue;
      const x = (n % grid.cols) * CELL;
      const y = Math.floor(n / grid.cols) * CELL;
      ctx.fillRect(x, y, CELL, CELL);
    }
    const url = `url(${canvas.toDataURL()})`;
    panel.style.maskImage = panel.style.webkitMaskImage = url;
    panel.style.maskSize = panel.style.webkitMaskSize = '100% 100%';
  };

  const dissolve = (to, done) => {
    cancelAnimationFrame(frameId);
    const from = progress;
    const duration = (to > from ? OPEN_MS : CLOSE_MS) * Math.abs(to - from);
    if (reducedMotion() || duration === 0) {
      progress = to;
      setMask(to);
      done?.();
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      progress = from + (to - from) * ease(t);
      setMask(progress);
      if (t < 1) frameId = requestAnimationFrame(step);
      else done?.();
    };
    frameId = requestAnimationFrame(step);
  };

  // ---- Abrir y cerrar -----------------------------------------------------
  const openPanel = () => {
    if (open || button.disabled) return;
    open = true;
    button.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    panel.hidden = false;
    buildGrid();
    setActive(select.selectedIndex);
    dissolve(1);
  };

  const closePanel = ({ focus = false } = {}) => {
    if (!open) return;
    open = false;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-activedescendant', '');
    wrap.classList.remove('is-open');
    dissolve(0, () => {
      if (!open) panel.hidden = true;
    });
    if (focus) button.focus();
  };

  // Cierre sin animación: el diálogo se cerró o el formulario se reinició.
  const closeNow = () => {
    open = false;
    cancelAnimationFrame(frameId);
    progress = 0;
    panel.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-activedescendant', '');
    wrap.classList.remove('is-open');
  };

  const choose = (index) => {
    const changed = index !== select.selectedIndex;
    select.selectedIndex = index;
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === index)));
    spoken.textContent = labelOf(index);
    button.classList.toggle('is-placeholder', select.value === '');
    if (changed) {
      scramble(labelOf(index));
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closePanel({ focus: true });
  };

  // ---- Eventos ------------------------------------------------------------
  button.addEventListener('click', () => (open ? closePanel() : openPanel()));

  panel.addEventListener('pointermove', (event) => {
    const li = event.target.closest('.select__option');
    if (li) setActive(items.indexOf(li));
  });
  panel.addEventListener('click', (event) => {
    const li = event.target.closest('.select__option');
    if (li) choose(items.indexOf(li));
  });

  let typed = '';
  let typedTimer = 0;
  button.addEventListener('keydown', (event) => {
    const { key } = event;
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openPanel();
      else setActive(active + (key === 'ArrowDown' ? 1 : -1));
    } else if (key === 'Home' || key === 'End') {
      if (!open) return;
      event.preventDefault();
      setActive(key === 'Home' ? 0 : items.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(active);
      else openPanel();
    } else if (key === 'Escape' && open) {
      event.stopPropagation(); // que no cierre también el diálogo
      event.preventDefault();
      closePanel();
    } else if (key === 'Tab') {
      closePanel();
    } else if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      // Búsqueda por letras.
      typed += key.toLowerCase();
      clearTimeout(typedTimer);
      typedTimer = setTimeout(() => (typed = ''), 600);
      const found = options.findIndex((o) => o.textContent.toLowerCase().includes(typed));
      if (found >= 0) {
        if (!open) openPanel();
        setActive(found);
      }
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (open && !wrap.contains(event.target)) closePanel();
  });

  // Reinicio del formulario o cierre del diálogo: vuelve al estado limpio.
  select.form?.addEventListener('reset', () => {
    closeNow();
    queueMicrotask(paint);
  });
  select.closest('dialog')?.addEventListener('close', closeNow);

  // Quien asigna `select.value` por código (el botón "Quiero este plan") no
  // dispara eventos: se vuelve a pintar al asignar.
  const valueProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() {
      return valueProp.get.call(this);
    },
    set(next) {
      valueProp.set.call(this, next);
      paint();
    },
  });

  // Los campos deshabilitados (formulario enviando) bloquean el botón.
  new MutationObserver(() => {
    button.disabled = select.disabled || !!select.closest('fieldset:disabled');
  }).observe(select.closest('fieldset') ?? select, { attributes: true, attributeFilter: ['disabled'] });

  paint();
}
