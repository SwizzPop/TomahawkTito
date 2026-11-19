const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogv", "ogg", "mov", "m4v"]);

const ribbon = document.getElementById("ribbon");

function extensionOf(src) {
  const path = src.split(/[?#]/, 1)[0];
  const name = path.split("/").pop() || "";
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function textOf(parent, tag) {
  const node = parent.querySelector(tag);
  return node ? node.textContent.trim() : "";
}

function showStatus(message) {
  ribbon.replaceChildren();
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = message;
  ribbon.append(status);
}

function renderCard(src, caption) {
  const card = document.createElement("article");
  card.className = "card";

  const frame = document.createElement("div");
  frame.className = "frame";

  const kind = extensionOf(src);
  const media = VIDEO_EXTENSIONS.has(kind)
    ? document.createElement("video")
    : document.createElement("img");

  if (media.tagName === "VIDEO") {
    media.controls = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.setAttribute("aria-label", caption || "Video");
  } else {
    media.alt = caption || "Photo of Tomahawk Tito";
    media.decoding = "async";
  }

  media.src = src;
  media.addEventListener("error", () => {
    const note = document.createElement("p");
    note.className = "missing";
    note.textContent = "Could not load " + src;
    frame.append(note);
  });

  frame.append(media);
  card.append(frame);

  const captionNode = document.createElement("p");
  captionNode.className = "caption";
  captionNode.textContent = caption;
  if (!caption) captionNode.setAttribute("aria-hidden", "true");
  card.append(captionNode);

  return card;
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const boundVideos = new WeakSet();

let pausedByUser = reducedMotion;
let hold = false;
let loopWidth = 0;
let lastFrame = 0;
let expectedScroll = null;
let settling = false;
let wheelLocked = false;
let suppressClick = false;
let drag = null;

function cardStep() {
  const card = ribbon.querySelector(".card:not(.is-clone)");
  if (!card) return ribbon.clientWidth;
  const styles = getComputedStyle(ribbon);
  const gap = parseFloat(styles.columnGap || styles.gap) || 0;
  return card.getBoundingClientRect().width + gap;
}

function unwrapLoop() {
  if (loopWidth <= 0) return;
  const left = ((ribbon.scrollLeft % loopWidth) + loopWidth) % loopWidth;
  ribbon.querySelectorAll(".is-clone").forEach((node) => node.remove());
  expectedScroll = left;
  ribbon.scrollLeft = left;
  loopWidth = 0;
}

function stopAutoScroll() {
  pausedByUser = true;
  ribbon.classList.remove("is-auto");
  unwrapLoop();
}

function alignToNearest() {
  const cards = [...ribbon.querySelectorAll(".card")];
  if (cards.length === 0) return;
  const edge = ribbon.getBoundingClientRect().left;
  const pad = parseFloat(getComputedStyle(ribbon).paddingLeft) || 0;
  let nearest = cards[0];
  let best = Infinity;
  for (const card of cards) {
    const distance = Math.abs(card.getBoundingClientRect().left - edge - pad);
    if (distance < best) {
      best = distance;
      nearest = card;
    }
  }
  const delta = nearest.getBoundingClientRect().left - edge - pad;
  if (Math.abs(delta) < 2) return;
  ribbon.scrollBy({ left: delta, behavior: "smooth" });
}

function finishManualScroll() {
  if (settling) return;
  settling = true;
  stopAutoScroll();
  if (!finePointer) {
    ribbon.classList.add("is-snapping");
    alignToNearest();
  }
  settling = false;
}

function onVideoPlay(event) {
  const video = event.currentTarget;
  const card = video.closest(".card");
  if (!card || !card.classList.contains("is-clone")) {
    stopAutoScroll();
    return;
  }

  const originals = [...ribbon.querySelectorAll(".card:not(.is-clone)")];
  const cards = [...ribbon.querySelectorAll(".card")];
  const original = originals[cards.indexOf(card) % originals.length];
  const which = [...card.querySelectorAll("video")].indexOf(video);
  const time = video.currentTime;
  video.pause();
  stopAutoScroll();
  const next = original && original.querySelectorAll("video")[which];
  if (!next) return;
  if (Number.isFinite(time)) next.currentTime = time;
  next.play().catch(() => {});
}

function bindVideos(root) {
  root.querySelectorAll("video").forEach((video) => {
    if (boundVideos.has(video)) return;
    boundVideos.add(video);
    video.addEventListener("play", onVideoPlay);
    video.addEventListener("pointerdown", () => {
      hold = true;
    });
    video.addEventListener("pointerup", () => {
      window.setTimeout(() => {
        if (!pausedByUser) hold = false;
      }, 400);
    });
  });
}

function duplicateForLoop() {
  const originals = [...ribbon.querySelectorAll(".card")];
  if (originals.length < 2) return 0;
  for (const card of originals) {
    const clone = card.cloneNode(true);
    clone.classList.add("is-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("img").forEach((img) => {
      img.alt = "";
    });
    ribbon.append(clone);
  }
  bindVideos(ribbon);
  const firstClone = ribbon.querySelector(".is-clone");
  return firstClone.offsetLeft - originals[0].offsetLeft;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (pausedByUser || hold || loopWidth <= 0) {
    lastFrame = now;
    return;
  }
  const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  if (dt <= 0) return;
  const speed = Math.max(32, cardStep() / 8);
  let next = ribbon.scrollLeft + speed * dt;
  if (next >= loopWidth) next -= loopWidth;
  expectedScroll = next;
  ribbon.scrollLeft = next;
}

function startAutoScroll() {
  if (reducedMotion || ribbon.querySelectorAll(".card").length < 2) {
    if (!finePointer) ribbon.classList.add("is-snapping");
    return;
  }
  window.requestAnimationFrame(() => {
    loopWidth = duplicateForLoop();
    if (loopWidth <= 0) {
      ribbon.querySelectorAll(".is-clone").forEach((node) => node.remove());
      if (!finePointer) ribbon.classList.add("is-snapping");
      return;
    }
    ribbon.classList.add("is-auto");
    lastFrame = 0;
    requestAnimationFrame(frame);
  });
}

window.addEventListener("wheel", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest("#ribbon")) return;
  if (ribbon.scrollWidth <= ribbon.clientWidth) return;
  const absX = Math.abs(event.deltaX);
  const absY = Math.abs(event.deltaY);
  const delta = absX > absY ? event.deltaX : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  if (wheelLocked) return;
  wheelLocked = true;
  finishManualScroll();
  const direction = delta > 0 ? 1 : -1;
  ribbon.scrollBy({ left: direction * cardStep(), behavior: "smooth" });
  window.setTimeout(() => {
    wheelLocked = false;
  }, 450);
}, { passive: false });

document.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = event.key === "ArrowRight" ? 1 : -1;
  finishManualScroll();
  ribbon.scrollBy({ left: direction * cardStep(), behavior: "smooth" });
  event.preventDefault();
});

