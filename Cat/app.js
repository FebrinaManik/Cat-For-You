/* Cat Story Builder (MVP)
   - Custom 2 cats (SVG recolor via CSS variables)
   - Click interaction
   - Next -> story sequence (yarn, nuzzle hearts, leave, return with basket + fish + scroll message)
   - ✅ If name filled: show name tags + used in story dialogs + signed in scroll message
*/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ✅ BASE KALIMAT (FIXED), tapi nanti bisa ditambah signature nama otomatis */
const BASE_MESSAGE_SINGULAR =
  "Semangat sekolahnya, Bocil! Jangan kebangetan imutnya.. 😼🧶💛";

const BASE_MESSAGE_PLURAL =
  "Semangat sekolahnya, Bocil! Jangan kebangetan imutnya.. 😼🧶💛";

const scene = $("#scene");
const yarnBall = $("#yarnBall");
const heartsLayer = $("#heartsLayer");
const speech = $("#speech");
const stageActions = $("#stageActions");

const catTemplate = $("#catTemplate");
const carryTemplate = $("#carryTemplate");

const nextBtn = $("#nextBtn");
const resetBtn = $("#resetBtn");
const replayBtn = $("#replayBtn");
const backBtn = $("#backBtn");

const state = {
  playing: false,
  cats: {
    1: {
      name: "",
      breed: "british",
      fur: "#f2c28f",
      accent: "#7a5137",
      outfit: "hoodie",
      outfitColor: "#7ad3ff",
      accessory: "none",
    },
    2: {
      name: "",
      breed: "calico",
      fur: "#ffe2c2",
      accent: "#b25a3c",
      outfit: "sweater",
      outfitColor: "#ffd166",
      accessory: "bow",
    },
  },
};

