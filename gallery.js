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

function cardStep() {
  const card = ribbon.querySelector(".card");
  if (!card) return ribbon.clientWidth;
  const styles = getComputedStyle(ribbon);
  const gap = parseFloat(styles.columnGap || styles.gap) || 0;
  return card.getBoundingClientRect().width + gap;
}

ribbon.addEventListener("wheel", (event) => {
  if (ribbon.scrollWidth <= ribbon.clientWidth) return;
  if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
  ribbon.scrollLeft += event.deltaY;
  event.preventDefault();
}, { passive: false });

ribbon.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
  const direction = event.key === "ArrowRight" ? 1 : -1;
  ribbon.scrollBy({ left: direction * cardStep(), behavior: "smooth" });
  event.preventDefault();
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
}

loadGallery();
