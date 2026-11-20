/* HBO Suite v2.0.0 runtime — vanilla JS, no dependencies */
/* ===== js/core/hbo.js ===== */
/* ============================================================
   HBO core — namespace, color math, events, storage helpers
   Vanilla ES6, classic script (works from file://)
   ============================================================ */
(function (root) {
    'use strict';
    const HBO = root.HBO = root.HBO || {};
    HBO.version = '2.0.0';

    /* ---------- object helpers ---------- */
    HBO.clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
    HBO.get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
    HBO.set = (obj, path, value) => {
        const keys = path.split('.');
        let o = obj;
        keys.slice(0, -1).forEach(k => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
        o[keys[keys.length - 1]] = value;
    };
    HBO.merge = function merge(target, src) {
        if (!src || typeof src !== 'object') return target;
        Object.keys(src).forEach(k => {
            const v = src[k];
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
                merge(target[k], v);
            } else {
                target[k] = HBO.clone(v);
            }
        });
        return target;
    };
    HBO.equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    HBO.slug = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    HBO.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- color ---------- */
    const C = HBO.color = {};
    let probe = null;
    C.toHex = function (c) {
        if (!c) return '#000000';
        c = String(c).trim();
        if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
        if (/^#[0-9a-f]{8}$/i.test(c)) return c.slice(0, 7).toLowerCase();
        if (/^#[0-9a-f]{3}$/i.test(c)) return ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toLowerCase();
        const m0 = c.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
        if (m0) return '#' + [m0[1], m0[2], m0[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
        if (typeof document === 'undefined' || !document.body) return '#000000';
        if (!probe) { probe = document.createElement('div'); probe.style.display = 'none'; }
        probe.style.color = ''; probe.style.color = c;
        document.body.appendChild(probe);
        const m = getComputedStyle(probe).color.match(/(\d+),\s*(\d+),\s*(\d+)/);
        probe.remove();
        if (!m) return '#000000';
        return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('');
    };
    C.rgb = hex => {
        const h = C.toHex(hex).slice(1);
        return { r: parseInt(h.substr(0, 2), 16), g: parseInt(h.substr(2, 2), 16), b: parseInt(h.substr(4, 2), 16) };
    };
    C.triplet = hex => { const c = C.rgb(hex); return `${c.r},${c.g},${c.b}`; };
    C.rgba = (hex, a) => { const c = C.rgb(hex); return `rgba(${c.r},${c.g},${c.b},${+(+a).toFixed(3)})`; };
    C.fromRgb = (r, g, b) => '#' + [r, g, b].map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
    C.mix = (a, b, t) => { const x = C.rgb(a), y = C.rgb(b); return C.fromRgb(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t); };
    C.luminance = hex => {
        const c = C.rgb(hex);
        const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    C.contrast = (a, b) => {
        const l1 = C.luminance(a), l2 = C.luminance(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    /** pick readable text color for a background */
    C.on = (bg, light = '#ffffff', dark = '#0b0b12') => {
        // white reads as the intended design on saturated brand colors (indigo, pink, blue…):
        // keep it whenever it is within a hair of AA; the studio's contrast panel still reports the exact ratio
        if (C.contrast(bg, light) >= 4) return light;
        const best = C.contrast(bg, light) >= C.contrast(bg, dark) ? light : dark;
        // mid-tones: pure black squeezes out the last bit of contrast
        if (C.contrast(bg, best) < 4.5 && C.contrast(bg, '#000000') > C.contrast(bg, best)) return '#000000';
        return best;
    };
    /** alpha-composite fg (with alpha) over bg — both hex */
    C.over = (fg, alpha, bg) => C.mix(bg, fg, alpha);
    C.hsl = hex => {
        let { r, g, b } = C.rgb(hex); r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0; const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
            h *= 60;
        }
        return { h, s: s * 100, l: l * 100 };
    };
    C.fromHsl = (h, s, l) => {
        s /= 100; l /= 100; h = ((h % 360) + 360) % 360;
        const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return C.fromRgb(f(0) * 255, f(8) * 255, f(4) * 255);
    };
    C.shift = (hex, dh = 0, ds = 0, dl = 0) => { const x = C.hsl(hex); return C.fromHsl(x.h + dh, Math.max(0, Math.min(100, x.s + ds)), Math.max(0, Math.min(100, x.l + dl))); };

    /* ---------- events ---------- */
    HBO.emit = (name, detail, target) => (target || root.document).dispatchEvent(new CustomEvent(name, { detail }));
    HBO.on = (name, fn, target) => (target || root.document).addEventListener(name, fn);

    /* ---------- storage (never throws) ---------- */
    HBO.store = {
        get(key, fallback) { try { const v = root.localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
        set(key, value) { try { root.localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; } },
        del(key) { try { root.localStorage.removeItem(key); } catch (e) { /* ignore */ } }
    };

    /* ---------- download helper ---------- */
    HBO.download = (filename, content, type = 'text/plain') => {
        const blob = content instanceof Blob ? content : new Blob([content], { type });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    };
})(typeof window !== 'undefined' ? window : this);

;
/* ===== js/core/fonts.js ===== */
/* ============================================================
   HBO fonts — curated Google Fonts catalog + on-demand loader
   ============================================================ */
(function (root) {
    'use strict';
    const HBO = root.HBO = root.HBO || {};

    const W = [300, 400, 500, 600, 700, 800];
    // [family, category, weights]
    const RAW = [
        // Sans
        ['Inter', 'sans', W], ['Roboto', 'sans', [300, 400, 500, 700, 900]], ['DM Sans', 'sans', W],
        ['Manrope', 'sans', W], ['Plus Jakarta Sans', 'sans', W], ['Outfit', 'sans', W], ['Poppins', 'sans', W],
        ['Montserrat', 'sans', W], ['Work Sans', 'sans', W], ['Nunito', 'sans', W], ['Open Sans', 'sans', W],
        ['Lato', 'sans', [300, 400, 700, 900]], ['Source Sans 3', 'sans', W], ['IBM Plex Sans', 'sans', [300, 400, 500, 600, 700]],
        ['Figtree', 'sans', W], ['Sora', 'sans', W], ['Lexend', 'sans', W], ['Urbanist', 'sans', W],
        ['Space Grotesk', 'sans', [300, 400, 500, 600, 700]], ['Barlow', 'sans', W], ['Roboto Condensed', 'sans', W],
        ['Archivo', 'sans', W], ['Rubik', 'sans', W], ['Mulish', 'sans', W],
        // Serif
        ['Playfair Display', 'serif', [400, 500, 600, 700, 800]], ['Merriweather', 'serif', [300, 400, 700, 900]],
        ['Lora', 'serif', [400, 500, 600, 700]], ['Libre Baskerville', 'serif', [400, 700]], ['Cormorant Garamond', 'serif', [300, 400, 500, 600, 700]],
        ['EB Garamond', 'serif', [400, 500, 600, 700, 800]], ['Fraunces', 'serif', W], ['DM Serif Display', 'serif', [400]],
        ['Source Serif 4', 'serif', W], ['Crimson Pro', 'serif', W], ['Instrument Serif', 'serif', [400]],
        // Display
        ['Bebas Neue', 'display', [400]], ['Oswald', 'display', [300, 400, 500, 600, 700]], ['Anton', 'display', [400]],
        ['Orbitron', 'display', [400, 500, 600, 700, 800]], ['Righteous', 'display', [400]], ['Syne', 'display', [400, 500, 600, 700, 800]],
        ['Bangers', 'display', [400]], ['Audiowide', 'display', [400]], ['Exo 2', 'display', W],
        // Mono
        ['JetBrains Mono', 'mono', [300, 400, 500, 600, 700]], ['Fira Code', 'mono', [300, 400, 500, 600, 700]],
        ['IBM Plex Mono', 'mono', [300, 400, 500, 600, 700]], ['Space Mono', 'mono', [400, 700]], ['Roboto Mono', 'mono', [300, 400, 500, 600, 700]],
        ['Source Code Pro', 'mono', W],
        // Handwriting
        ['Caveat', 'hand', [400, 500, 600, 700]], ['Dancing Script', 'hand', [400, 500, 600, 700]], ['Pacifico', 'hand', [400]],
        ['Kalam', 'hand', [300, 400, 700]],
        // System (never loaded)
        ['system-ui', 'system', W], ['Georgia', 'system', [400, 700]], ['Arial', 'system', [400, 700]]
    ];
    const FALLBACK = { sans: 'sans-serif', serif: 'serif', display: 'sans-serif', mono: 'monospace', hand: 'cursive', system: 'sans-serif' };

    const CATALOG = RAW.map(([family, category, weights]) => ({ family, category, weights, google: category !== 'system' }));
    const byFamily = {};
    CATALOG.forEach(f => { byFamily[f.family.toLowerCase()] = f; });

    const F = HBO.fonts = {
        catalog: CATALOG,
        categories: { sans: 'Sans Serif', serif: 'Serif', display: 'Display', mono: 'Monospace', hand: 'Handwriting', system: 'System' },
        find(family) { return byFamily[String(family || '').toLowerCase()] || null; },
        /** family name -> CSS font-family stack */
        stack(family) {
            if (!family) return 'system-ui, sans-serif';
            if (/[,'"]/.test(family)) return family; // already a stack (custom)
            const f = F.find(family);
            if (f && f.family === 'system-ui') return 'system-ui, -apple-system, "Segoe UI", sans-serif';
            return `'${family}', ${FALLBACK[f ? f.category : 'sans']}`;
        },
        /** first family from a stack */
        primary(stack) {
            const m = String(stack || '').match(/^\s*['"]?([^,'"]+)['"]?/);
            return m ? m[1].trim() : '';
        },
        /** Build a single Google Fonts css2 URL for {family: Set(weights)} */
        url(used) {
            const fams = Object.keys(used).filter(n => { const f = F.find(n); return f && f.google; }).sort();
            if (!fams.length) return '';
            const parts = fams.map(n => {
                const f = F.find(n);
                const want = [...used[n]].map(Number).filter(w => f.weights.includes(w));
                const ws = (want.length ? want : [f.weights.includes(400) ? 400 : f.weights[0]]);
                // always add 400 + 700 when available for body text fallbacks
                [400, 700].forEach(w => { if (f.weights.includes(w) && !ws.includes(w)) ws.push(w); });
                ws.sort((a, b) => a - b);
                const fam = f.family.replace(/ /g, '+');
                return f.weights.length === 1 ? `family=${fam}` : `family=${fam}:wght@${ws.join(';')}`;
            });
            return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
        },
        /** Inject (or update) a <link> loading the given usage map into doc */
        ensure(used, doc = root.document, id = 'hbo-fonts') {
            const href = F.url(used);
            let link = doc.getElementById(id);
            if (!href) { if (link) link.remove(); return ''; }
            if (!link) {
                link = doc.createElement('link');
                link.id = id; link.rel = 'stylesheet';
                doc.head.appendChild(link);
            }
            if (link.getAttribute('href') !== href) link.setAttribute('href', href);
            return href;
        },
        /** Load a single family for previews (font picker / specimen) */
        preview(families, doc = root.document) {
            const used = {};
            [].concat(families).forEach(n => { const f = F.find(n); if (f && f.google) used[f.family] = new Set(f.weights); });
            const href = F.url(used);
            if (!href) return;
            const key = 'hbo-font-prev-' + HBO.slug([].concat(families).join('-')).slice(0, 60);
            if (doc.getElementById(key)) return;
            const link = doc.createElement('link');
            link.id = key; link.rel = 'stylesheet'; link.href = href;
            doc.head.appendChild(link);
        }
    };

    /* Curated pairings: heading / body / mono */
    F.pairings = [
        { id: 'modern', label: 'Modern — Inter', heading: 'Inter', body: 'Inter', mono: 'JetBrains Mono' },
        { id: 'editorial', label: 'Editorial — Playfair + Source Sans', heading: 'Playfair Display', body: 'Source Sans 3', mono: 'IBM Plex Mono' },
        { id: 'geometric', label: 'Geometric — Outfit + DM Sans', heading: 'Outfit', body: 'DM Sans', mono: 'Space Mono' },
        { id: 'humanist', label: 'Humanist — Nunito', heading: 'Nunito', body: 'Nunito', mono: 'Fira Code' },
        { id: 'technical', label: 'Technical — Space Grotesk + IBM Plex', heading: 'Space Grotesk', body: 'IBM Plex Sans', mono: 'IBM Plex Mono' },
        { id: 'classic', label: 'Classic — Lora + Lato', heading: 'Lora', body: 'Lato', mono: 'Roboto Mono' },
        { id: 'luxury', label: 'Luxury — Cormorant + Manrope', heading: 'Cormorant Garamond', body: 'Manrope', mono: 'JetBrains Mono' },
        { id: 'condensed', label: 'Condensed — Oswald + Roboto', heading: 'Oswald', body: 'Roboto', mono: 'Roboto Mono' },
        { id: 'futurist', label: 'Futurist — Orbitron + Exo 2', heading: 'Orbitron', body: 'Exo 2', mono: 'Space Mono' },
        { id: 'friendly', label: 'Friendly — Poppins + Figtree', heading: 'Poppins', body: 'Figtree', mono: 'Fira Code' },
        { id: 'startup', label: 'Startup — Plus Jakarta Sans', heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans', mono: 'JetBrains Mono' },
        { id: 'comic', label: 'Comic — Bangers + Nunito', heading: 'Bangers', body: 'Nunito', mono: 'Space Mono' }
    ];
})(typeof window !== 'undefined' ? window : this);

;
/* ===== js/runtime/core.js ===== */
/* ============================================================
   HBO runtime core — delegated interactions (no per-element
   listeners, so swapping page content never leaks handlers).
   Modules register { init(root), teardown(root) }.
   ============================================================ */
(function (root) {
    'use strict';
    const HBO = root.HBO = root.HBO || {};
    const doc = root.document;
    const R = HBO.runtime = HBO.runtime || { modules: {} };
    R.modules = R.modules || {};
    R.register = (name, mod) => { R.modules[name] = mod; };
    R.init = (scope = doc) => { Object.values(R.modules).forEach(m => { try { m.init && m.init(scope); } catch (e) { console.error('[hbo]', e); } }); };
    R.teardown = (scope = doc) => { Object.values(R.modules).forEach(m => { try { m.teardown && m.teardown(scope); } catch (e) { console.error('[hbo]', e); } }); };

    const $ = (s, r = doc) => r.querySelector(s);
    const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
    R.$ = $; R.$$ = $$;

    /* ---------- variant (light/dark) ---------- */
    const html = doc.documentElement;
    R.getVariant = () => html.getAttribute('data-variant') || 'dark';
    R.setVariant = (v, fromParent) => {
        html.setAttribute('data-variant', v);
        try { localStorage.setItem('hbo-variant', v); } catch (e) { /* ignore */ }
        if (!fromParent && root.parent && root.parent !== root) root.parent.postMessage({ hbo: 'variant', variant: v }, '*');
        HBO.emit && HBO.emit('hbo:themechange', { variant: v });
    };
    R.setTheme = id => {
        html.setAttribute('data-theme', id);
        try { localStorage.setItem('hbo-theme', id); } catch (e) { /* ignore */ }
        $$('.theme-switch button').forEach(b => b.classList.toggle('active', b.dataset.themeId === id));
        HBO.emit && HBO.emit('hbo:themechange', { theme: id });
    };

    /* ---------- overlays ---------- */
    let backdrop = null;
    const openStack = [];
    function ensureBackdrop() {
        if (!backdrop || !backdrop.isConnected) { backdrop = doc.createElement('div'); backdrop.className = 'hbo-backdrop'; doc.body.appendChild(backdrop); }
        return backdrop;
    }
    function syncBackdrop() {
        const needs = openStack.some(el => !el.hasAttribute('data-no-backdrop'));
        ensureBackdrop().classList.toggle('show', needs);
        doc.body.style.overflow = openStack.length ? 'hidden' : '';
    }
    R.open = id => {
        const el = typeof id === 'string' ? doc.getElementById(id) : id;
        if (!el) return;
        // only one offcanvas per side at a time
        if (el.classList.contains('offcanvas')) openStack.filter(o => o.classList.contains('offcanvas')).forEach(o => R.close(o));
        el.classList.add('show');
        if (!openStack.includes(el)) openStack.push(el);
        syncBackdrop();
        const f = el.querySelector('[autofocus], .input, button:not(.btn-close)');
        if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
    };
    R.close = id => {
        const el = typeof id === 'string' ? doc.getElementById(id) : id;
        if (!el) return;
        el.classList.remove('show');
        const i = openStack.indexOf(el);
        if (i > -1) openStack.splice(i, 1);
        syncBackdrop();
    };
    R.closeTop = (force) => {
        const top = openStack[openStack.length - 1];
        if (!top) return false;
        if (top.hasAttribute('data-static') && !force) { top.animate && top.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.015)' }, { transform: 'scale(1)' }], { duration: 200 }); return true; }
        R.close(top);
        return true;
    };

    /* ---------- toast ---------- */
    R.toast = (opts = {}) => {
        let box = $('.toast-container:not(.static)');
        if (!box) { box = doc.createElement('div'); box.className = 'toast-container'; doc.body.appendChild(box); }
        const kind = opts.kind || 'info';
        const icon = { success: 'check-circle', warning: 'warning', danger: 'x-circle', info: 'info', primary: 'bell' }[kind] || 'bell';
        const t = doc.createElement('div');
        t.className = 'toast ' + kind;
        t.setAttribute('role', 'status');
        t.innerHTML = `<i class="ph ph-${icon}"></i><div class="grow"><div class="toast-title">${HBO.esc ? HBO.esc(opts.title || 'Notification') : opts.title}</div><div class="toast-msg">${HBO.esc ? HBO.esc(opts.message || '') : opts.message}</div></div><button class="btn-close" data-dismiss="toast" aria-label="Close"></button>`;
        box.appendChild(t);
        const ttl = opts.duration ?? 4000;
        if (ttl) setTimeout(() => dismiss(t), ttl);
        return t;
    };
    function dismiss(el) { if (!el || !el.isConnected) return; el.classList.add('hide', 'fade-out'); setTimeout(() => el.remove(), 260); }

    /* ---------- delegated click ---------- */
    doc.addEventListener('click', e => {
        const t = e.target;
        const q = s => t.closest(s);
        let el;

        // close open dropdowns/popovers on outside click
        $$('.dropdown.open').forEach(d => { if (!d.contains(t)) d.classList.remove('open'); });
        $$('.popover-wrap.open').forEach(d => { if (!d.contains(t)) d.classList.remove('open'); });

        if ((el = q('[data-hbo-variant-toggle]'))) { R.setVariant(R.getVariant() === 'dark' ? 'light' : 'dark'); return; }
        if ((el = q('.theme-switch button[data-theme-id]'))) { R.setTheme(el.dataset.themeId); return; }
        if ((el = q('[data-dropdown]'))) { e.preventDefault(); const d = el.closest('.dropdown'); const was = d.classList.contains('open'); $$('.dropdown.open').forEach(x => x.classList.remove('open')); d.classList.toggle('open', !was); return; }
        if ((el = q('.dropdown-menu .dropdown-item'))) {
            const d = el.closest('.dropdown');
            if (d && d.hasAttribute('data-select')) {
                $$('.dropdown-item', d).forEach(i => i.classList.toggle('active', i === el));
                const label = d.querySelector('[data-dropdown] .label');
                if (label) label.textContent = el.textContent.trim();
            }
            if (d && !el.hasAttribute('data-keep-open')) d.classList.remove('open');
        }
        if ((el = q('[data-popover]'))) { const w = el.closest('.popover-wrap'); w && w.classList.toggle('open'); return; }
        if ((el = q('[data-modal]'))) { e.preventDefault(); R.open(el.dataset.modal); return; }
        if ((el = q('[data-offcanvas]'))) { e.preventDefault(); R.open(el.dataset.offcanvas); return; }
        if ((el = q('[data-dismiss="modal"], [data-dismiss="offcanvas"]'))) { R.close(el.closest('.modal, .offcanvas')); return; }
        if ((el = q('[data-dismiss="alert"]'))) { dismiss(el.closest('.alert')); return; }
        if ((el = q('[data-dismiss="toast"]'))) { dismiss(el.closest('.toast')); return; }
        if ((el = q('[data-dismiss="chip"]'))) { dismiss(el.closest('.chip')); return; }
        if (t.classList.contains('modal') && t.classList.contains('show')) { if (!t.hasAttribute('data-static')) R.close(t); else R.closeTop(); return; }
        if (backdrop && t === backdrop) { R.closeTop(); return; }
        if ((el = q('[data-toast]'))) { R.toast({ kind: el.dataset.toast, title: el.dataset.title || 'Heads up', message: el.dataset.message || 'This is a themed toast message.' }); return; }
        if ((el = q('.accordion-button'))) {
            const item = el.closest('.accordion-item'), acc = el.closest('.accordion');
            const open = !item.classList.contains('open');
            if (acc && !acc.hasAttribute('data-multi')) $$(':scope > .accordion-item', acc).forEach(i => i.classList.remove('open'));
            item.classList.toggle('open', open);
            el.setAttribute('aria-expanded', open);
            return;
        }
        if ((el = q('[data-collapse]'))) { const c = doc.getElementById(el.dataset.collapse); if (c) { c.classList.toggle('show'); el.setAttribute('aria-expanded', c.classList.contains('show')); } return; }
        if ((el = q('[data-tab]'))) {
            e.preventDefault();
            const nav = el.closest('.nav');
            $$('[data-tab]', nav).forEach(x => x.classList.toggle('active', x === el));
            const target = doc.getElementById(el.dataset.tab);
            if (target) $$(':scope > .tab-pane', target.parentElement).forEach(p => p.classList.toggle('active', p === target));
            return;
        }
        if ((el = q('.nav[data-select-nav] .nav-link'))) { $$('.nav-link', el.closest('.nav')).forEach(x => x.classList.toggle('active', x === el)); return; }
        if ((el = q('.btn-group[data-toggle="radio"] > .btn'))) { $$(':scope > .btn', el.parentElement).forEach(b => { b.classList.toggle('active', b === el); b.setAttribute('aria-pressed', b === el); }); return; }
        if ((el = q('.btn-group[data-toggle="checkbox"] > .btn, [data-toggle-btn]'))) { el.classList.toggle('active'); el.setAttribute('aria-pressed', el.classList.contains('active')); return; }
        if ((el = q('button.chip[data-chip]'))) { el.classList.toggle('active'); el.setAttribute('aria-pressed', el.classList.contains('active')); return; }
        if ((el = q('.pagination[data-paginate] .page-link'))) { e.preventDefault(); const p = el.closest('.pagination'); const links = $$('.page-link:not([data-step])', p); let i = links.findIndex(l => l.classList.contains('active')); if (el.dataset.step) i = Math.max(0, Math.min(links.length - 1, i + (+el.dataset.step))); else i = links.indexOf(el); links.forEach((l, k) => l.classList.toggle('active', k === i)); return; }
        if ((el = q('.list-group[data-select] .list-group-item'))) { $$('.list-group-item', el.parentElement).forEach(x => x.classList.toggle('active', x === el)); return; }
        if ((el = q('.app-list[data-select] .app-list-item'))) { $$('.app-list-item', el.parentElement).forEach(x => x.classList.toggle('active', x === el)); el.classList.remove('unread'); return; }
        if ((el = q('.app-nav[data-select] .nav-link'))) { $$('.nav-link', el.closest('.app-nav')).forEach(x => x.classList.toggle('active', x === el)); return; }
        if ((el = q('[data-sb-toggle]'))) { const a = el.closest('.admin') || $('.admin'); a && a.classList.toggle('sb-open'); return; }
        if ((el = q('[data-sb-mini]'))) { const a = $('.admin'); if (a) a.dataset.sidebar = a.dataset.sidebar === 'mini' ? '' : 'mini'; return; }
        if ((el = q('.sb-group-btn'))) { el.closest('.sb-group').classList.toggle('open'); return; }
        if ((el = q('[data-nav-toggle]'))) { const n = el.closest('.site-nav'); n && n.classList.toggle('open'); return; }
        if ((el = q('[data-copy]'))) {
            const txt = el.dataset.copy;
            (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => {
                el.classList.add('copied'); setTimeout(() => el.classList.remove('copied'), 900);
                R.toast({ kind: 'success', title: 'Copied', message: txt, duration: 1600 });
            }).catch(() => { /* ignore */ });
            return;
        }
        if ((el = q('[data-billing]'))) {
            const yearly = el.dataset.billing === 'yearly';
            $$('[data-price-month]').forEach(p => { p.firstChild.textContent = '$' + (yearly ? p.dataset.priceYear : p.dataset.priceMonth); });
            $$('[data-billing]').forEach(b => b.classList.toggle('active', b === el));
            return;
        }
        // close the sidebar on mobile after a nav click
        if (q('.admin-sidebar .sb-link')) { const a = $('.admin'); a && a.classList.remove('sb-open'); }
    });

    /* ---------- keyboard ---------- */
    doc.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (R.closeTop()) return;
            $$('.dropdown.open, .popover-wrap.open').forEach(d => d.classList.remove('open'));
            const a = $('.admin.sb-open'); a && a.classList.remove('sb-open');
        }
        if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
            const s = $('.admin-topbar .search .input, [data-search-focus]');
            if (s) { e.preventDefault(); s.focus(); }
        }
    });

    /* ---------- inputs ---------- */
    function fillRange(r) { const min = +r.min || 0, max = +r.max || 100; r.style.setProperty('--fill', ((r.value - min) / (max - min) * 100) + '%'); }
    doc.addEventListener('input', e => {
        const t = e.target;
        if (t.matches && t.matches('input[type="range"].range')) {
            fillRange(t);
            const out = t.closest('.slider-row') && t.closest('.slider-row').querySelector('.slider-val');
            if (out) out.textContent = t.value + (t.dataset.unit || '');
        }
        if (t.matches && t.matches('.todo-item input[type="checkbox"]')) t.closest('.todo-item').classList.toggle('done', t.checked);
        if (t.matches && t.matches('[data-check-all]')) {
            const tbl = t.closest('table');
            $$('tbody input[type="checkbox"]', tbl).forEach(c => { c.checked = t.checked; c.closest('tr').classList.toggle('selected', t.checked); });
            HBO.emit && HBO.emit('hbo:selection', { table: tbl });
        } else if (t.matches && t.matches('table tbody input[type="checkbox"]')) {
            t.closest('tr').classList.toggle('selected', t.checked);
            HBO.emit && HBO.emit('hbo:selection', { table: t.closest('table') });
        }
    });

    /* validation demo: data-validate forms */
    doc.addEventListener('submit', e => {
        const f = e.target;
        if (!f.matches('form[data-validate]')) return;
        e.preventDefault();
        let ok = true;
        $$('[required]', f).forEach(i => {
            const valid = i.type === 'checkbox' ? i.checked : i.value.trim() !== '' && (!i.pattern || new RegExp('^' + i.pattern + '$').test(i.value)) && (i.type !== 'email' || /.+@.+\..+/.test(i.value));
            i.classList.toggle('is-invalid', !valid); i.classList.toggle('is-valid', valid);
            ok = ok && valid;
        });
        R.toast(ok ? { kind: 'success', title: 'Submitted', message: 'All fields look good.' } : { kind: 'danger', title: 'Check the form', message: 'Some fields need attention.' });
    });

    /* ---------- base module: ranges + icon weight ---------- */
    R.register('base', {
        init(scope) {
            $$('input[type="range"].range', scope).forEach(fillRange);
            R.applyIconWeight(scope);
        },
        teardown() {
            // content is about to be replaced: forget overlays that will disappear
            openStack.splice(0).forEach(el => el.classList.remove('show'));
            if (backdrop) backdrop.classList.remove('show');
            doc.body.style.overflow = '';
        }
    });

    /** Phosphor weight comes from the --icon-weight token */
    const WEIGHTS = ['thin', 'light', 'bold', 'fill', 'duotone'];
    R.iconWeight = () => (getComputedStyle(html).getPropertyValue('--icon-weight') || 'regular').trim() || 'regular';
    R.applyIconWeight = (scope = doc) => {
        const w = R.iconWeight();
        const cls = w === 'regular' ? 'ph' : 'ph-' + w;
        $$('i.ph, i.ph-thin, i.ph-light, i.ph-bold, i.ph-fill, i.ph-duotone', scope).forEach(i => {
            if (i.hasAttribute('data-fixed-weight')) return;
            i.classList.remove('ph', ...WEIGHTS.map(x => 'ph-' + x));
            i.classList.add(cls);
        });
        if (HBO.icons && HBO.icons.load) HBO.icons.load(w);
    };
    HBO.on && HBO.on('hbo:themechange', () => R.applyIconWeight());

    /* ---------- boot ---------- */
    R.boot = () => {
        if (!html.hasAttribute('data-static-variant')) {
            try { const v = localStorage.getItem('hbo-variant'); if (v) html.setAttribute('data-variant', v); } catch (e) { /* ignore */ }
            try { const th = localStorage.getItem('hbo-theme'); if (th && html.hasAttribute('data-theme')) R.setTheme(th); } catch (e) { /* ignore */ }
        }
        R.init(doc);
    };
    if (!root.HBO_NO_AUTOBOOT) {
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', R.boot); else R.boot();
    }
})(window);

;
/* ===== js/runtime/icons.js ===== */
/* HBO icons — Phosphor Icons (web font) loader + name index + browser */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime, esc = HBO.esc;
    const VERSION = '2.1.1';
    const I = HBO.icons = {
        version: VERSION,
        base: root.HBO_ICON_BASE || `https://unpkg.com/@phosphor-icons/web@${VERSION}/src/`,
        weights: ['regular', 'thin', 'light', 'bold', 'fill', 'duotone'],
        href: w => `${I.base}${w}/style.css`,
        load(w = 'regular', doc = document) {
            const id = 'hbo-ph-' + w;
            if (doc.getElementById(id)) return;
            const l = doc.createElement('link');
            l.id = id; l.rel = 'stylesheet'; l.href = I.href(w);
            doc.head.appendChild(l);
        },
        _names: null,
        /** every icon name, parsed from the stylesheet itself (no list to maintain) */
        async names() {
            if (I._names) return I._names;
            try {
                const css = await (await fetch(I.href('regular'))).text();
                const set = new Set();
                css.replace(/\.ph-([a-z0-9-]+):before/g, (_, n) => set.add(n));
                I._names = Array.from(set).sort();
            } catch (e) {
                I._names = FALLBACK;
            }
            return I._names;
        }
    };
    // used when offline / blocked
    const FALLBACK = 'house gauge chart-line chart-bar chart-pie-slice users user user-circle gear sliders bell envelope-simple chat-circle-dots calendar-blank kanban list-checks folder file file-text image camera shopping-cart storefront credit-card currency-dollar currency-btc wallet trend-up trend-down magnifying-glass funnel plus minus x check check-circle warning info question star heart bookmark share-network download-simple upload-simple cloud lock key shield-check globe map-pin phone clock rocket-launch lightning sun moon palette paint-brush code terminal database cpu device-mobile desktop link arrow-right arrow-left caret-down dots-three sign-out sign-in'.split(' ');

    /* icon browser: [data-icon-browser] containing .input (search), .icon-grid, [data-icon-count] */
    function setupBrowser(box) {
        if (box._hbo) return; box._hbo = true;
        const grid = box.querySelector('.icon-grid'), search = box.querySelector('[data-icon-search]'), count = box.querySelector('[data-icon-count]');
        let all = [], shown = 240;
        const render = () => {
            const q = (search && search.value.trim().toLowerCase()) || '';
            const list = all.filter(n => !q || n.includes(q));
            if (count) count.textContent = `${list.length.toLocaleString()} icons`;
            grid.innerHTML = list.slice(0, shown).map(n => `<button class="icon-cell" data-copy='<i class="ph ph-${n}"></i>' title="${n}"><i class="ph ph-${n}"></i><span>${esc(n)}</span></button>`).join('') +
                (list.length > shown ? `<button class="btn btn-ghost" data-more style="grid-column:1/-1">Show more (${list.length - shown})</button>` : '');
            R.applyIconWeight(grid);
        };
        box.addEventListener('click', e => { if (e.target.closest('[data-more]')) { shown += 480; render(); } });
        if (search) search.addEventListener('input', () => { shown = 240; render(); });
        box.querySelectorAll('[data-icon-weight]').forEach(b => b.addEventListener('click', () => {
            box.querySelectorAll('[data-icon-weight]').forEach(x => x.classList.toggle('active', x === b));
            const w = b.dataset.iconWeight; I.load(w);
            grid.querySelectorAll('i').forEach(i => { i.className = (w === 'regular' ? 'ph' : 'ph-' + w) + ' ' + Array.from(i.classList).find(c => /^ph-(?!thin$|light$|bold$|fill$|duotone$)/.test(c)); i.setAttribute('data-fixed-weight', ''); });
        }));
        const size = box.querySelector('[data-icon-size]');
        if (size) size.addEventListener('input', () => grid.style.setProperty('--icon-size', size.value + 'px'));
        I.names().then(n => { all = n; render(); });
    }
    R.register('icons', {
        init(scope) {
            I.load(R.iconWeight ? R.iconWeight() : 'regular');
            scope.querySelectorAll('[data-icon-browser]').forEach(setupBrowser);
        }
    });
})(window);

;
/* ===== js/runtime/carousel.js ===== */
/* HBO runtime — carousel (timers tracked per element, cleared on teardown) */
(function (root) {
    'use strict';
    const R = root.HBO.runtime;
    const timers = new Map();

    function setup(c) {
        if (c._hbo) return;
        c._hbo = true;
        const track = c.querySelector('.carousel-track');
        const slides = Array.from(c.querySelectorAll('.carousel-slide'));
        const dots = c.querySelector('.carousel-dots');
        let i = 0;
        if (dots) dots.innerHTML = slides.map((_, k) => `<button aria-label="Slide ${k + 1}"></button>`).join('');
        const go = n => {
            i = (n + slides.length) % slides.length;
            if (c.classList.contains('fade')) slides.forEach((s, k) => s.classList.toggle('active', k === i));
            else track.style.transform = `translateX(-${i * 100}%)`;
            if (dots) Array.from(dots.children).forEach((d, k) => d.classList.toggle('active', k === i));
        };
        c.addEventListener('click', e => {
            if (e.target.closest('.carousel-btn.prev')) go(i - 1);
            else if (e.target.closest('.carousel-btn.next')) go(i + 1);
            else if (dots && e.target.parentElement === dots) go(Array.from(dots.children).indexOf(e.target));
        });
        go(0);
        if (c.hasAttribute('data-autoplay')) {
            const ms = +c.dataset.autoplay || 4000;
            timers.set(c, setInterval(() => { if (!c.isConnected) { clearInterval(timers.get(c)); timers.delete(c); return; } if (!c.matches(':hover')) go(i + 1); }, ms));
        }
    }
    R.register('carousel', {
        init(scope) { scope.querySelectorAll('.carousel').forEach(setup); },
        teardown(scope) { timers.forEach((t, c) => { if (scope === document || scope.contains(c)) { clearInterval(t); timers.delete(c); } }); }
    });
})(window);

;
/* ===== js/runtime/datepicker.js ===== */
/* HBO runtime — datepicker (popup bound to its input, or inline) */
(function (root) {
    'use strict';
    const R = root.HBO.runtime;
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const same = (a, b) => a && b && a.toDateString() === b.toDateString();

    function build(host, opts) {
        const input = opts.input;
        let view = new Date(), selected = null, rangeEnd = null;
        if (input && input.value && !isNaN(Date.parse(input.value))) { selected = new Date(input.value + 'T00:00'); view = new Date(selected); }
        const range = host.hasAttribute('data-range');
        function render() {
            const y = view.getFullYear(), m = view.getMonth();
            const first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
            const today = new Date();
            let cells = '';
            for (let k = 0; k < 42; k++) {
                const d = new Date(start); d.setDate(start.getDate() + k);
                const cls = ['dp-day'];
                if (d.getMonth() !== m) cls.push('muted');
                if (same(d, today)) cls.push('today');
                if (same(d, selected) || same(d, rangeEnd)) cls.push('selected');
                if (range && selected && rangeEnd && d > selected && d < rangeEnd) cls.push('in-range');
                cells += `<div class="${cls.join(' ')}" data-d="${fmt(d)}">${d.getDate()}</div>`;
            }
            host.innerHTML = `<div class="dp-head"><button type="button" class="dp-nav" data-nav="-1" aria-label="Previous month">‹</button><div class="dp-title">${MONTHS[m]} ${y}</div><button type="button" class="dp-nav" data-nav="1" aria-label="Next month">›</button></div>
                <div class="dp-grid">${['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => `<div class="dp-dow">${d}</div>`).join('')}${cells}</div>`;
        }
        host.addEventListener('click', e => {
            e.stopPropagation();
            const nav = e.target.closest('[data-nav]');
            if (nav) { view.setMonth(view.getMonth() + (+nav.dataset.nav)); render(); return; }
            const day = e.target.closest('.dp-day');
            if (!day) return;
            const d = new Date(day.dataset.d + 'T00:00');
            if (range) {
                if (!selected || rangeEnd || d < selected) { selected = d; rangeEnd = null; }
                else rangeEnd = d;
                if (input) input.value = fmt(selected) + (rangeEnd ? ' → ' + fmt(rangeEnd) : '');
            } else {
                selected = d;
                if (input) { input.value = fmt(d); input.dispatchEvent(new Event('change', { bubbles: true })); }
                if (opts.wrap && !range) opts.wrap.classList.remove('open');
            }
            if (d.getMonth() !== view.getMonth()) view = new Date(d);
            render();
        });
        render();
    }

    // one document-level listener for every popup datepicker
    document.addEventListener('click', e => {
        document.querySelectorAll('.dp-wrap.open').forEach(w => { if (!w.contains(e.target)) w.classList.remove('open'); });
        const input = e.target.closest('.dp-wrap > .input, .dp-wrap > .input-icon > .input');
        if (input) input.closest('.dp-wrap').classList.add('open');
    });

    R.register('datepicker', {
        init(scope) {
            scope.querySelectorAll('.dp-wrap').forEach(w => {
                if (w._hbo) return; w._hbo = true;
                const input = w.querySelector('.input');
                let host = w.querySelector(':scope > .dp');
                if (!host) { host = document.createElement('div'); host.className = 'dp surface-overlay'; w.appendChild(host); }
                if (w.hasAttribute('data-range')) host.setAttribute('data-range', '');
                build(host, { input, wrap: w });
            });
            scope.querySelectorAll('.dp[data-inline]').forEach(h => { if (h._hbo) return; h._hbo = true; build(h, {}); });
        }
    });
})(window);

;
/* ===== js/runtime/editor.js ===== */
/* HBO runtime — rich text editor + color picker */
(function (root) {
    'use strict';
    const R = root.HBO.runtime, C = root.HBO.color;

    /* ---- editor: data-cmd buttons use execCommand (still supported in every browser) ---- */
    document.addEventListener('click', e => {
        const b = e.target.closest('.editor-toolbar [data-cmd]');
        if (!b) return;
        e.preventDefault();
        const area = b.closest('.editor').querySelector('.editor-area');
        area.focus();
        const cmd = b.dataset.cmd;
        if (cmd === 'createLink') { const url = prompt('Link URL', 'https://'); if (url) document.execCommand(cmd, false, url); }
        else if (cmd === 'formatBlock') document.execCommand(cmd, false, b.dataset.value);
        else document.execCommand(cmd, false, null);
        syncState(b.closest('.editor'));
    });
    function syncState(ed) {
        ed.querySelectorAll('[data-cmd]').forEach(b => {
            try { if (!b.dataset.value) b.classList.toggle('active', document.queryCommandState(b.dataset.cmd)); } catch (err) { /* ignore */ }
        });
    }
    document.addEventListener('selectionchange', () => {
        const a = document.activeElement;
        if (a && a.classList && a.classList.contains('editor-area')) syncState(a.closest('.editor'));
    });

    /* ---- color picker (HSV area + hue) ---- */
    function setupCp(cp) {
        if (cp._hbo) return; cp._hbo = true;
        const area = cp.querySelector('.cp-area'), knob = cp.querySelector('.cp-knob'), hue = cp.querySelector('.cp-hue');
        const sw = cp.querySelector('.cp-swatch'), code = cp.querySelector('.cp-code'), input = cp.querySelector('.cp-input');
        let h = +(hue && hue.value) || 220, s = 0.7, v = 0.8;
        const hsvToHex = (h, s, v) => {
            const f = n => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
            return C.fromRgb(f(5) * 255, f(3) * 255, f(1) * 255);
        };
        const update = () => {
            const hex = hsvToHex(h, s, v);
            cp.style.setProperty('--cp-h', h);
            knob.style.left = (s * 100) + '%'; knob.style.top = ((1 - v) * 100) + '%';
            if (sw) sw.style.background = hex;
            if (code) code.textContent = hex.toUpperCase();
            if (input && document.activeElement !== input) input.value = hex;
            cp.dispatchEvent(new CustomEvent('hbo:color', { detail: hex, bubbles: true }));
        };
        let drag = false;
        const pick = e => { const r = area.getBoundingClientRect(); s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); v = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); update(); };
        area.addEventListener('pointerdown', e => { drag = true; area.setPointerCapture(e.pointerId); pick(e); });
        area.addEventListener('pointermove', e => drag && pick(e));
        area.addEventListener('pointerup', () => { drag = false; });
        if (hue) hue.addEventListener('input', () => { h = +hue.value; update(); });
        if (input) input.addEventListener('change', () => {
            const hsl = C.hsl(input.value); h = hsl.h;
            const c = C.rgb(input.value), mx = Math.max(c.r, c.g, c.b) / 255, mn = Math.min(c.r, c.g, c.b) / 255;
            v = mx; s = mx ? (mx - mn) / mx : 0; if (hue) hue.value = h; update();
        });
        cp.querySelectorAll('.swatches button').forEach(b => b.addEventListener('click', () => { input.value = getComputedStyle(b).backgroundColor; input.value = C.toHex(input.value); input.dispatchEvent(new Event('change')); }));
        update();
    }
    R.register('editor', { init(scope) { scope.querySelectorAll('.cp').forEach(setupCp); } });
})(window);

;
/* ===== js/runtime/crud.js ===== */
/* HBO runtime — CRUD data tables: search, sort, paginate, select,
   add / edit / delete via a modal form. Data lives in a JSON
   <script type="application/json" data-crud-data> inside the block. */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime;
    const esc = HBO.esc;

    function setup(box) {
        if (box._hbo) return; box._hbo = true;
        const dataEl = box.querySelector('[data-crud-data]');
        const cfg = JSON.parse(dataEl.textContent);
        const cols = cfg.columns; // [{key,label,type?:'badge'|'money'|'avatar'|'date', map?}]
        let rows = cfg.rows.map((r, i) => Object.assign({ _id: i + 1 }, r));
        let q = '', sortKey = null, dir = 1, page = 1;
        const per = cfg.perPage || 8;
        const tbody = box.querySelector('tbody'), thead = box.querySelector('thead');
        const info = box.querySelector('[data-crud-info]'), pager = box.querySelector('[data-crud-pager]');
        const search = box.querySelector('[data-crud-search]'), bulk = box.querySelector('.bulk-bar');
        const modal = document.getElementById(box.dataset.crudModal);
        let editing = null;

        thead.innerHTML = `<tr><th style="width:36px"><label class="check"><input type="checkbox" data-check-all aria-label="Select all"></label></th>${cols.map(c => `<th data-sort="${c.key}" class="${c.type === 'money' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}<th class="actions">Actions</th></tr>`;

        const cell = (c, r) => {
            const v = r[c.key];
            switch (c.type) {
                case 'badge': { const k = (c.map && c.map[v]) || 'neutral'; return `<span class="badge soft ${k}">${esc(v)}</span>`; }
                case 'money': return `<span class="tabular">$${(+v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`;
                case 'avatar': return `<div class="media"><span class="avatar sm c${(r._id % 6) + 1}">${esc(String(v).split(' ').map(s => s[0]).join('').slice(0, 2))}</span><div class="media-body"><div class="media-title">${esc(v)}</div>${c.sub ? `<div class="media-sub">${esc(r[c.sub] || '')}</div>` : ''}</div></div>`;
                default: return esc(v);
            }
        };
        function view() {
            let list = rows.filter(r => !q || cols.some(c => String(r[c.key] ?? '').toLowerCase().includes(q)));
            if (sortKey) list.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir; });
            const pages = Math.max(1, Math.ceil(list.length / per));
            page = Math.min(page, pages);
            const slice = list.slice((page - 1) * per, page * per);
            tbody.innerHTML = slice.map(r => `<tr data-id="${r._id}"><td><label class="check"><input type="checkbox" aria-label="Select row"></label></td>${cols.map(c => `<td data-label="${esc(c.label)}" class="${c.type === 'money' ? 'num' : ''}">${cell(c, r)}</td>`).join('')}<td class="actions"><button class="btn btn-ghost btn-icon btn-sm" data-crud-edit aria-label="Edit"><i class="ph ph-pencil-simple"></i></button><button class="btn btn-ghost btn-icon btn-sm" data-crud-del aria-label="Delete"><i class="ph ph-trash"></i></button></td></tr>`).join('')
                || `<tr><td colspan="${cols.length + 2}"><div class="empty-state"><i class="ph ph-magnifying-glass"></i><p>No records match “${esc(q)}”.</p></div></td></tr>`;
            if (info) info.textContent = list.length ? `Showing ${(page - 1) * per + 1}–${Math.min(page * per, list.length)} of ${list.length}` : '0 results';
            if (pager) pager.innerHTML = `<button class="page-link ${page === 1 ? 'disabled' : ''}" data-p="${page - 1}">‹</button>` + Array.from({ length: pages }, (_, k) => `<button class="page-link ${k + 1 === page ? 'active' : ''}" data-p="${k + 1}">${k + 1}</button>`).join('') + `<button class="page-link ${page === pages ? 'disabled' : ''}" data-p="${page + 1}">›</button>`;
            thead.querySelectorAll('th[data-sort]').forEach(th => th.setAttribute('aria-sort', th.dataset.sort === sortKey ? (dir > 0 ? 'ascending' : 'descending') : 'none'));
            const all = thead.querySelector('[data-check-all]'); if (all) all.checked = false;
            updateBulk();
            R.applyIconWeight && R.applyIconWeight(tbody);
        }
        function updateBulk() {
            const n = tbody.querySelectorAll('input[type="checkbox"]:checked').length;
            if (bulk) { bulk.classList.toggle('show', n > 0); const c = bulk.querySelector('[data-count]'); if (c) c.textContent = n; }
        }
        function openForm(row) {
            if (!modal) return;
            editing = row;
            modal.querySelector('.modal-title').textContent = row ? 'Edit record' : 'New record';
            const form = modal.querySelector('form');
            form.innerHTML = cols.map(c => {
                const v = row ? row[c.key] : '';
                if (c.type === 'badge' && c.map) return `<div class="form-group"><label class="form-label">${esc(c.label)}</label><select class="form-select" name="${c.key}">${Object.keys(c.map).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
                return `<div class="form-group"><label class="form-label">${esc(c.label)}</label><input class="input" name="${c.key}" type="${c.type === 'money' ? 'number' : c.type === 'date' ? 'date' : 'text'}" step="0.01" value="${esc(v)}" required></div>`;
            }).join('');
            R.open(modal);
        }
        box.addEventListener('click', e => {
            const th = e.target.closest('th[data-sort]');
            if (th) { if (sortKey === th.dataset.sort) dir = -dir; else { sortKey = th.dataset.sort; dir = 1; } view(); return; }
            const p = e.target.closest('[data-crud-pager] [data-p]');
            if (p && !p.classList.contains('disabled')) { page = +p.dataset.p; view(); return; }
            const tr = e.target.closest('tr[data-id]');
            const row = tr && rows.find(r => r._id === +tr.dataset.id);
            if (e.target.closest('[data-crud-edit]') && row) { openForm(row); return; }
            if (e.target.closest('[data-crud-del]') && row) { if (confirm('Delete this record?')) { rows = rows.filter(r => r !== row); view(); R.toast({ kind: 'danger', title: 'Deleted', message: 'Record removed.' }); } return; }
            if (e.target.closest('[data-crud-add]')) { openForm(null); return; }
            if (e.target.closest('[data-crud-bulk-del]')) {
                const ids = Array.from(tbody.querySelectorAll('tr.selected')).map(t => +t.dataset.id);
                rows = rows.filter(r => !ids.includes(r._id)); view();
                R.toast({ kind: 'danger', title: 'Deleted', message: ids.length + ' records removed.' });
            }
            if (e.target.closest('[data-crud-export]')) {
                const csv = [cols.map(c => c.label).join(',')].concat(rows.map(r => cols.map(c => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
                HBO.download('export.csv', csv, 'text/csv');
            }
        });
        if (search) search.addEventListener('input', () => { q = search.value.trim().toLowerCase(); page = 1; view(); });
        // core toggles row selection on the bubbling input; read the result right after
        box.addEventListener('input', e => { if (e.target.type === 'checkbox') setTimeout(updateBulk, 0); });
        if (modal) modal.addEventListener('submit', e => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const rec = {};
            cols.forEach(c => { rec[c.key] = c.type === 'money' ? +fd.get(c.key) : fd.get(c.key); });
            if (editing) Object.assign(editing, rec);
            else rows.unshift(Object.assign({ _id: Date.now() }, rec));
            R.close(modal); view();
            R.toast({ kind: 'success', title: editing ? 'Saved' : 'Created', message: 'Record ' + (editing ? 'updated' : 'added') + '.' });
        });
        view();
    }
    R.register('crud', { init(scope) { scope.querySelectorAll('[data-crud]').forEach(setup); } });
})(window);

;
/* ===== js/runtime/apps.js ===== */
/* HBO runtime — kanban drag/drop, month calendar, countdown, todo add */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime, esc = HBO.esc;
    const timers = new Map();

    /* ---------- kanban (native HTML5 DnD) ---------- */
    let dragging = null;
    document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('.kanban-card'); if (!c) return; dragging = c; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    document.addEventListener('dragend', () => { if (dragging) dragging.classList.remove('dragging'); dragging = null; document.querySelectorAll('.kanban-col.drag-over').forEach(c => c.classList.remove('drag-over')); recount(); });
    document.addEventListener('dragover', e => {
        const col = e.target.closest && e.target.closest('.kanban-col');
        if (!col || !dragging) return;
        e.preventDefault();
        document.querySelectorAll('.kanban-col.drag-over').forEach(c => c !== col && c.classList.remove('drag-over'));
        col.classList.add('drag-over');
        const after = Array.from(col.querySelectorAll('.kanban-card:not(.dragging)')).find(c => e.clientY < c.getBoundingClientRect().top + c.offsetHeight / 2);
        if (after) col.insertBefore(dragging, after); else col.appendChild(dragging);
    });
    function recount() { document.querySelectorAll('.kanban-col').forEach(c => { const n = c.querySelector('[data-count]'); if (n) n.textContent = c.querySelectorAll('.kanban-card').length; }); }

    /* ---------- month calendar ---------- */
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function setupCal(cal) {
        if (cal._hbo) return; cal._hbo = true;
        const dataEl = cal.querySelector('[data-cal-events]');
        const base = new Date(); base.setDate(1);
        // events given as day offsets from the 1st of the current month so demos never look stale
        let events = dataEl ? JSON.parse(dataEl.textContent) : [];
        let view = new Date(base);
        const grid = cal.querySelector('.cal-grid'), title = cal.querySelector('[data-cal-title]');
        function render() {
            const y = view.getFullYear(), m = view.getMonth();
            const first = new Date(y, m, 1), start = new Date(y, m, 1 - ((first.getDay() + 6) % 7));
            title.textContent = `${MONTHS[m]} ${y}`;
            let html = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="cal-dow">${d}</div>`).join('');
            const today = new Date().toDateString();
            for (let k = 0; k < 42; k++) {
                const d = new Date(start); d.setDate(start.getDate() + k);
                const evs = events.filter(ev => { const ed = new Date(base); ed.setDate(1 + ev.day); return ed.toDateString() === d.toDateString(); });
                html += `<div class="cal-cell ${d.getMonth() !== m ? 'other' : ''} ${d.toDateString() === today ? 'today' : ''}" data-date="${d.toISOString().slice(0, 10)}"><span class="cal-num">${d.getDate()}</span>${evs.slice(0, 3).map(ev => `<div class="cal-event ${ev.kind || ''}" title="${esc(ev.title)}">${ev.time ? esc(ev.time) + ' ' : ''}${esc(ev.title)}</div>`).join('')}${evs.length > 3 ? `<div class="cal-more">+${evs.length - 3} more</div>` : ''}</div>`;
            }
            grid.innerHTML = html;
        }
        cal.addEventListener('click', e => {
            const nav = e.target.closest('[data-cal-nav]');
            if (nav) { const n = nav.dataset.calNav; if (n === 'today') view = new Date(base); else view.setMonth(view.getMonth() + (+n)); render(); return; }
            const cell = e.target.closest('.cal-cell');
            if (cell && !e.target.closest('.cal-event') && cal.hasAttribute('data-cal-add')) {
                const t = prompt('New event title'); if (!t) return;
                const d = new Date(cell.dataset.date + 'T00:00');
                const day = Math.round((d - new Date(base.getFullYear(), base.getMonth(), 1)) / 864e5);
                events.push({ day, title: t, kind: 'accent' }); render();
            }
        });
        render();
    }

    /* ---------- countdown ---------- */
    function setupCountdown(el) {
        if (el._hbo) return; el._hbo = true;
        const end = Date.now() + (+el.dataset.countdown || 30) * 864e5;
        const tick = () => {
            if (!el.isConnected) { clearInterval(timers.get(el)); timers.delete(el); return; }
            let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
            const parts = { days: Math.floor(s / 86400), hours: Math.floor(s % 86400 / 3600), minutes: Math.floor(s % 3600 / 60), seconds: s % 60 };
            Object.entries(parts).forEach(([k, v]) => { const n = el.querySelector(`[data-u="${k}"]`); if (n) n.textContent = String(v).padStart(2, '0'); });
        };
        tick(); timers.set(el, setInterval(tick, 1000));
    }

    /* ---------- todo add ---------- */
    document.addEventListener('submit', e => {
        const f = e.target.closest('form[data-todo-add]');
        if (!f) return;
        e.preventDefault();
        const input = f.querySelector('.input'), list = document.getElementById(f.dataset.todoAdd);
        if (!input.value.trim() || !list) return;
        const li = document.createElement('div');
        li.className = 'todo-item';
        li.innerHTML = `<label class="check"><input type="checkbox"></label><span class="priority med"></span><span class="todo-text">${esc(input.value.trim())}</span><span class="badge soft info">New</span><div class="todo-actions"><button class="btn btn-ghost btn-icon btn-sm" data-dismiss-todo aria-label="Delete"><i class="ph ph-trash"></i></button></div>`;
        list.prepend(li); input.value = '';
        R.applyIconWeight(li);
    });
    document.addEventListener('click', e => { const b = e.target.closest('[data-dismiss-todo]'); if (b) b.closest('.todo-item').remove(); });

    R.register('apps', {
        init(scope) {
            scope.querySelectorAll('.cal[data-cal]').forEach(setupCal);
            scope.querySelectorAll('[data-countdown]').forEach(setupCountdown);
            scope.querySelectorAll('.kanban-card').forEach(c => c.setAttribute('draggable', 'true'));
            recount();
        },
        teardown(scope) { timers.forEach((t, el) => { if (scope === document || scope.contains(el)) { clearInterval(t); timers.delete(el); } }); }
    });
})(window);