const catsDOM = {
  1: { slot: $("#cat1Slot"), wrapper: null, carry: null, nameTag: null },
  2: { slot: $("#cat2Slot"), wrapper: null, carry: null, nameTag: null },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp255(n) {
  return Math.max(0, Math.min(255, n));
}

function hexToRgb(hex) {
  let h = String(hex || "").trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return { r: 0, g: 0, b: 0 };
  const num = parseInt(h, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const to2 = (n) => clamp255(n).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function shiftColor(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({ r: r + amt, g: g + amt, b: b + amt });
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function toSceneXY(clientX, clientY) {
  const s = scene.getBoundingClientRect();
  return { x: clientX - s.left, y: clientY - s.top };
}

function clearAnimations(el) {
  if (!el) return;
  el.getAnimations().forEach((a) => a.cancel());
}

function setSlotClasses(slot, prefix, value) {
  const toRemove = [];
  slot.classList.forEach((c) => {
    if (c.startsWith(prefix + "-")) toRemove.push(c);
  });
  toRemove.forEach((c) => slot.classList.remove(c));
  slot.classList.add(`${prefix}-${value}`);
}

function getRawName(id) {
  return (state.cats[id].name || "").trim();
}

function getCatName(id) {
  // untuk dialog, fallback ke "Kucing 1/2"
  return getRawName(id) || `Kucing ${id}`;
}

function updateNameTag(id) {
  const tag = catsDOM[id].nameTag;
  if (!tag) return;

  const raw = getRawName(id);
  if (raw) {
    tag.textContent = raw;
    tag.classList.remove("hidden");
  } else {
    tag.textContent = "";
    tag.classList.add("hidden");
  }
}

function buildScrollMessage() {
  const n1 = getRawName(1);
  const n2 = getRawName(2);

  const hasAny = Boolean(n1 || n2);
  const hasBoth = Boolean(n1 && n2);

  const base = hasBoth ? BASE_MESSAGE_PLURAL : BASE_MESSAGE_SINGULAR;

  if (!hasAny) return base;

  if (hasBoth) return `${base}\n\n— ${n1} & ${n2}`;
  return `${base}\n\n— ${n1 || n2}`;
}

function applyCat(catId) {
  const cfg = state.cats[catId];
  const { slot } = catsDOM[catId];

  const furLight = shiftColor(cfg.fur, 28);
  const furDark = shiftColor(cfg.fur, -38);

  const accent2 = shiftColor(cfg.accent, -24);
  const accent3 = shiftColor(cfg.accent, 18);

  const outfitEdge = shiftColor(cfg.outfitColor, -42);

  slot.style.setProperty("--fur", cfg.fur);
  slot.style.setProperty("--furLight", furLight);
  slot.style.setProperty("--furDark", furDark);

  slot.style.setProperty("--accent", cfg.accent);
  slot.style.setProperty("--accent2", accent2);
  slot.style.setProperty("--accent3", accent3);

  slot.style.setProperty("--outfit", cfg.outfitColor);
  slot.style.setProperty("--outfitEdge", outfitEdge);

  slot.style.setProperty("--acc", shiftColor(cfg.outfitColor, 22));

  setSlotClasses(slot, "breed", cfg.breed);

  ["hoodie", "sweater", "dress", "none"].forEach((o) => slot.classList.remove(`outfit-${o}`));
  slot.classList.add(`outfit-${cfg.outfit}`);

  ["none", "bow", "hat"].forEach((a) => slot.classList.remove(`acc-${a}`));
  slot.classList.add(`acc-${cfg.accessory}`);

  // ✅ refresh name tag visibility/text
  updateNameTag(catId);
}

function mountCats() {
  [1, 2].forEach((id) => {
    const slot = catsDOM[id].slot;
    slot.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "cat-wrapper";

    // ✅ name tag
    const nameTag = document.createElement("div");
    nameTag.className = "name-tag hidden";
    wrapper.appendChild(nameTag);

    const svg = catTemplate.content.firstElementChild.cloneNode(true);
    wrapper.appendChild(svg);

    let carry = null;
    if (id === 2) {
      carry = carryTemplate.content.firstElementChild.cloneNode(true);
      wrapper.appendChild(carry);
    }

    slot.appendChild(wrapper);

    catsDOM[id].wrapper = wrapper;
    catsDOM[id].carry = carry;
    catsDOM[id].nameTag = nameTag;

    wrapper.addEventListener("click", () => onCatClicked(id));
  });

  applyCat(1);
  applyCat(2);
}

function showSpeech(text, nearSlotEl) {
  clearAnimations(speech);

  const sRect = scene.getBoundingClientRect();
  const cRect = nearSlotEl.getBoundingClientRect();

  const x = (cRect.left + cRect.width * 0.28) - sRect.left;
  const y = (cRect.top + cRect.height * 0.10) - sRect.top;

  speech.style.left = `${Math.max(10, x)}px`;
  speech.style.top = `${Math.max(10, y)}px`;
  speech.textContent = text;
  speech.classList.remove("hidden");

  speech.animate(
    [
      { transform: "translateY(6px)", opacity: 0 },
      { transform: "translateY(0)", opacity: 1 },
    ],
    { duration: 220, easing: "ease-out", fill: "forwards" }
  );

  setTimeout(() => {
    speech.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-6px)" },
      ],
      { duration: 220, easing: "ease-in", fill: "forwards" }
    ).finished.then(() => speech.classList.add("hidden"));
  }, 1400);
}

function onCatClicked(id) {
  if (state.playing) return;

  const name = getCatName(id);

  const lines = [
    `${name}: meooong~ 😺`,
    `${name}: prrr… (mode gemes aktif)`,
    `${name}: klik lagi dong 😼`,
    `${name}: aku lucu kan?`,
  ];

  const w = catsDOM[id].wrapper;
  clearAnimations(w);
  w.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(-10px)" },
      { transform: "translateY(0)" },
    ],
    { duration: 420, easing: "ease-out" }
  );

  showSpeech(lines[Math.floor(Math.random() * lines.length)], catsDOM[id].slot);
}

function clearHearts() {
  heartsLayer.innerHTML = "";
}

