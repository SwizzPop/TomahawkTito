const suppliesRoot = document.getElementById("supplies");

function supplyText(parent, tag) {
  const node = parent.querySelector(tag);
  return node ? node.textContent.trim() : "";
}

function showSuppliesMessage(message) {
  suppliesRoot.replaceChildren();
  const status = document.createElement("p");
  status.className = "status";
  status.textContent = message;
  suppliesRoot.append(status);
}

function renderSupplyRow(link, description, image) {
  const row = document.createElement("tr");

  const pictureCell = document.createElement("td");
  pictureCell.dataset.label = "Picture";
  if (image) {
    const photoLink = document.createElement("a");
    photoLink.href = link;
    photoLink.target = "_blank";
    photoLink.rel = "noopener noreferrer";
    const photo = document.createElement("img");
    photo.src = image;
    photo.alt = description || "Supply photo";
    photoLink.append(photo);
    pictureCell.append(photoLink);
  }
  row.append(pictureCell);

  const descriptionCell = document.createElement("td");
  descriptionCell.dataset.label = "Description";
  descriptionCell.textContent = description;
  row.append(descriptionCell);

  const linkCell = document.createElement("td");
  linkCell.dataset.label = "Link";
  const anchor = document.createElement("a");
  anchor.href = link;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.textContent = link;
  linkCell.append(anchor);
  row.append(linkCell);

  return row;
}

async function loadSupplies() {
  let response;
  try {
    response = await fetch("supplies.xml");
  } catch {
    showSuppliesMessage("Could not load supplies.xml.");
    return;
  }

  if (!response.ok) {
    showSuppliesMessage("Could not load supplies.xml.");
    return;
  }

  const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
  if (xml.querySelector("parsererror")) {
    showSuppliesMessage("supplies.xml is not valid XML.");
    return;
  }

  const rows = [];
  for (const item of xml.querySelectorAll("supplies > item")) {
    const link = supplyText(item, "link");
    if (!link) continue;
    rows.push(renderSupplyRow(link, supplyText(item, "description"), supplyText(item, "image")));
  }

  if (rows.length === 0) {
    showSuppliesMessage("Add an item to supplies.xml.");
    return;
  }

  const table = document.createElement("table");
  table.className = "supply-table";
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const label of ["Picture", "Description", "Link"]) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headRow.append(cell);
  }
  head.append(headRow);
  const body = document.createElement("tbody");
  body.append(...rows);
  table.append(head, body);
  suppliesRoot.replaceChildren(table);
}

loadSupplies();