;
/* ===== js/runtime/charts.js ===== */
/* ============================================================
   HBO charts — dependency-free SVG charts styled by tokens.
   <div class="chart" data-chart='{"type":"line","labels":[...],"series":[{"name":"A","data":[...]}]}'></div>
   Types: line, area, bar, stacked, hbar, combo, donut, pie, gauge,
          spark, scatter, heatmap, radar
   ============================================================ */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime, esc = HBO.esc;
    const NS = 'http://www.w3.org/2000/svg';
    const observers = new Map();
    const col = i => `var(--chart-${(i % 8) + 1})`;

    const compact = v => { const a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' : a >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : (+v.toFixed(2)).toString(); };
    const fmt = (v, f) => f === '$' ? '$' + compact(v) : f === '%' ? (+v.toFixed(1)) + '%' : f === 'k' ? compact(v) : (+v).toLocaleString();
    function niceMax(max, ticks = 4) {
        if (max <= 0) return { max: 1, step: 0.25 };
        const raw = max / ticks, mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
        const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
        return { max: Math.ceil(max / step) * step, step };
    }
    function path(pts, smooth) {
        if (!pts.length) return '';
        if (!smooth || pts.length < 3) return 'M' + pts.map(p => p.join(',')).join('L');
        let d = `M${pts[0][0]},${pts[0][1]}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
            const t = 0.18;
            d += `C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
        }
        return d;
    }
    const arc = (cx, cy, r, a0, a1) => {
        const large = a1 - a0 > Math.PI ? 1 : 0;
        return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
    };

    function tokens(el) {
        const cs = getComputedStyle(el);
        const n = k => parseFloat(cs.getPropertyValue(k)) || 0;
        return { smooth: n('--chart-smooth') > 0, points: n('--chart-points') > 0, barR: n('--chart-bar-radius'), stroke: n('--chart-stroke') || 2 };
    }
    function config(el) {
        if (el._cfg) return el._cfg;
        let c = null;
        const s = el.querySelector('script[type="application/json"]');
        try { c = JSON.parse(s ? s.textContent : el.dataset.chart); } catch (e) { console.warn('[hbo chart] bad config', el); }
        el._cfg = c || { type: 'line', labels: [], series: [] };
        el._hidden = new Set();
        return el._cfg;
    }

    function render(el) {
        const cfg = config(el);
        const tk = tokens(el);
        const W = Math.max(160, Math.round(el.clientWidth || 600));
        const H = +(cfg.height || el.dataset.height || (cfg.type === 'spark' ? 48 : ['donut', 'pie', 'gauge', 'radar'].includes(cfg.type) ? 240 : 260));
        const series = (cfg.series || []).map((s, i) => Object.assign({ i }, s)).filter(s => !el._hidden.has(s.i));
        let svg = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.title || cfg.type + ' chart')}">`;
        const ctx = { el, cfg, tk, W, H, series, hits: [] };
        const fn = TYPES[cfg.type] || TYPES.line;
        svg += fn(ctx) + '</svg>';
        let legend = '';
        if (cfg.legend !== false && !['spark', 'gauge', 'heatmap'].includes(cfg.type)) {
            const items = ['donut', 'pie'].includes(cfg.type) ? (cfg.labels || []).map((l, i) => [l, i]) : (cfg.series || []).map((s, i) => [s.name || 'Series ' + (i + 1), i]);
            if (items.length > 1) legend = `<div class="chart-legend">${items.map(([l, i]) => `<span data-legend="${i}" class="${el._hidden.has(i) ? 'off' : ''}"><i style="background:${col(i)}"></i>${esc(l)}</span>`).join('')}</div>`;
        }
        el.innerHTML = svg + legend + '<div class="chart-tip"></div>';
        el._ctx = ctx;
    }

    /* ---------------- cartesian ---------------- */
    function frame(ctx, opts = {}) {
        const { cfg, W, H, series } = ctx;
        const labels = cfg.labels || [];
        const stacked = opts.stacked;
        let max = 0, min = 0;
        if (stacked) labels.forEach((_, k) => { max = Math.max(max, series.reduce((a, s) => a + (+s.data[k] || 0), 0)); });
        else series.forEach(s => s.data.forEach(v => { max = Math.max(max, +v); min = Math.min(min, +v); }));
        if (cfg.max) max = cfg.max;
        const nm = niceMax(max - Math.min(0, min));
        const yMin = min < 0 ? -Math.ceil(-min / nm.step) * nm.step : 0;
        const yMax = yMin + nm.max;
        const yLabelW = Math.max(28, fmt(yMax, cfg.yFormat).length * 7 + 8);
        const pad = { l: cfg.axis === false ? 4 : yLabelW, r: 10, t: 10, b: cfg.axis === false ? 4 : 26 };
        const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
        const y = v => pad.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
        let g = '<g class="hc-grid">';
        let ax = '<g class="hc-axis">';
        for (let v = yMin; v <= yMax + 1e-9; v += nm.step) {
            g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/>`;
            if (cfg.axis !== false) ax += `<text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${esc(fmt(v, cfg.yFormat))}</text>`;
        }
        const n = labels.length;
        const band = iw / Math.max(1, n);
        const xLine = k => pad.l + (n <= 1 ? iw / 2 : (k / (n - 1)) * iw);
        const xBand = k => pad.l + k * band + band / 2;
        const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
        if (cfg.axis !== false) labels.forEach((l, k) => { if (k % every === 0) ax += `<text x="${opts.band ? xBand(k) : xLine(k)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
        return { pad, iw, ih, y, xLine, xBand, band, n, yMin, grid: g + '</g>', axis: ax + '</g>' };
    }
    function lineSeries(ctx, f, s, area) {
        const pts = s.data.map((v, k) => [f.xLine(k), f.y(+v)]);
        const d = path(pts, ctx.tk.smooth);
        let out = '';
        if (area) {
            const id = 'g' + Math.random().toString(36).slice(2, 8);
            out += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${col(s.i)};stop-opacity:1"/><stop offset="1" style="stop-color:${col(s.i)};stop-opacity:0"/></linearGradient></defs>`;
            out += `<path class="hc-area" d="${d}L${pts[pts.length - 1][0]},${f.y(Math.max(0, f.yMin))}L${pts[0][0]},${f.y(Math.max(0, f.yMin))}Z" style="fill:url(#${id})"/>`;
        }
        out += `<path class="hc-line" d="${d}" style="stroke:${col(s.i)}${s.dashed ? ';stroke-dasharray:5 4' : ''}"/>`;
        if (ctx.tk.points && pts.length <= 40) out += pts.map(p => `<circle class="hc-point" cx="${p[0]}" cy="${p[1]}" r="${ctx.tk.stroke + 1.5}" style="fill:${col(s.i)}"/>`).join('');
        return out;
    }
    function bars(ctx, f, list, stacked, startIdx = 0, groupCount) {
        const r = ctx.tk.barR;
        const gc = groupCount || (stacked ? 1 : list.length);
        const bw = Math.max(3, Math.min(42, (f.band * 0.7) / gc));
        let out = '';
        f.labels = ctx.cfg.labels || [];
        f.labels.forEach((_, k) => {
            let acc = 0;
            list.forEach((s, j) => {
                const v = +s.data[k] || 0;
                const x = f.xBand(k) - (bw * gc) / 2 + (stacked ? 0 : (j + startIdx) * bw);
                const y0 = f.y(stacked ? acc + v : Math.max(0, v)), y1 = f.y(stacked ? acc : Math.min(0, v));
                acc += v;
                const h = Math.max(0, y1 - y0);
                const top = !stacked || j === list.length - 1;
                const rr = Math.min(r, bw / 2, h);
                out += top && rr > 0
                    ? `<path class="hc-bar" d="M${x},${y0 + h}V${y0 + rr}Q${x},${y0} ${x + rr},${y0}H${x + bw - (stacked ? 0 : 1) - rr}Q${x + bw - (stacked ? 0 : 1)},${y0} ${x + bw - (stacked ? 0 : 1)},${y0 + rr}V${y0 + h}Z" style="fill:${col(s.i)}"/>`
                    : `<rect class="hc-bar" x="${x}" y="${y0}" width="${bw - (stacked ? 0 : 1)}" height="${h}" style="fill:${col(s.i)}"/>`;
            });
        });
        return out;
    }
    const TYPES = {
        line(ctx) { const f = frame(ctx); ctx.frame = f; return f.grid + f.axis + ctx.series.map(s => lineSeries(ctx, f, s, false)).join('') + `<line class="hc-cursor" y1="${f.pad.t}" y2="${f.pad.t + f.ih}" x1="-10" x2="-10"/>`; },
        area(ctx) { const f = frame(ctx); ctx.frame = f; return f.grid + f.axis + ctx.series.map(s => lineSeries(ctx, f, s, true)).join('') + `<line class="hc-cursor" y1="${f.pad.t}" y2="${f.pad.t + f.ih}" x1="-10" x2="-10"/>`; },
        spark(ctx) { ctx.cfg.axis = false; const f = frame(ctx); ctx.frame = f; return ctx.series.map(s => lineSeries(ctx, f, s, true)).join(''); },
        bar(ctx) { const f = frame(ctx, { band: true }); ctx.frame = f; ctx.frame.band_ = true; return f.grid + f.axis + bars(ctx, f, ctx.series, false); },
        stacked(ctx) { const f = frame(ctx, { band: true, stacked: true }); ctx.frame = f; ctx.frame.band_ = true; return f.grid + f.axis + bars(ctx, f, ctx.series, true); },
        combo(ctx) {
            const f = frame(ctx, { band: true }); ctx.frame = f; ctx.frame.band_ = true;
            const b = ctx.series.filter(s => s.type !== 'line'), l = ctx.series.filter(s => s.type === 'line');
            f.xLine = f.xBand;
            return f.grid + f.axis + bars(ctx, f, b, false) + l.map(s => lineSeries(ctx, f, s, false)).join('');
        },
        hbar(ctx) {
            const { cfg, W, H, series } = ctx;
            const labels = cfg.labels || [], s = series[0];
            if (!s) return '';
            const max = niceMax(Math.max(...s.data.map(Number))).max;
            const lw = Math.min(140, Math.max(...labels.map(l => String(l).length)) * 7 + 10);
            const rowH = (H - 10) / labels.length, bh = Math.min(22, rowH * 0.6);
            let out = '<g class="hc-axis">';
            labels.forEach((l, k) => {
                const y = 5 + k * rowH + rowH / 2;
                const w = ((+s.data[k]) / max) * (W - lw - 60);
                out += `<text x="${lw - 8}" y="${y + 4}" text-anchor="end">${esc(l)}</text>`;
                out += `<rect class="hc-bar" x="${lw}" y="${y - bh / 2}" width="${Math.max(0, w)}" height="${bh}" rx="${Math.min(ctx.tk.barR, bh / 2)}" style="fill:${col(cfg.multicolor ? k : s.i)}"/>`;
                out += `<text x="${lw + w + 8}" y="${y + 4}">${esc(fmt(+s.data[k], cfg.yFormat))}</text>`;
            });
            return out + '</g>';
        },
        donut(ctx, pie) {
            const { cfg, W, H } = ctx;
            const s = (cfg.series || [])[0];
            if (!s) return '';
            const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 8, inner = pie ? 0 : r * (cfg.thickness ? 1 - cfg.thickness : 0.64);
            const vals = s.data.map((v, i) => (ctx.el._hidden.has(i) ? 0 : +v));
            const total = vals.reduce((a, b) => a + b, 0) || 1;
            let a = -Math.PI / 2, out = '';
            vals.forEach((v, i) => {
                if (!v) return;
                const a1 = a + (v / total) * Math.PI * 2 - 0.0001;
                const mid = (a + a1) / 2;
                const d = inner
                    ? `${arc(cx, cy, r, a, a1)} L${cx + inner * Math.cos(a1)},${cy + inner * Math.sin(a1)} A${inner},${inner} 0 ${a1 - a > Math.PI ? 1 : 0} 0 ${cx + inner * Math.cos(a)},${cy + inner * Math.sin(a)}Z`
                    : `M${cx},${cy} L${cx + r * Math.cos(a)},${cy + r * Math.sin(a)} ${arc(cx, cy, r, a, a1).replace(/^M[^A]+/, '')}Z`;
                out += `<path class="hc-slice" data-i="${i}" d="${d}" style="fill:${col(i)};transform-origin:${cx}px ${cy}px"/>`;
                ctx.hits.push({ i, mid });
                a = a1 + 0.0001;
            });
            if (!pie) {
                const cv = cfg.center ? cfg.center.value : fmt(total, cfg.yFormat), cl = cfg.center ? cfg.center.label : 'Total';
                out += `<text class="hc-center-value" x="${cx}" y="${cy + 4}" text-anchor="middle" style="font-size:${Math.round(r * 0.32)}px">${esc(cv)}</text><text class="hc-center-label" x="${cx}" y="${cy + r * 0.3}" text-anchor="middle" style="font-size:${Math.round(r * 0.13)}px">${esc(cl)}</text>`;
            }
            return out;
        },
        pie(ctx) { return TYPES.donut(ctx, true); },
        gauge(ctx) {
            const { cfg, W, H } = ctx;
            const v = +cfg.value || 0, max = +cfg.max || 100;
            const cx = W / 2, r = Math.min(W / 2, H) - 16, cy = Math.min(H - 14, r + 16);
            const sw = Math.max(10, r * 0.16);
            const a0 = Math.PI, a1 = Math.PI + Math.PI * Math.min(1, v / max);
            return `<path class="hc-track" d="${arc(cx, cy, r, Math.PI, 2 * Math.PI - 0.0001)}" style="stroke-width:${sw};stroke-linecap:round"/>
                <path d="${arc(cx, cy, r, a0, a1)}" style="fill:none;stroke:${col(cfg.color || 0)};stroke-width:${sw};stroke-linecap:round"/>
                <text class="hc-center-value" x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-size:${Math.round(r * 0.36)}px">${esc(cfg.display || fmt(v, cfg.yFormat))}</text>
                <text class="hc-center-label" x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:${Math.round(Math.max(11, r * 0.11))}px">${esc(cfg.label || '')}</text>`;
        },
        scatter(ctx) {
            const { W, H, series } = ctx;
            const pts = series.flatMap(s => s.data);
            const mx = niceMax(Math.max(...pts.map(p => p[0]))).max, my = niceMax(Math.max(...pts.map(p => p[1])));
            const pad = { l: 40, r: 10, t: 10, b: 24 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
            let out = '<g class="hc-grid">', ax = '<g class="hc-axis">';
            for (let v = 0; v <= my.max; v += my.step) { const y = pad.t + ih - (v / my.max) * ih; out += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>`; ax += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${compact(v)}</text>`; }
            for (let k = 0; k <= 4; k++) { const v = (mx / 4) * k; ax += `<text x="${pad.l + (k / 4) * iw}" y="${H - 6}" text-anchor="middle">${compact(v)}</text>`; }
            out += '</g>' + ax + '</g>';
            series.forEach(s => s.data.forEach(p => { out += `<circle class="hc-point" cx="${pad.l + (p[0] / mx) * iw}" cy="${pad.t + ih - (p[1] / my.max) * ih}" r="${p[2] || 5}" style="fill:${col(s.i)};fill-opacity:.75"/>`; }));
            return out;
        },
        heatmap(ctx) {
            const { cfg, W, H } = ctx;
            const rows = cfg.rows || [], labels = cfg.labels || [], m = cfg.data || [];
            const max = Math.max(...m.flat().map(Number)) || 1;
            const lw = 40, top = 4, bottom = 22, cw = (W - lw) / Math.max(1, labels.length), ch = (H - top - bottom) / Math.max(1, rows.length);
            let out = '<g class="hc-axis">';
            rows.forEach((r, i) => { out += `<text x="${lw - 6}" y="${top + i * ch + ch / 2 + 4}" text-anchor="end">${esc(r)}</text>`; });
            labels.forEach((l, j) => { if (labels.length < 16 || j % 2 === 0) out += `<text x="${lw + j * cw + cw / 2}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
            out += '</g>';
            m.forEach((row, i) => row.forEach((v, j) => { out += `<rect class="hc-heat" x="${lw + j * cw}" y="${top + i * ch}" width="${cw}" height="${ch}" rx="${Math.min(ctx.tk.barR, 4)}" style="fill:${col(cfg.color || 0)};fill-opacity:${(0.08 + 0.92 * (v / max)).toFixed(2)}"><title>${esc(rows[i])} · ${esc(labels[j])}: ${v}</title></rect>`; }));
            return out;
        },
        radar(ctx) {
            const { cfg, W, H, series } = ctx;
            const axes = cfg.labels || [], n = axes.length;
            const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 28;
            const max = cfg.max || niceMax(Math.max(...series.flatMap(s => s.data.map(Number)))).max;
            const pt = (k, v) => { const a = -Math.PI / 2 + (k / n) * Math.PI * 2; return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v]; };
            let out = '';
            [0.25, 0.5, 0.75, 1].forEach(t => { out += `<polygon class="hc-radar-grid" points="${axes.map((_, k) => pt(k, t).join(',')).join(' ')}"/>`; });
            out += '<g class="hc-grid">' + axes.map((_, k) => `<line x1="${cx}" y1="${cy}" x2="${pt(k, 1)[0]}" y2="${pt(k, 1)[1]}"/>`).join('') + '</g>';
            out += '<g class="hc-axis">' + axes.map((a, k) => { const p = pt(k, 1.13); return `<text x="${p[0]}" y="${p[1] + 4}" text-anchor="middle">${esc(a)}</text>`; }).join('') + '</g>';
            series.forEach(s => { const pts = s.data.map((v, k) => pt(k, v / max).join(',')).join(' '); out += `<polygon points="${pts}" style="fill:${col(s.i)};fill-opacity:var(--chart-fill-opacity);stroke:${col(s.i)};stroke-width:var(--chart-stroke)"/>`; });
            return out;
        }
    };

    /* ---------------- interaction ---------------- */
    function onMove(e) {
        const el = e.currentTarget, ctx = el._ctx;
        if (!ctx) return;
        const tip = el.querySelector('.chart-tip');
        const svg = el.querySelector('svg');
        if (!tip || !svg) return;
        const box = svg.getBoundingClientRect(), sx = ctx.W / box.width;
        const mx = (e.clientX - box.left) * sx;
        const cfg = ctx.cfg;
        if (['donut', 'pie'].includes(cfg.type)) {
            const sl = e.target.closest('.hc-slice');
            if (!sl) { tip.classList.remove('show'); return; }
            const i = +sl.dataset.i, s = cfg.series[0], total = s.data.reduce((a, b) => a + +b, 0);
            tip.innerHTML = `<b>${esc(cfg.labels[i])}</b><i style="background:${col(i)}"></i>${esc(fmt(+s.data[i], cfg.yFormat))} · ${((s.data[i] / total) * 100).toFixed(1)}%`;
        } else if (ctx.frame && cfg.labels && cfg.labels.length) {
            const f = ctx.frame, n = cfg.labels.length;
            const k = f.band_ ? Math.floor((mx - f.pad.l) / f.band) : Math.round(((mx - f.pad.l) / f.iw) * (n - 1));
            if (k < 0 || k >= n) { tip.classList.remove('show'); return; }
            const cur = el.querySelector('.hc-cursor');
            if (cur) { const x = f.band_ ? f.xBand(k) : f.xLine(k); cur.setAttribute('x1', x); cur.setAttribute('x2', x); }
            tip.innerHTML = `<b>${esc(cfg.labels[k])}</b>` + ctx.series.map(s => `<div><i style="background:${col(s.i)}"></i>${esc(s.name || '')} ${esc(fmt(+s.data[k], cfg.yFormat))}</div>`).join('');
        } else return;
        tip.classList.add('show');
        const er = el.getBoundingClientRect();
        let x = e.clientX - er.left + 14, y = e.clientY - er.top - 10;
        if (x + tip.offsetWidth > er.width) x = e.clientX - er.left - tip.offsetWidth - 14;
        tip.style.left = x + 'px'; tip.style.top = y + 'px';
    }
    function onLeave(e) { const t = e.currentTarget.querySelector('.chart-tip'); t && t.classList.remove('show'); const c = e.currentTarget.querySelector('.hc-cursor'); if (c) { c.setAttribute('x1', -10); c.setAttribute('x2', -10); } }
    function onClick(e) {
        const lg = e.target.closest('[data-legend]');
        if (!lg) return;
        const el = e.currentTarget, i = +lg.dataset.legend;
        el._hidden.has(i) ? el._hidden.delete(i) : el._hidden.add(i);
        render(el);
    }

    function setup(el) {
        if (el._hboChart) { render(el); return; }
        el._hboChart = true;
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('click', onClick);
        render(el);
        if ('ResizeObserver' in root) {
            let w = el.clientWidth, raf = 0;
            const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) < 2) return; w = el.clientWidth; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => render(el)); });
            ro.observe(el); observers.set(el, ro);
        }
    }
    HBO.charts = { render: (el, cfg) => { if (cfg) { el._cfg = cfg; el._hidden = new Set(); } setup(el); }, types: Object.keys(TYPES) };
    R.register('charts', {
        init(scope) { scope.querySelectorAll('.chart[data-chart], .chart > script[type="application/json"]').forEach(n => setup(n.classList.contains('chart') ? n : n.parentElement)); },
        teardown(scope) { observers.forEach((ro, el) => { if (scope === document || scope.contains(el)) { ro.disconnect(); observers.delete(el); } }); }
    });
    // smoothing / points / radius are geometry → re-render when the theme changes
    let pending = 0;
    HBO.on('hbo:themechange', () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(() => document.querySelectorAll('.chart').forEach(el => el._hboChart && render(el))); });
})(window);

;
/* ===== js/runtime/map.js ===== */
/* ============================================================
   HBO map — SVG world map (needs assets/maps/world.js)
   <div class="map" data-map='{"style":"choropleth","values":{"Brazil":40},"markers":[{"lon":-74,"lat":40.7,"label":"NYC"}]}'></div>
   Styles: choropleth | dots | markers   (colors from --map-* tokens)
   ============================================================ */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime, esc = HBO.esc;
    const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
    let dotCache = null;

    /** lon/lat -> svg coords, same Equal Earth projection used to build world.js */
    function project(lon, lat) {
        const W = root.HBO_WORLD ? root.HBO_WORLD.w : 1000, H = root.HBO_WORLD ? root.HBO_WORLD.h : 487;
        const S = W / (2 * 2.7064);
        const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
        const th = Math.asin(M * Math.sin(p)), t2 = th * th, t6 = t2 * t2 * t2;
        const x = l * Math.cos(th) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
        const y = th * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
        return [W / 2 + x * S, H / 2 - y * S];
    }

    function bucket(v, max) { return v == null ? 0 : Math.max(1, Math.min(5, Math.ceil((v / max) * 5))); }

    function dots(svg, step) {
        if (dotCache && dotCache.step === step) return dotCache.list;
        const paths = Array.from(svg.querySelectorAll('path[data-n]'));
        const boxes = paths.map(p => p.getBBox());
        const W = root.HBO_WORLD.w, H = root.HBO_WORLD.h, list = [];
        const pt = svg.createSVGPoint ? svg.createSVGPoint() : null;
        for (let y = step / 2; y < H; y += step) {
            for (let x = step / 2; x < W; x += step) {
                for (let i = 0; i < paths.length; i++) {
                    const b = boxes[i];
                    if (x < b.x || x > b.x + b.width || y < b.y || y > b.y + b.height) continue;
                    pt.x = x; pt.y = y;
                    if (paths[i].isPointInFill(pt)) { list.push([x, y, paths[i].dataset.n]); break; }
                }
            }
        }
        dotCache = { step, list };
        return list;
    }

    function render(el) {
        const world = root.HBO_WORLD;
        if (!world) { el.innerHTML = '<div class="empty-state"><i class="ph ph-globe-hemisphere-west"></i><p>Map data (assets/maps/world.js) is not loaded.</p></div>'; return; }
        let cfg = el._cfg;
        if (!cfg) { try { cfg = JSON.parse(el.dataset.map || '{}'); } catch (e) { cfg = {}; } el._cfg = cfg; }
        const values = cfg.values || {};
        const max = Math.max(1, ...Object.values(values));
        const style = cfg.style || 'choropleth';
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${world.w} ${world.h}" role="img" aria-label="World map">`;
        svg += world.countries.map(c => `<path data-n="${esc(c.n)}" data-v="${bucket(values[c.n], max)}" d="${c.d}"><title>${esc(c.n)}${values[c.n] != null ? ': ' + esc(cfg.format === '$' ? '$' + values[c.n].toLocaleString() : values[c.n].toLocaleString()) : ''}</title></path>`).join('');
        svg += '<g class="hm-dots"></g><g class="hm-overlay"></g></svg>';
        el.classList.toggle('dots', style === 'dots');
        el.innerHTML = svg + (cfg.legend !== false && Object.keys(values).length ? `<div class="map-legend"><span>Low</span><span class="ramp">${[1, 2, 3, 4, 5].map(i => `<span style="background:var(--map-${i})"></span>`).join('')}</span><span>High</span></div>` : '');
        const s = el.querySelector('svg');
        if (style === 'dots') {
            requestAnimationFrame(() => {
                const list = dots(s, cfg.step || 9);
                s.querySelector('.hm-dots').innerHTML = list.map(([x, y, n]) => `<circle class="hm-dot" cx="${x}" cy="${y}" r="${(cfg.step || 9) * 0.36}" data-v="${values[n] != null ? bucket(values[n], max) : 1}"/>`).join('');
            });
        }
        let ov = '';
        (cfg.arcs || []).forEach(([a, b]) => {
            const p = project(a[0], a[1]), q = project(b[0], b[1]);
            const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2 - Math.hypot(q[0] - p[0], q[1] - p[1]) * 0.25;
            ov += `<path class="hm-arc" d="M${p[0]},${p[1]} Q${mx},${my} ${q[0]},${q[1]}"/>`;
        });
        (cfg.markers || []).forEach(m => {
            const [x, y] = project(m.lon, m.lat), r = m.size || 4;
            ov += `<circle class="hm-pulse" cx="${x}" cy="${y}" r="${r * 2.2}"/><circle class="hm-marker" cx="${x}" cy="${y}" r="${r}"><title>${esc(m.label || '')}</title></circle>`;
            if (m.label && cfg.labels !== false) ov += `<text class="hm-label" x="${x + r + 4}" y="${y + 3}">${esc(m.label)}</text>`;
        });
        s.querySelector('.hm-overlay').innerHTML = ov;
    }
    HBO.map = { render: (el, cfg) => { if (cfg) el._cfg = cfg; render(el); }, project };
    R.register('map', { init(scope) { scope.querySelectorAll('.map[data-map]').forEach(render); } });
})(window);

;
/* ===== js/runtime/specimen.js ===== */
/* HBO runtime — font browser + live token swatches (Foundations pages) */
(function (root) {
    'use strict';
    const HBO = root.HBO, R = HBO.runtime, esc = HBO.esc, C = HBO.color;

    function fontBrowser(box) {
        if (box._hbo) return; box._hbo = true;
        const grid = box.querySelector('[data-font-grid]'), search = box.querySelector('[data-font-search]'), sample = box.querySelector('[data-font-sample]');
        let cat = 'all';
        const render = () => {
            const q = (search.value || '').trim().toLowerCase();
            const text = (sample && sample.value) || 'The quick brown fox jumps over the lazy dog';
            const list = HBO.fonts.catalog.filter(f => (cat === 'all' || f.category === cat) && (!q || f.family.toLowerCase().includes(q)));
            HBO.fonts.preview(list.filter(f => f.google).map(f => f.family).slice(0, 60));
            grid.innerHTML = list.map(f => `<div class="card font-card"><div class="meta"><b style="color:var(--text-primary)">${esc(f.family)}</b><span>${esc(HBO.fonts.categories[f.category])} · ${f.weights.length} weights</span></div><div class="sample" style="font-family:${esc(HBO.fonts.stack(f.family))}">${esc(text)}</div><div class="row"><button class="btn btn-sm" data-copy="${esc(HBO.fonts.stack(f.family))}">Copy stack</button>${f.google ? `<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="https://fonts.google.com/specimen/${esc(f.family.replace(/ /g, '+'))}">Google Fonts ↗</a>` : ''}</div></div>`).join('');
            const n = box.querySelector('[data-font-count]'); if (n) n.textContent = list.length + ' fonts';
        };
        box.addEventListener('click', e => { const b = e.target.closest('[data-font-cat]'); if (!b) return; cat = b.dataset.fontCat; box.querySelectorAll('[data-font-cat]').forEach(x => x.classList.toggle('active', x === b)); render(); });
        search.addEventListener('input', render);
        if (sample) sample.addEventListener('input', render);
        render();
    }

    function swatches(box) {
        const cs = getComputedStyle(document.documentElement);
        const bg = C.toHex(cs.getPropertyValue('--bg-base').trim());
        box.querySelectorAll('[data-token]').forEach(t => {
            const name = t.dataset.token, val = cs.getPropertyValue(name).trim();
            const hex = C.toHex(val);
            const info = t.querySelector('.info');
            const on = cs.getPropertyValue(name.replace('--color-', '--on-')).trim();
            if (info) info.innerHTML = `<b>${esc(name)}</b><br><code>${esc(hex)}</code> · ${C.contrast(hex, bg).toFixed(2)}:1 on bg${on && name.startsWith('--color-') ? ` · on-color <span style="color:${esc(on)};background:${esc(val)};padding:0 4px;border-radius:3px">Aa</span>` : ''}`;
        });
    }
    R.register('specimen', {
        init(scope) {
            scope.querySelectorAll('[data-font-browser]').forEach(fontBrowser);
            scope.querySelectorAll('[data-token-swatches]').forEach(swatches);
        }
    });
    HBO.on('hbo:themechange', () => requestAnimationFrame(() => document.querySelectorAll('[data-token-swatches]').forEach(swatches)));
})(window);