function spawnHearts(midClientX, midClientY, count = 10) {
  const base = toSceneXY(midClientX, midClientY);

  for (let i = 0; i < count; i++) {
    const h = document.createElement("div");
    h.className = "heart";
    h.style.left = `${base.x + rand(-18, 18)}px`;
    h.style.top = `${base.y + rand(-12, 12)}px`;
    heartsLayer.appendChild(h);

    const dx = rand(-55, 55);
    const dur = rand(900, 1450);

    h.animate(
      [
        { transform: "translate(0,0) rotate(45deg) scale(0.6)", opacity: 0 },
        { transform: `translate(${dx}px, -40px) rotate(45deg) scale(1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx * 1.1}px, -140px) rotate(45deg) scale(1.05)`, opacity: 0 },
      ],
      { duration: dur, easing: "ease-out", fill: "forwards" }
    ).finished.then(() => h.remove());
  }
}

async function animateBall(fromX, toX, y) {
  yarnBall.style.left = `${fromX}px`;
  yarnBall.style.top = `${y}px`;
  yarnBall.classList.remove("hidden");

  clearAnimations(yarnBall);

  const dx = toX - fromX;
  const rot = dx >= 0 ? 360 : -360;

  await yarnBall.animate(
    [
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: `translate(${dx * 0.5}px,-14px) rotate(${rot * 0.5}deg)`, offset: 0.5 },
      { transform: `translate(${dx}px,0) rotate(${rot}deg)` },
    ],
    { duration: 820, easing: "ease-in-out", fill: "forwards" }
  ).finished;

  yarnBall.style.left = `${toX}px`;
  yarnBall.style.top = `${y}px`;
  clearAnimations(yarnBall);
}

function computeBallTargets() {
  const s = scene.getBoundingClientRect();
  const c1 = catsDOM[1].slot.getBoundingClientRect();
  const c2 = catsDOM[2].slot.getBoundingClientRect();

  const y = Math.min(c1.bottom, c2.bottom) - s.top - 54;

  const startX = (c1.left - s.left) + c1.width * 0.70;
  const endX = (c2.left - s.left) + c2.width * 0.30;

  return { startX, endX, y };
}

async function playYarn() {
  const { startX, endX, y } = computeBallTargets();

  await animateBall(startX, endX, y);
  await sleep(120);
  await animateBall(endX, startX, y);
  await sleep(120);
  await animateBall(startX, endX, y);
  await sleep(100);
}

async function nuzzleAndHearts() {
  const w1 = catsDOM[1].wrapper;
  const w2 = catsDOM[2].wrapper;

  clearAnimations(w1);
  clearAnimations(w2);

  const a1 = w1.animate(
    [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(14px) rotate(-2deg)" },
      { transform: "translateX(0) rotate(0deg)" },
    ],
    { duration: 900, easing: "ease-in-out" }
  );

  const a2 = w2.animate(
    [
      { transform: "translateX(0) rotate(0deg)" },
      { transform: "translateX(-10px) rotate(2deg)" },
      { transform: "translateX(0) rotate(0deg)" },
    ],
    { duration: 900, easing: "ease-in-out" }
  );

  const c1 = catsDOM[1].slot.getBoundingClientRect();
  const c2 = catsDOM[2].slot.getBoundingClientRect();
  const midX = (c1.right + c2.left) / 2;
  const midY = (c1.top + c2.top) / 2 + 80;

  spawnHearts(midX, midY, 12);

  await Promise.all([a1.finished, a2.finished]);
}

