const state = {
  allRows: [],
  filteredRows: [],
  availableYears: [],
  sortKey: "year",
  sortDirection: "desc",
};

const fields = {
  year: ["Año", "AÃ±o", "AÃƒÂ±o"],
  project: ["Proyecto"],
  province: ["Provincia"],
  municipality: ["Municipio"],
  builder: ["Constructora"],
  fiduciary: ["Fiduciaria"],
  units: ["Unidades"],
  cost: ["Costo del Proyecto", " Costo del Proyecto "],
  compensation: ["Compensación", "CompensaciÃ³n", "CompensaciÃƒÂ³n"],
};

const formatter = new Intl.NumberFormat("es-DO");
const moneyFormatter = new Intl.NumberFormat("es-DO", { maximumFractionDigits: 0 });

const el = {
  builderFilter: document.querySelector("#builderFilter"),
  search: document.querySelector("#search"),
  yearFilter: document.querySelector("#yearFilter"),
  resetFilters: document.querySelector("#resetFilters"),
  projectCount: document.querySelector("#projectCount"),
  unitCount: document.querySelector("#unitCount"),
  costTotal: document.querySelector("#costTotal"),
  compTotal: document.querySelector("#compTotal"),
  yearRange: document.querySelector("#yearRange"),
  yearChart: document.querySelector("#yearChart"),
  builderChart: document.querySelector("#builderChart"),
  tableCount: document.querySelector("#tableCount"),
  projectRows: document.querySelector("#projectRows"),
  footerUnits: document.querySelector("#footerUnits"),
  footerCost: document.querySelector("#footerCost"),
  footerComp: document.querySelector("#footerComp"),
};

init();

function init() {
  const raw = window.MIVHED_DATA;
  const dataset = raw[Object.keys(raw)[0]] || [];
  const rows = dataset.map(normalizeRow).filter((row) => row.year && hasMonetaryData(row));

  assignCanonicalBuilders(rows);
  const allYears = unique(rows.map((row) => row.year)).sort((a, b) => a - b);
  state.availableYears = allYears.slice(-4);
  state.allRows = rows.filter((row) => state.availableYears.includes(row.year));

  fillFilters();
  bindEvents();
  applyFilters();
}

function hasMonetaryData(row) {
  return row.cost > 0 || row.compensation > 0;
}

function normalizeRow(row) {
  const builderRaw = repairText(get(row, fields.builder)) || "Constructora no especificada";
  const normalized = {
    year: parseInt(get(row, fields.year), 10) || 0,
    project: repairText(get(row, fields.project)),
    province: repairText(get(row, fields.province)),
    municipality: repairText(get(row, fields.municipality)),
    builderRaw,
    builderKey: normalizeBuilderKey(builderRaw),
    fiduciary: repairText(get(row, fields.fiduciary)),
    unitsRaw: repairText(get(row, fields.units)),
    cost: parseMoney(get(row, fields.cost)),
    compensation: parseMoney(get(row, fields.compensation)),
  };

  normalized.units = parseLeadingNumber(normalized.unitsRaw);
  return normalized;
}

function assignCanonicalBuilders(rows) {
  const groups = new Map();

  rows.forEach((row) => {
    const group = groups.get(row.builderKey) || new Map();
    const label = cleanCompanyLabel(row.builderRaw);
    group.set(label, (group.get(label) || 0) + 1);
    groups.set(row.builderKey, group);
  });

  const labelsByKey = new Map();
  groups.forEach((labels, key) => {
    const sorted = [...labels.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    });
    labelsByKey.set(key, sorted[0][0]);
  });

  rows.forEach((row) => {
    row.builder = labelsByKey.get(row.builderKey) || row.builderRaw;
    row.searchText = [
      row.year,
      row.project,
      row.province,
      row.municipality,
      row.builder,
      row.builderRaw,
      row.fiduciary,
    ]
      .join(" ")
      .toLowerCase();
  });
}

function normalizeBuilderKey(value) {
  return removeDiacritics(cleanCompanyLabel(value))
    .toUpperCase()
    .replace(/\bS\s*\.?\s*A\s*\.?\s*S?\b/g, " SAS")
    .replace(/\bS\s*\.?\s*A\b/g, " SA")
    .replace(/\bS\s*\.?\s*R\s*\.?\s*L\b/g, " SRL")
    .replace(/\bC\s*\.?\s*POR\s*A\b/g, " CXA")
    .replace(/\bC\s*X\s*A\b/g, " CXA")
    .replace(/\bC\s*\/\s*A\b/g, " CXA")
    .replace(/&/g, " Y ")
    .replace(/[.,;:()[\]{}"'`´]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCompanyLabel(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, ", ")
    .replace(/\s+\./g, ".")
    .trim();
}

function removeDiacritics(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function get(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key] ?? "";
  }
  return "";
}

function repairText(value) {
  let text = String(value ?? "").trim();
  for (let pass = 0; pass < 2 && /[ÃÂ]/.test(text); pass += 1) {
    try {
      const bytes = Uint8Array.from(text, (char) => cp1252Byte(char));
      text = new TextDecoder("utf-8").decode(bytes).replace(/Â/g, "").trim();
    } catch {
      break;
    }
  }
  return text;
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
  fillYearSelect();
  fillBuilderSelect();
}

function fillYearSelect() {
  el.yearFilter.innerHTML = [
    `<option value="">Todos los años</option>`,
    ...state.availableYears
      .slice()
      .sort((a, b) => b - a)
      .map((year) => `<option value="${year}">${year}</option>`),
  ].join("");
}

function fillBuilderSelect() {
  const builders = unique(state.allRows.map((row) => row.builder)).sort((a, b) => a.localeCompare(b, "es"));
  el.builderFilter.innerHTML = [
    `<option value="">Todas las constructoras</option>`,
    ...builders.map((builder) => `<option value="${escapeHtml(builder)}">${escapeHtml(builder)}</option>`),
  ].join("");
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== "" && value !== null && value !== undefined))];
}

