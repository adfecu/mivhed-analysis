const state = {
  allRows: [],
  filteredRows: [],
  sortKey: "year",
  sortDirection: "asc",
};

const fields = {
  year: ["Año", "AÃ±o"],
  entryDate: ["Fecha de Entrada"],
  exitDate: ["Fecha de Salida"],
  project: ["Proyecto"],
  province: ["Provincia"],
  municipality: ["Municipio"],
  builder: ["Constructora"],
  fiduciary: ["Fiduciaria"],
  units: ["Unidades"],
  cost: ["Costo del Proyecto", " Costo del Proyecto "],
  compensation: ["Compensación", "CompensaciÃ³n"],
  approved: ["¿Aprobado?", "Â¿Aprobado?"],
};

const formatter = new Intl.NumberFormat("en-US");
const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const el = {
  search: document.querySelector("#search"),
  yearFilter: document.querySelector("#yearFilter"),
  provinceFilter: document.querySelector("#provinceFilter"),
  fiduciaryFilter: document.querySelector("#fiduciaryFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  projectCount: document.querySelector("#projectCount"),
  unitCount: document.querySelector("#unitCount"),
  costTotal: document.querySelector("#costTotal"),
  compTotal: document.querySelector("#compTotal"),
  yearRange: document.querySelector("#yearRange"),
  yearChart: document.querySelector("#yearChart"),
  provinceChart: document.querySelector("#provinceChart"),
  fiduciaryChart: document.querySelector("#fiduciaryChart"),
  tableCount: document.querySelector("#tableCount"),
  projectRows: document.querySelector("#projectRows"),
};

async function init() {
  const raw = window.MIVHED_DATA || (await loadJson());
  const dataset = raw[Object.keys(raw)[0]] || [];
  state.allRows = dataset.map(normalizeRow);

  fillFilters();
  bindEvents();
  applyFilters();
}

async function loadJson() {
  const response = await fetch("./data.json");
  return response.json();
}

function normalizeRow(row) {
  const normalized = {
    year: parseInt(get(row, fields.year), 10) || 0,
    entryDate: repairText(get(row, fields.entryDate)),
    exitDate: repairText(get(row, fields.exitDate)),
    project: repairText(get(row, fields.project)),
    province: repairText(get(row, fields.province)),
    municipality: repairText(get(row, fields.municipality)),
    builder: repairText(get(row, fields.builder)),
    fiduciary: repairText(get(row, fields.fiduciary)),
    unitsRaw: repairText(get(row, fields.units)),
    costRaw: get(row, fields.cost),
    compensationRaw: get(row, fields.compensation),
    approved: repairText(get(row, fields.approved)),
  };

  normalized.units = parseLeadingNumber(normalized.unitsRaw);
  normalized.cost = parseMoney(normalized.costRaw);
  normalized.compensation = parseMoney(normalized.compensationRaw);
  normalized.searchText = [
    normalized.year,
    normalized.project,
    normalized.province,
    normalized.municipality,
    normalized.builder,
    normalized.fiduciary,
    normalized.approved,
  ]
    .join(" ")
    .toLowerCase();

  return normalized;
}

function get(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key] ?? "";
    }
  }
  return "";
}

function repairText(value) {
  const text = String(value ?? "").trim();
  if (!/[ÃÂ]/.test(text)) return text;

  try {
    const bytes = Uint8Array.from(text, (char) => cp1252Byte(char));
    return new TextDecoder("utf-8").decode(bytes).replace(/Â/g, "").trim();
  } catch {
    return text.replace(/Ã³/g, "ó").replace(/Ã±/g, "ñ").replace(/Ã©/g, "é").replace(/Ã­/g, "í").replace(/Ã¡/g, "á");
  }
}

function cp1252Byte(char) {
  const code = char.charCodeAt(0);
  const cp1252 = {
    0x20ac: 0x80,
    0x201a: 0x82,
    0x0192: 0x83,
    0x201e: 0x84,
    0x2026: 0x85,
    0x2020: 0x86,
    0x2021: 0x87,
    0x02c6: 0x88,
    0x2030: 0x89,
    0x0160: 0x8a,
    0x2039: 0x8b,
    0x0152: 0x8c,
    0x017d: 0x8e,
    0x2018: 0x91,
    0x2019: 0x92,
    0x201c: 0x93,
    0x201d: 0x94,
    0x2022: 0x95,
    0x2013: 0x96,
    0x2014: 0x97,
    0x02dc: 0x98,
    0x2122: 0x99,
    0x0161: 0x9a,
    0x203a: 0x9b,
    0x0153: 0x9c,
    0x017e: 0x9e,
    0x0178: 0x9f,
  };
  return code <= 255 ? code : cp1252[code] ?? 63;
}

function parseLeadingNumber(value) {
  const match = String(value ?? "").match(/^[\d,]+/);
  return match ? Number(match[0].replaceAll(",", "")) : 0;
}