async function unrollAndType(text) {
  const carry = catsDOM[2].carry;
  if (!carry) return;

  const fish = carry.querySelector(".fish");
  const scroll = carry.querySelector(".scroll");
  const paper = carry.querySelector(".paper");
  const textEl = carry.querySelector(".scroll-text");

  fish.classList.remove("hidden");
  clearAnimations(fish);

  await fish.animate(
    [
      { transform: "translateY(-10px) scale(0.6)", opacity: 0 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    { duration: 520, easing: "ease-out", fill: "forwards" }
  ).finished;

  scroll.classList.remove("hidden");
  textEl.textContent = "";

  clearAnimations(paper);
  await paper.animate(
    [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
    { duration: 900, easing: "ease-in-out", fill: "forwards" }
  ).finished;

  const msg = (text || "").trim();
  for (let i = 0; i < msg.length; i++) {
    textEl.textContent += msg[i];
    await sleep(26);
  }
}

function lockControls(locked) {
  const all = $$("input, select, button", $("#controls"));
  all.forEach((el) => {
    el.disabled = locked;
  });
}

function resetStageVisual() {
  clearHearts();
  speech.classList.add("hidden");
  yarnBall.classList.add("hidden");

  [catsDOM[1].slot, catsDOM[2].slot, catsDOM[1].wrapper, catsDOM[2].wrapper, yarnBall].forEach(clearAnimations);

  catsDOM[1].slot.style.transform = "";
  catsDOM[2].slot.style.transform = "";
  catsDOM[1].wrapper.style.transform = "";
  catsDOM[2].wrapper.style.transform = "";

  if (catsDOM[2].carry) {
    catsDOM[2].carry.classList.add("hidden");
    catsDOM[2].carry.querySelector(".fish")?.classList.add("hidden");
    catsDOM[2].carry.querySelector(".scroll")?.classList.add("hidden");

    const paper = catsDOM[2].carry.querySelector(".paper");
    if (paper) paper.style.transform = "scaleX(0)";
    const textEl = catsDOM[2].carry.querySelector(".scroll-text");
    if (textEl) textEl.textContent = "";
  }

  stageActions.classList.add("hidden");
}

function getStoryDistances() {
  const s = scene.getBoundingClientRect();
  const w = s.width;

  const centerShift = Math.min(120, Math.round(w * 0.18));
  const exitShift = Math.round(w * 0.95);       // cat2 keluar kanan sampai offscreen
  const returnShift = Math.round(-centerShift * 0.67); // balik sedikit lebih dekat dari posisi “center”
  return { centerShift, exitShift, returnShift };
}

async function playStory() {
  if (state.playing) return;

  state.playing = true;
  lockControls(true);
  stageActions.classList.add("hidden");
  resetStageVisual();

  document.body.classList.add("mode-story");

  const c1 = catsDOM[1].slot;
  const c2 = catsDOM[2].slot;

  const { centerShift, exitShift, returnShift } = getStoryDistances();

  await Promise.all([
    c1.animate([{},{ transform: `translateX(${centerShift}px)` }], { duration: 720, easing: "ease-in-out", fill: "forwards" }).finished,
    c2.animate([{},{ transform: `translateX(${-centerShift}px)` }], { duration: 720, easing: "ease-in-out", fill: "forwards" }).finished
  ]);

  // ✅ dialog awal pakai nama
  showSpeech(`${getCatName(1)}: ayo main benang! 🧶`, catsDOM[1].slot);
  await sleep(750);

  await playYarn();

  showSpeech(`${getCatName(2)}: hehe, aku menang ya? 😼`, catsDOM[2].slot);
  await sleep(700);

  await nuzzleAndHearts();

  showSpeech(`${getCatName(1)}: prrr… gemes banget 💖`, catsDOM[1].slot);
  await sleep(650);

  // cat 2 leaves to right
  await c2.animate([{},{ transform: `translateX(${exitShift}px)` }], { duration: 860, easing: "ease-in", fill: "forwards" }).finished;
  await sleep(260);

  // return with basket
  if (catsDOM[2].carry) {
    catsDOM[2].carry.classList.remove("hidden");
    catsDOM[2].carry.querySelector(".fish")?.classList.add("hidden");
    catsDOM[2].carry.querySelector(".scroll")?.classList.add("hidden");
    const paper = catsDOM[2].carry.querySelector(".paper");
    if (paper) paper.style.transform = "scaleX(0)";
  }

  await c2.animate([{},{ transform: `translateX(${returnShift}px)` }], { duration: 1100, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }).finished;

  showSpeech(`${getCatName(2)}: aku balik bawa sesuatu… 😺`, catsDOM[2].slot);
  await sleep(650);

  // ✅ message otomatis pakai nama jika ada
  await unrollAndType(buildScrollMessage());

  stageActions.classList.remove("hidden");
  lockControls(false);
  state.playing = false;
}

function backToCustomizer() {
  resetStageVisual();
  document.body.classList.remove("mode-story");
}

function resetAll() {
  state.cats[1] = {
    name: "",
    breed: "british",
    fur: "#f2c28f",
    accent: "#7a5137",
    outfit: "hoodie",
    outfitColor: "#7ad3ff",
    accessory: "none",
  };

  state.cats[2] = {
    name: "",
    breed: "calico",
    fur: "#ffe2c2",
    accent: "#b25a3c",
    outfit: "sweater",
    outfitColor: "#ffd166",
    accessory: "bow",
  };

  $("#name1").value = "";
  $("#breed1").value = "british";
  $("#fur1").value = "#f2c28f";
  $("#accent1").value = "#7a5137";
  $("#outfit1").value = "hoodie";
  $("#outfitColor1").value = "#7ad3ff";
  $("#accessory1").value = "none";

  $("#name2").value = "";
  $("#breed2").value = "calico";
  $("#fur2").value = "#ffe2c2";
  $("#accent2").value = "#b25a3c";
  $("#outfit2").value = "sweater";
  $("#outfitColor2").value = "#ffd166";
  $("#accessory2").value = "bow";

  applyCat(1);
  applyCat(2);
  backToCustomizer();
}

function bindControls() {
  $$(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".tab").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      const target = btn.dataset.target;
      $("#form-c1").classList.toggle("is-active", target === "c1");
      $("#form-c2").classList.toggle("is-active", target === "c2");
    });
  });

  // cat1 inputs
  $("#name1").addEventListener("input", (e) => {
    state.cats[1].name = e.target.value;
    updateNameTag(1);
  });
  $("#breed1").addEventListener("change", (e) => { state.cats[1].breed = e.target.value; applyCat(1); });
  $("#fur1").addEventListener("input", (e) => { state.cats[1].fur = e.target.value; applyCat(1); });
  $("#accent1").addEventListener("input", (e) => { state.cats[1].accent = e.target.value; applyCat(1); });
  $("#outfit1").addEventListener("change", (e) => { state.cats[1].outfit = e.target.value; applyCat(1); });
  $("#outfitColor1").addEventListener("input", (e) => { state.cats[1].outfitColor = e.target.value; applyCat(1); });
  $("#accessory1").addEventListener("change", (e) => { state.cats[1].accessory = e.target.value; applyCat(1); });

  // cat2 inputs
  $("#name2").addEventListener("input", (e) => {
    state.cats[2].name = e.target.value;
    updateNameTag(2);
  });
  $("#breed2").addEventListener("change", (e) => { state.cats[2].breed = e.target.value; applyCat(2); });
  $("#fur2").addEventListener("input", (e) => { state.cats[2].fur = e.target.value; applyCat(2); });
  $("#accent2").addEventListener("input", (e) => { state.cats[2].accent = e.target.value; applyCat(2); });
  $("#outfit2").addEventListener("change", (e) => { state.cats[2].outfit = e.target.value; applyCat(2); });
  $("#outfitColor2").addEventListener("input", (e) => { state.cats[2].outfitColor = e.target.value; applyCat(2); });
  $("#accessory2").addEventListener("change", (e) => { state.cats[2].accessory = e.target.value; applyCat(2); });

  nextBtn.addEventListener("click", playStory);

  replayBtn.addEventListener("click", async () => {
    resetStageVisual();
    await playStory();
  });

  backBtn.addEventListener("click", backToCustomizer);
  resetBtn.addEventListener("click", resetAll);
}

function init() {
  mountCats();
  bindControls();
}

init();
