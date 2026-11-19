/* =====================================================================
   CONFIGURACIÓN (lo que puedes editar sin tocar el resto)
   ===================================================================== */
const CONFIG = {
  corazones: 7,          // cuántos corazones tiene el medidor (pantalla 1)
  vueltas: 3,            // vueltas completas de la rueda para llenarlo
  cancion: "img/audio/cancion.mp3", // ← ruta de tu canción (pon el archivo en la carpeta audio/)
  cartaSegundos: 3,      // cuánto tarda en escribirse la carta
  velocidadBurbujas: 0.00014, // giro de las burbujas (pantalla 3.1)
};

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const quieto = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pantallas = $$(".pantalla");
  let rafOrbita = 0, rafCarta = 0;

  /* ---------- aviso ---------- */
  let tAviso;
  function aviso(t) {
    const a = $("#aviso"); a.textContent = t; a.classList.add("ver");
    clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove("ver"), 3500);
  }

  /* ---------- navegación ---------- */
  function ir(id) {
    if (!$(`[data-pantalla="${id}"]`)) id = "1";
    pantallas.forEach(p => p.classList.toggle("activa", p.dataset.pantalla === id));
    cancelAnimationFrame(rafOrbita); cancelAnimationFrame(rafCarta);
    if (id !== "3.3") pausar();
    if (id === "3.1") iniciarBurbujas();
    if (id === "3.4") iniciarCarta();
    history.replaceState(null, "", "#" + id);
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-ir]"); if (b) ir(b.dataset.ir);
  });

  /* ---------- PANTALLA 1 · rueda y corazones ---------- */
  document.body.insertAdjacentHTML("beforeend",
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="crayon"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></svg>`);
  const heart = '<svg viewBox="0 0 32 30"><path d="M16 28C4 18 1 11 5 6c4-4 9-2 11 2 2-4 7-6 11-2 4 5 1 12-11 22z"/></svg>';
  const medidor = $("#medidor"), rueda = $("#rueda"), nota = $("#nota-1");
  medidor.innerHTML = Array.from({ length: CONFIG.corazones }, () =>
    `<span class="corazon"><i class="base">${heart}</i><i class="relleno">${heart}</i></span>`).join("");
  const cors = $$(".corazon", medidor);
  let ang = 0, total = 0, ultimo = null, llena = false, reposo;

  /* serpentinas y flores al llenar el medidor */
  function confeti() {
    if (quieto) return;
    const cols = ["#f2b5b5", "#f4c96b", "#cfe0bd", "#d98f8c", "#e9d5ea"];
    for (let i = 0; i < 46; i++) {
      const flor = i % 4 === 0;
      const e = document.createElement(flor ? "img" : "i");
      e.className = "confeti";
      if (flor) e.src = "img/peonia.svg"; else e.style.background = cols[i % cols.length];
      e.style.left = Math.random() * 100 + "vw";
      e.style.setProperty("--dx", (Math.random() - .5) * 160 + "px");
      e.style.setProperty("--giro", (Math.random() - .5) * 900 + "deg");
      e.style.animationDelay = Math.random() * .8 + "s";
      e.style.animationDuration = 2.5 + Math.random() * 2 + "s";
      document.body.appendChild(e);
      setTimeout(() => e.remove(), 6000);
    }
  }

  function actualizar() {
    const p = Math.min(1, total / (2 * Math.PI * CONFIG.vueltas));
    cors.forEach((c, i) => c.style.setProperty("--p", Math.max(0, Math.min(1, p * cors.length - i)) * 100 + "%"));
    medidor.setAttribute("aria-valuenow", Math.round(p * 100));
    if (!quieto) {   // los corazones se balancean mientras gira la rueda
      cors.forEach((c, i) => c.style.transform = `rotate(${Math.sin(total * 2.5 + i * 0.5) * 14}deg)`);
      clearTimeout(reposo);
      reposo = setTimeout(() => cors.forEach(c => c.style.transform = ""), 250);
    }
    if (p >= 1 && !llena) {
      llena = true; nota.textContent = nota.dataset.completo;
      confeti();
      setTimeout(() => ir("2"), 1800);
    }
  }
  function girar(d) { if (llena) return; ang += d; total += Math.abs(d); rueda.style.transform = `rotate(${ang}rad)`; actualizar(); }
  const angulo = e => { const r = rueda.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)); };
  rueda.addEventListener("pointerdown", e => { rueda.setPointerCapture(e.pointerId); ultimo = angulo(e); });
  rueda.addEventListener("pointermove", e => {
    if (ultimo === null) return;
    const a = angulo(e); let d = a - ultimo;
    if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    ultimo = a; girar(d);
  });
  ["pointerup", "pointercancel"].forEach(ev => rueda.addEventListener(ev, () => ultimo = null));
  rueda.addEventListener("keydown", e => { if (["ArrowRight", "ArrowDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); girar(0.35); } });

  /* ---------- PANTALLA 3.1 · burbujas en órbita ---------- */
  function iniciarBurbujas() {
    const o = $("#orbita"), bs = $$(".burbuja", o), n = bs.length, t0 = performance.now();
    bs.forEach(b => b.style.opacity = 0);
    (function frame(t) {
      const R = o.clientWidth / 2, rad = R * 0.84, dt = t - t0;
      bs.forEach((b, i) => {
        const k = quieto ? 1 : Math.min(1, Math.max(0, (dt - i * 350) / 1800));
        const e = 1 - Math.pow(1 - k, 3);
        const a = (i / n) * 2 * Math.PI - Math.PI / 2 + (quieto ? 0 : dt * CONFIG.velocidadBurbujas);
        const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
        const x0 = (i % 2 ? 1 : -1) * R * 2.6;       // entran desde los lados
        b.style.transform = `translate(${x0 + (x - x0) * e}px,${y}px) translate(-50%,-50%)`;
        b.style.opacity = e;
      });
      rafOrbita = requestAnimationFrame(frame);
    })(t0);
  }

  /* ---------- PANTALLA 3.3 · reproductor (archivo de audio local) ---------- */
  const portada = $("#portada"), repro = $("#reproductor");
  const audio = new Audio(CONFIG.cancion);
  audio.preload = "auto";
  const estado = on => repro.classList.toggle("sonando", on);
  audio.addEventListener("play", () => estado(true));
  audio.addEventListener("pause", () => estado(false));
  audio.addEventListener("ended", () => estado(false));
  audio.addEventListener("error", () => { estado(false); aviso("No encuentro la canción: revisa que exista " + CONFIG.cancion); });
  function pausar() { audio.pause(); }
  portada.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => aviso("No pude reproducir la canción: revisa " + CONFIG.cancion));
    else audio.pause();
  });

  /* ---------- PANTALLA 3.4 · carta que se escribe ---------- */
  const box = $("#carta-texto"), hoja = $("#hoja"), interior = $("#hoja-interior"), mano = $("#mano");
  const parrafos = $$("p", box).map(p => p.textContent.trim());
  const largo = parrafos.reduce((s, p) => s + p.length, 0);

  function pintar(n) {
    let resto = n, punta = null;
    box.replaceChildren(...parrafos.map((txt, i) => {
      const p = document.createElement("p"); p.textContent = txt.slice(0, Math.max(0, resto));
      if (!punta && (resto < txt.length || i === parrafos.length - 1) && resto >= 0) {
        punta = document.createElement("span"); p.appendChild(punta);
      }
      resto -= txt.length; return p;
    }));
    if (punta) {
      const a = interior.getBoundingClientRect(), m = punta.getBoundingClientRect();
      mano.style.left = (m.left - a.left) + "px"; mano.style.top = (m.bottom - a.top) + "px";
      hoja.scrollTop = Math.max(0, (m.bottom - a.top) - hoja.clientHeight + 50);
    }
  }
  function iniciarCarta() {
    mano.classList.remove("oculta");
    if (quieto) return terminarCarta();
    const t0 = performance.now(), dur = CONFIG.cartaSegundos * 1000;
    (function f(t) {
      const k = Math.min(1, (t - t0) / dur);
      pintar(Math.round(k * largo));
      if (k < 1) rafCarta = requestAnimationFrame(f); else terminarCarta();
    })(t0);
  }
  function terminarCarta() {
    cancelAnimationFrame(rafCarta); pintar(largo); setTimeout(() => mano.classList.add("oculta"), 400);
  }
  hoja.addEventListener("click", terminarCarta);

  /* ---------- inicio (permite index.html#3.2 para editar) ---------- */
  ir(location.hash.slice(1) || "1");
})();