function bindEvents() {
  [el.builderFilter, el.search, el.yearFilter].forEach((input) => {
    input.addEventListener("input", applyFilters);
  });

  el.resetFilters.addEventListener("click", () => {
    el.builderFilter.value = "";
    el.search.value = "";
    el.yearFilter.value = "";
    applyFilters();
  });

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = key === "year" ? "desc" : "asc";
      }
      renderTable(calculateTotals(state.filteredRows));
    });
  });
}

function applyFilters() {
  const builder = el.builderFilter.value;
  const query = el.search.value.trim().toLowerCase();
  const selectedYear = Number(el.yearFilter.value);

  state.filteredRows = state.allRows.filter((row) => {
    return (
      (!selectedYear || row.year === selectedYear) &&
      (!builder || row.builder === builder) &&
      (!query || row.searchText.includes(query))
    );
  });

  el.yearRange.textContent = `${state.availableYears[0]}-${state.availableYears[state.availableYears.length - 1]}`;
  render();
}

function render() {
  const totals = calculateTotals(state.filteredRows);
  renderMetrics(totals);
  renderYearChart();
  renderBuilderChart();
  renderTable(totals);
}

function calculateTotals(rows) {
  return rows.reduce(
    (acc, row) => {
      acc.units += row.units;
      acc.cost += row.cost;
      acc.compensation += row.compensation;
      return acc;
    },
    { units: 0, cost: 0, compensation: 0 },
  );
}

function renderMetrics(totals) {
  el.projectCount.textContent = formatter.format(state.filteredRows.length);
  el.unitCount.textContent = formatter.format(totals.units);
  el.costTotal.textContent = formatMoney(totals.cost);
  el.compTotal.textContent = formatMoney(totals.compensation);
}

function renderYearChart() {
  const byYear = groupByYear(state.filteredRows);
  const max = Math.max(...byYear.map((item) => item.count), 1);
  el.yearChart.innerHTML = byYear
    .map(
      (item) => `
        <div class="bar" title="${item.year}: ${item.count} proyectos">
          <div class="bar-fill" style="height:${Math.max((item.count / max) * 100, 2)}%"></div>
          <div class="bar-value">${item.count}</div>
          <div class="bar-label">${item.year}</div>
        </div>
      `,
    )
    .join("");
}

function groupByYear(rows) {
  return state.availableYears.map((year) => ({
    year,
    count: rows.filter((row) => row.year === year).length,
  }));
}

function renderBuilderChart() {
  const builders = new Map();
  state.filteredRows.forEach((row) => {
    const current = builders.get(row.builder) || { name: row.builder, count: 0, cost: 0 };
    current.count += 1;
    current.cost += row.cost;
    builders.set(row.builder, current);
  });

  const rows = [...builders.values()].sort((a, b) => b.cost - a.cost).slice(0, 8);
  const max = Math.max(...rows.map((item) => item.cost), 1);
  el.builderChart.innerHTML = rows
    .map(
      (item) => `
        <div class="rank-row amount-row" title="${escapeHtml(item.name)}: ${formatMoney(item.cost)}">
          <div class="rank-name">${escapeHtml(item.name)}</div>
          <div class="rank-value">${formatCompactMoney(item.cost)}</div>
          <div class="track"><span style="width:${(item.cost / max) * 100}%"></span></div>
        </div>
      `,
    )
    .join("");
}

function renderTable(totals) {
  const rows = [...state.filteredRows].sort(compareRows);
  el.tableCount.textContent = `${formatter.format(rows.length)} proyectos encontrados`;
  el.footerUnits.textContent = formatter.format(totals.units);
  el.footerCost.textContent = formatMoney(totals.cost);
  el.footerComp.textContent = formatMoney(totals.compensation);

  if (!rows.length) {
    el.projectRows.innerHTML = `<tr><td class="empty" colspan="8">No hay proyectos con los filtros actuales.</td></tr>`;
    return;
  }

  el.projectRows.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${row.year}</td>
          <td>${escapeHtml(row.project)}</td>
          <td>${escapeHtml(row.builder)}</td>
          <td>${escapeHtml(row.province)}</td>
          <td>${escapeHtml(row.municipality)}</td>
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

  if (typeof av === "number" && typeof bv === "number") return (av - bv) * direction;
  return String(av).localeCompare(String(bv), "es", { numeric: true, sensitivity: "base" }) * direction;
}

function formatMoney(value) {
  return `RD$${moneyFormatter.format(value || 0)}`;
}

function formatCompactMoney(value) {
  if (value >= 1_000_000_000) return `RD$${(value / 1_000_000_000).toLocaleString("es-DO", { maximumFractionDigits: 1 })}B`;
  if (value >= 1_000_000) return `RD$${(value / 1_000_000).toLocaleString("es-DO", { maximumFractionDigits: 1 })}M`;
  return formatMoney(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