ribbon.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  hold = true;
  if (event.pointerType === "touch" || event.target.closest("video")) return;
  drag = {
    id: event.pointerId,
    x: event.clientX,
    scroll: ribbon.scrollLeft,
    moved: false,
  };
  ribbon.setPointerCapture(event.pointerId);
  ribbon.classList.add("is-dragging");
});

ribbon.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  if (Math.abs(dx) > 6) drag.moved = true;
  expectedScroll = drag.scroll - dx;
  ribbon.scrollLeft = expectedScroll;
});

function endDrag(event) {
  hold = false;
  if (!drag || event.pointerId !== drag.id) return;
  const moved = drag.moved;
  drag = null;
  ribbon.classList.remove("is-dragging");
  if (!moved) return;
  suppressClick = true;
  window.setTimeout(() => {
    suppressClick = false;
  }, 0);
  finishManualScroll();
}

ribbon.addEventListener("pointerup", endDrag);
ribbon.addEventListener("pointercancel", (event) => {
  hold = false;
  drag = null;
  ribbon.classList.remove("is-dragging");
  if (event.pointerType === "touch") finishManualScroll();
});

ribbon.addEventListener("click", (event) => {
  if (suppressClick || event.target.closest("video")) return;
  if (!event.target.closest(".card")) return;
  stopAutoScroll();
});

let touchScrollStart = 0;
ribbon.addEventListener("touchstart", () => {
  touchScrollStart = ribbon.scrollLeft;
}, { passive: true });

ribbon.addEventListener("touchend", () => {
  if (Math.abs(ribbon.scrollLeft - touchScrollStart) > 8) finishManualScroll();
});

ribbon.addEventListener("scroll", () => {
  if (expectedScroll !== null && Math.abs(ribbon.scrollLeft - expectedScroll) < 1.5) {
    expectedScroll = null;
    return;
  }
  expectedScroll = null;
  if (pausedByUser || hold || settling || drag) return;
  stopAutoScroll();
});

async function loadGallery() {
  let response;
  try {
    response = await fetch("gallery.xml");
  } catch {
    showStatus("Could not load gallery.xml.");
    return;
  }

  if (!response.ok) {
    showStatus("Could not load gallery.xml.");
    return;
  }

  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (xml.querySelector("parsererror")) {
    showStatus("gallery.xml is not valid XML.");
    return;
  }

  const items = [...xml.querySelectorAll("gallery > item")];
  const cards = [];
  let firstImage = true;

  for (const item of items) {
    const src = textOf(item, "src");
    if (!src) continue;
    const card = renderCard(src, textOf(item, "caption"));
    const image = card.querySelector("img");
    if (image) {
      image.loading = firstImage ? "eager" : "lazy";
      firstImage = false;
    }
    if (!IMAGE_EXTENSIONS.has(extensionOf(src)) && !VIDEO_EXTENSIONS.has(extensionOf(src))) {
      const note = document.createElement("p");
      note.className = "missing";
      note.textContent = "Use a picture or video file for " + src;
      card.querySelector(".frame").append(note);
    }
    cards.push(card);
  }

  if (cards.length === 0) {
    showStatus("Add an item to gallery.xml to show a photo or video.");
    return;
  }

  ribbon.replaceChildren(...cards);
  bindVideos(ribbon);
  startAutoScroll();
}

loadGallery();