function parseMoney(value) {
  const cleaned = String(value ?? "").replaceAll(",", "").trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function fillFilters() {
  fillSelect(el.yearFilter, ["All years", ...unique(state.allRows.map((row) => row.year)).sort((a, b) => a - b)]);
  fillSelect(el.provinceFilter, ["All provinces", ...unique(state.allRows.map((row) => row.province)).sort()]);
  fillSelect(el.fiduciaryFilter, ["All fiduciaries", ...unique(state.allRows.map((row) => row.fiduciary)).sort()]);
}

function fillSelect(select, values) {
  select.innerHTML = values
    .map((value, index) => `<option value="${index === 0 ? "" : escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function bindEvents() {
  [el.search, el.yearFilter, el.provinceFilter, el.fiduciaryFilter].forEach((input) => {
    input.addEventListener("input", applyFilters);
  });

  el.resetFilters.addEventListener("click", () => {
    el.search.value = "";
    el.yearFilter.value = "";
    el.provinceFilter.value = "";
    el.fiduciaryFilter.value = "";
    applyFilters();
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = "asc";
      }
      renderTable();
    });
  });
}

function applyFilters() {
  const query = el.search.value.trim().toLowerCase();
  const year = Number(el.yearFilter.value);
  const province = el.provinceFilter.value;
  const fiduciary = el.fiduciaryFilter.value;

  state.filteredRows = state.allRows.filter((row) => {
    return (
      (!query || row.searchText.includes(query)) &&
      (!year || row.year === year) &&
      (!province || row.province === province) &&
      (!fiduciary || row.fiduciary === fiduciary)
    );
  });

  render();
}

function render() {
  renderMetrics();
  renderYearChart();
  renderRankChart(el.provinceChart, groupCount(state.filteredRows, "province"), 8);
  renderRankChart(el.fiduciaryChart, groupCount(state.filteredRows, "fiduciary"), 8);
  renderTable();
}

function renderMetrics() {
  const totals = state.filteredRows.reduce(
    (acc, row) => {
      acc.units += row.units;
      acc.cost += row.cost;
      acc.compensation += row.compensation;
      return acc;
    },
    { units: 0, cost: 0, compensation: 0 },
  );

  el.projectCount.textContent = formatter.format(state.filteredRows.length);
  el.unitCount.textContent = formatter.format(totals.units);
  el.costTotal.textContent = `RD$${moneyFormatter.format(totals.cost)}`;
  el.compTotal.textContent = `RD$${moneyFormatter.format(totals.compensation)}`;
}

function renderYearChart() {
  const byYear = groupCount(state.filteredRows, "year").sort((a, b) => a.name - b.name);
  const max = Math.max(...byYear.map((item) => item.count), 1);
  const years = byYear.map((item) => item.name).filter(Boolean);
  el.yearRange.textContent = years.length ? `${Math.min(...years)}-${Math.max(...years)}` : "";
  el.yearChart.innerHTML = byYear
    .map(
      (item) => `
        <div class="bar" title="${item.name}: ${item.count} projects">
          <div class="bar-fill" style="height:${Math.max((item.count / max) * 100, 2)}%"></div>
          <div class="bar-value">${item.count}</div>
          <div class="bar-label">${item.name}</div>
        </div>
      `,
    )
    .join("");
}

function renderRankChart(container, items, limit) {
  const rows = items.sort((a, b) => b.count - a.count).slice(0, limit);
  const max = Math.max(...rows.map((item) => item.count), 1);
  container.innerHTML = rows
    .map(
      (item) => `
        <div class="rank-row" title="${escapeHtml(item.name)}: ${item.count}">
          <div class="rank-name">${escapeHtml(item.name)}</div>
          <div class="rank-value">${item.count}</div>
          <div class="track"><span style="width:${(item.count / max) * 100}%"></span></div>
        </div>
      `,
    )
    .join("");
}

function groupCount(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const name = row[key] || "Unknown";
    map.set(name, (map.get(name) || 0) + 1);
  });
  return [...map.entries()].map(([name, count]) => ({ name, count }));
}

function renderTable() {
  const rows = [...state.filteredRows].sort(compareRows).slice(0, 300);
  el.tableCount.textContent = `${formatter.format(state.filteredRows.length)} matching projects`;

  if (!rows.length) {
    el.projectRows.innerHTML = `<tr><td class="empty" colspan="9">No projects match the current filters.</td></tr>`;
    return;
  }

  el.projectRows.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.year || ""}</td>
          <td>${escapeHtml(row.project)}</td>
          <td>${escapeHtml(row.province)}</td>
          <td>${escapeHtml(row.municipality)}</td>
          <td>${escapeHtml(row.builder)}</td>
          <td>${escapeHtml(row.fiduciary)}</td>
          <td class="numeric">${escapeHtml(row.unitsRaw || formatter.format(row.units))}</td>
          <td class="numeric">${formatMoney(row.cost)}</td>
          <td class="numeric">${formatMoney(row.compensation)}</td>
        </tr>
      `,
    )
    .join("");
}

function compareRows(a, b) {
  const key = state.sortKey;
  const direction = state.sortDirection === "asc" ? 1 : -1;
  const av = a[key] ?? "";
  const bv = b[key] ?? "";

  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * direction;
  }
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" }) * direction;
}

function formatMoney(value) {
  return value ? `RD$${moneyFormatter.format(value)}` : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init().catch((error) => {
  document.body.innerHTML = `<main class="shell"><section class="panel"><h1>Could not load dashboard data</h1><p>${escapeHtml(error.message)}</p></section></main>`;
});
