// UI for the Stats 101 / LNG1100 app. One builder per tab, each mirroring a
// page of the Quarto dashboard it replaces (stats101_dash / lng1100_dash).
// Each builder fills a sidebar and a main column and returns a draw()
// function; draw() runs when the tab is shown, an input moves, or the
// window resizes.
import { LANG, TABS, CITATION } from "./config.js";
import { STRINGS } from "./i18n.js";
import * as S from "./stats.js";

const t = STRINGS[LANG];
const Plot = globalThis.Plot;

const C = { orange: "#ee7600", blue: "#4169e1", violet: "#9400d3", gray30: "#4d4d4d", ribbon: "#999999" };
const FONT = getComputedStyle(document.documentElement).getPropertyValue("--plot-font").trim();
const r2 = (v) => Math.round(v * 100) / 100;
const fmt2 = (v) => (Number.isFinite(v) ? String(r2(v)) : "—");

// ---------------------------------------------------------------------------
// DOM helpers

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k);
  return e;
}

let uid = 0;
function slider(label, { min, max, step = 1, value }, onChange) {
  const id = `s${uid++}`;
  const input = h("input", { type: "range", id, min, max, step, value });
  const out = h("output", { for: id }, String(value));
  const wrap = h("div", { class: "control" }, h("label", { for: id }, h("span", { html: label }), out), input);
  input.addEventListener("input", () => { out.textContent = input.value; onChange(); });
  return {
    node: wrap,
    get value() { return Number(input.value); },
    set value(v) { input.value = v; out.textContent = input.value; },
    input, min: Number(min), max: Number(max), step: Number(step),
    set disabled(d) { input.disabled = d; wrap.classList.toggle("disabled", d); },
  };
}

// Shiny's animate = TRUE: steps the slider every 500 ms up to its max.
function playButton(s, onChange) {
  let timer = null;
  const btn = h("button", { class: "btn", type: "button" }, `▶ ${t.play}`);
  const stop = () => { clearInterval(timer); timer = null; btn.textContent = `▶ ${t.play}`; };
  btn.addEventListener("click", () => {
    if (timer) return stop();
    if (s.value + s.step > s.max) { s.value = s.min; onChange(); }
    btn.textContent = `❚❚ ${t.pause}`;
    timer = setInterval(() => {
      if (s.value + s.step > s.max) return stop();
      s.value = s.value + s.step;
      onChange();
    }, 500);
  });
  s.input.addEventListener("pointerdown", stop);
  return btn;
}

const readout = () => h("div", { class: "readout" });
const text = (html) => h("div", { class: "text" }, h("p", { html }));
const coloured = (word, colour) => `<b style="color:${colour}">${word}</b>`;

// Size the figure to its column; the dashboard's figures fill their card.
function frame(fig) {
  const width = Math.max(300, Math.min(820, fig.clientWidth || 640));
  return { width, height: Math.round(Math.max(300, Math.min(480, width * 0.62))) };
}

// theme_classic(base_size = 16, base_family = "Futura"): axis lines, no grid.
function plotOpts(fig, o = {}) {
  return {
    ...frame(fig),
    marginLeft: 56, marginBottom: 46, marginTop: 16, marginRight: 16,
    style: { fontFamily: FONT, fontSize: "15px", background: "transparent", color: "#222" },
    ...o,
    x: { line: true, labelAnchor: "center", labelArrow: "none", ...o.x },
    y: { line: true, labelAnchor: "center", labelArrow: "none", ...o.y },
  };
}

// ggplot's geom_errorbar: a vertical rule with caps of the given total width.
function errorbars(rows, { width = 0.1, stroke = "#222", strokeWidth = 1.6 } = {}) {
  const marks = [Plot.ruleX(rows, { x: "x", y1: "lo", y2: "hi", stroke, strokeWidth })];
  if (width > 0) {
    for (const y of ["lo", "hi"]) {
      marks.push(Plot.ruleY(rows, { y, x1: (d) => d.x - width / 2, x2: (d) => d.x + width / 2, stroke, strokeWidth }));
    }
  }
  return marks;
}

// geom_boxplot(alpha = 0): hollow box, median, whiskers, outliers.
function boxplots(groups, { half, stroke = C.gray30 }) {
  const rows = groups.map(({ x, values }) => ({ x, ...S.boxStats(values) }));
  return [
    Plot.rect(rows, { x1: (d) => d.x - half, x2: (d) => d.x + half, y1: "q1", y2: "q3", fill: "none", stroke, strokeWidth: 1.6 }),
    Plot.ruleY(rows, { y: "q2", x1: (d) => d.x - half, x2: (d) => d.x + half, stroke, strokeWidth: 3 }),
    Plot.ruleX(rows, { x: "x", y1: "q3", y2: "hi", stroke, strokeWidth: 1.6 }),
    Plot.ruleX(rows, { x: "x", y1: "lo", y2: "q1", stroke, strokeWidth: 1.6 }),
    Plot.dot(rows.flatMap((d) => d.outliers.map((y) => ({ x: d.x, y }))), { x: "x", y: "y", r: 2.5, fill: stroke }),
  ];
}

// geom_rug: short ticks along the bottom and left edges of the panel.
function rug(data, xDom, yDom) {
  const ty = (yDom[1] - yDom[0]) * 0.03, tx = (xDom[1] - xDom[0]) * 0.03;
  return [
    Plot.ruleX(data, { x: "x", y1: yDom[0], y2: yDom[0] + ty, strokeOpacity: 0.5 }),
    Plot.ruleY(data, { y: "y", x1: xDom[0], x2: xDom[0] + tx, strokeOpacity: 0.5 }),
  ];
}

function draw(fig, plot, emptyMessage) {
  fig.replaceChildren(plot);
  if (emptyMessage) fig.append(h("div", { class: "empty" }, emptyMessage));
}

// ---------------------------------------------------------------------------
// Tabs

const builders = {};

builders.viz = (side, main, redraw) => {
  const mA = slider(t.meanA, { min: 0, max: 100, value: 50 }, redraw);
  const sA = slider(t.sdA, { min: 1, max: 20, value: 10 }, redraw);
  const mB = slider(t.meanB, { min: 0, max: 100, value: 60 }, redraw);
  const sB = slider(t.sdB, { min: 1, max: 20, value: 10 }, redraw);
  const boxes = Object.entries(t.metric).map(([k, label]) => {
    const cb = h("input", { type: "checkbox", value: k, onchange: redraw });
    return { k, cb, node: h("label", {}, cb, label) };
  });
  side.append(h("h5", {}, t.options), mA.node, sA.node, mB.node, sB.node,
    h("h5", {}, t.layers), h("div", { class: "checks" }, boxes.map((b) => b.node)));
  const fig = h("div", { class: "figure" });
  main.append(fig, text(t.vizText));

  return () => {
    const on = new Set(boxes.filter((b) => b.cb.checked).map((b) => b.k));
    const r = S.rng(123);
    const A = r.rnorm(100, mA.value, sA.value), B = r.rnorm(100, mB.value, sB.value);
    const groups = [{ x: 1, values: A }, { x: 2, values: B }];
    const jit = S.rng(7);
    const marks = [];
    if (on.has("box")) marks.push(...boxplots(groups, { half: 0.15 }));
    if (on.has("points")) {
      const pts = groups.flatMap(({ x, values }) => values.map((y) => ({ x: x + (jit.unif() - 0.5) * 0.4, y })));
      marks.push(Plot.dot(pts, { x: "x", y: "y", r: 6, fill: C.blue, fillOpacity: 0.1 }));
    }
    if (on.has("mean")) marks.push(Plot.dot(groups, { x: "x", y: (d) => S.mean(d.values), r: 8, fill: C.orange }));
    const bars = (fn, dx) => groups.map(({ x, values }) => { const [lo, hi] = fn(values); return { x: x + dx, lo, hi }; });
    if (on.has("sd")) marks.push(...errorbars(bars(S.meanSdl, -0.1)));
    if (on.has("se")) marks.push(...errorbars(bars(S.meanSe, 0)));
    if (on.has("ci")) marks.push(...errorbars(bars(S.meanClNormal, 0.1)));
    // With no layers there is nothing to fit the y-axis to; use the data.
    const yDomain = marks.length ? undefined : d3.extent([...A, ...B]);
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [0.4, 2.6], ticks: [1, 2], tickFormat: (d) => ({ 1: "A", 2: "B" })[d], label: t.group },
      y: { domain: yDomain, label: t.value, nice: true },
      marks,
    })), marks.length ? null : t.noLayer);
  };
};

builders.se = (side, main, redraw) => {
  const mA = slider(t.meanA, { min: 0, max: 10, step: 0.5, value: 5 }, redraw);
  const mB = slider(t.meanB, { min: 0, max: 10, step: 0.5, value: 6 }, redraw);
  const sA = slider(t.sdA, { min: 0, max: 5, step: 0.1, value: 2.5 }, redraw);
  const sB = slider(t.sdB, { min: 0, max: 5, step: 0.1, value: 2.5 }, redraw);
  const n0 = slider(t.initialN, { min: 10, max: 100, value: 10 }, redraw);
  side.append(h("h5", {}, t.data), mA.node, mB.node, sA.node, sB.node, n0.node,
    h("button", { class: "btn", type: "button", onclick: redraw }, `↻ ${t.resample}`));
  const fig = h("div", { class: "figure" });
  main.append(
    h("p", { class: "plot-title" }, t.seTitle),
    h("p", { class: "plot-subtitle", html: t.groupsAB(coloured("A", C.orange), coloured("B", C.blue)) }),
    fig, text(t.seText));

  return () => {
    // Unseeded, as in the dashboard: every redraw is a fresh set of samples.
    const r = S.rng(S.randomSeed());
    const rows = [];
    for (let i = 1; i <= 10; i++) {
      const n = n0.value * i;
      for (const [g, m, s, dx] of [["A", mA.value, sA.value, -0.075], ["B", mB.value, sB.value, 0.075]]) {
        const v = r.rnorm(n, m, s), mu = S.mean(v), se = S.se(v);
        rows.push({ x: i + dx, g, mean: mu, lo: mu - se, hi: mu + se });
      }
    }
    const colour = { A: C.orange, B: C.blue };
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [0.4, 10.6], ticks: d3.range(1, 11), tickFormat: (i) => n0.value * i, label: t.seX },
      y: { label: t.value, nice: true },
      marks: [
        Plot.ruleX(rows, { x: "x", y1: "lo", y2: "hi", stroke: (d) => colour[d.g], strokeWidth: 1.8 }),
        Plot.dot(rows, { x: "x", y: "mean", r: 5, fill: (d) => colour[d.g] }),
      ],
    })));
  };
};

builders.t = (side, main, redraw) => {
  const mA = slider(t.meanPopA, { min: 0, max: 10, step: 0.5, value: 5 }, redraw);
  const mB = slider(t.meanPopB, { min: 0, max: 10, step: 0.5, value: 6 }, redraw);
  const sA = slider(t.sdPopA, { min: 0.5, max: 5, step: 0.1, value: 2.5 }, redraw);
  const sB = slider(t.sdPopB, { min: 0.5, max: 5, step: 0.1, value: 2.5 }, redraw);
  const n = slider(t.nPerGroup, { min: 10, max: 200, value: 100 }, redraw);
  side.append(h("h5", {}, t.data), mA.node, mB.node, sA.node, sB.node, n.node,
    h("button", { class: "btn", type: "button", onclick: redraw }, `↻ ${t.resample}`));
  const fig = h("div", { class: "figure" });
  const sub = h("p", { class: "plot-subtitle" });
  main.append(
    h("p", { class: "plot-title", html: t.samplesAB(coloured("A", C.orange), coloured("B", C.blue)) }),
    sub, fig, text(t.tText));

  const SIMS = 1000, SHOWN = 50, POOLED = 5000;
  const grid = S.seq(-5, 15, 241);
  return () => {
    const r = S.rng(S.randomSeed());
    let above = 0;
    const shownA = [], shownB = [], poolA = [], poolB = [];
    let sumA = 0, sumB = 0;
    const keepEvery = Math.max(1, Math.floor((SIMS * n.value) / POOLED));
    for (let s = 0; s < SIMS; s++) {
      const a = r.rnorm(n.value, mA.value, sA.value), b = r.rnorm(n.value, mB.value, sB.value);
      if (S.welchT(a, b).p > 0.05) above++;
      if (s < SHOWN) { shownA.push(a); shownB.push(b); }
      sumA += S.sum(a); sumB += S.sum(b);
      for (let i = s % keepEvery; i < a.length; i += keepEvery) { poolA.push(a[i]); poolB.push(b[i]); }
    }
    sub.textContent = t.pShare(Math.round((above / SIMS) * 100));
    const curve = (v, id) => S.density(v, grid).map((y, i) => ({ x: grid[i], y, id }));
    const thinA = shownA.flatMap((v, i) => curve(v, i)), thinB = shownB.flatMap((v, i) => curve(v, i));
    const thick = [...curve(poolA, "A"), ...curve(poolB, "B")];
    const meanA = sumA / (SIMS * n.value), meanB = sumB / (SIMS * n.value);
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [-5, 15], label: t.tX },
      y: { axis: null, line: false },
      marks: [
        Plot.ruleX([meanA], { stroke: C.orange, strokeDasharray: "5,4", strokeWidth: 1.2 }),
        Plot.ruleX([meanB], { stroke: C.blue, strokeDasharray: "5,4", strokeWidth: 1.2 }),
        Plot.line(thinA, { x: "x", y: "y", z: "id", stroke: C.orange, strokeOpacity: 0.12, strokeWidth: 0.8 }),
        Plot.line(thinB, { x: "x", y: "y", z: "id", stroke: C.blue, strokeOpacity: 0.1, strokeWidth: 0.8 }),
        Plot.line(thick, { x: "x", y: "y", z: "id", stroke: (d) => (d.id === "A" ? C.orange : C.blue), strokeWidth: 2.2, strokeOpacity: 0.85 }),
        Plot.ruleY([0], { strokeOpacity: 0 }),
      ],
    })));
  };
};

builders.anova = (side, main, redraw) => {
  const mA = slider(t.meanA, { min: 0, max: 100, value: 50 }, redraw);
  const mB = slider(t.meanB, { min: 0, max: 100, value: 60 }, redraw);
  const mC = slider(t.meanC, { min: 0, max: 100, value: 70 }, redraw);
  const sd = slider(t.sdCommon, { min: 1, max: 20, value: 10 }, redraw);
  const n = slider(t.nAnova, { min: 5, max: 100, value: 30 }, redraw);
  side.append(h("h5", {}, "ANOVA"), mA.node, mB.node, mC.node, sd.node, n.node);
  const fig = h("div", { class: "figure" });
  const tables = { ANOVA: h("div", { class: "table-wrap" }), "Tukey HSD": h("div", { class: "table-wrap", hidden: true }) };
  const subtabs = h("div", { class: "subtabs", role: "tablist" }, Object.keys(tables).map((name, i) =>
    h("button", { type: "button", role: "tab", "aria-selected": i === 0 ? "true" : "false", onclick: (e) => {
      for (const b of e.currentTarget.parentNode.children) b.setAttribute("aria-selected", b === e.currentTarget);
      for (const [k, el] of Object.entries(tables)) el.hidden = k !== name;
    } }, name)));
  main.append(fig, text(t.anovaText), subtabs, ...Object.values(tables));

  const num = (v, d = 2) => v.toFixed(d);
  const pval = (p) => (p < 2e-16 ? "<2e-16" : p < 1e-4 ? p.toExponential(2) : p.toFixed(4));
  const table = (head, rows) => h("table", { class: "stat" },
    h("thead", {}, h("tr", {}, head.map((c) => h("th", {}, c)))),
    h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c) => h("td", {}, c))))));

  return () => {
    const r = S.rng(123);
    const g = { A: r.rnorm(n.value, mA.value, sd.value), B: r.rnorm(n.value, mB.value, sd.value), C: r.rnorm(n.value, mC.value, sd.value) };
    const groups = Object.values(g).map((values, i) => ({ x: i + 1, values }));
    const jit = S.rng(7);
    const pts = groups.flatMap(({ x, values }) => values.map((y) => ({ x: x + (jit.unif() - 0.5) * 0.5, y })));
    const summ = groups.map(({ x, values }) => { const [lo, hi] = S.meanSe(values); return { x, lo, hi, mean: S.mean(values) }; });
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [0.4, 3.6], ticks: [1, 2, 3], tickFormat: (d) => "ABC"[d - 1], label: t.group },
      y: { label: "y", nice: true },
      marks: [
        ...boxplots(groups, { half: 0.25, stroke: "#222" }),
        Plot.dot(pts, { x: "x", y: "y", r: 4, fill: "#000", fillOpacity: 0.1 }),
        Plot.ruleX(summ, { x: "x", y1: "lo", y2: "hi", stroke: C.orange, strokeWidth: 2.5 }),
        Plot.dot(summ, { x: "x", y: "mean", r: 5.5, fill: C.orange }),
      ],
    })));
    const { table: a, tukey } = S.anova(g);
    tables.ANOVA.replaceChildren(table(["", "Df", "Sum Sq", "Mean Sq", "F value", "Pr(>F)"], [
      [t.aovRows[0], a.between.df, num(a.between.ss), num(a.between.ms), num(a.between.F, 3), pval(a.between.p)],
      [t.aovRows[1], a.within.df, num(a.within.ss), num(a.within.ms), "", ""],
    ]));
    tables["Tukey HSD"].replaceChildren(table(["", "diff", "lwr", "upr", "p adj"],
      tukey.map((d) => [d.pair, num(d.diff, 3), num(d.lwr, 3), num(d.upr, 3), pval(d.p)])));
  };
};

builders.lma = (side, main, redraw) => {
  const b0 = slider(t.intercept, { min: -5, max: 5, step: 0.5, value: 0 }, redraw);
  const b1 = slider(t.slope, { min: -5, max: 5, step: 0.5, value: 0 }, redraw);
  const vOut = readout(), sOut = readout();
  side.append(h("h5", {}, t.coefficients), b0.node, b1.node,
    h("h5", {}, t.regression), h("p", { class: "formula", html: "Y = β<sub>0</sub> + β<sub>1</sub>X + ε" }),
    h("h5", {}, t.results), vOut, sOut);
  const fig = h("div", { class: "figure" });
  main.append(fig, text(t.lmaText));

  const r = S.rng(123);
  const xs = r.rnorm(100, 1, 2);
  const data = xs.map((x) => ({ x, y: 1.5 + 2 * x + r.norm() }));
  const xDom = [-5, 5], yDom = [-10, 10];
  return () => {
    const variance = r2(S.mean(data.map((d) => (d.y - (b0.value + b1.value * d.x)) ** 2)));
    vOut.textContent = `${t.variance}${t.colon}${variance}`;
    sOut.textContent = `${t.stdev}${t.colon}${r2(Math.sqrt(variance))}`;
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: xDom, label: "x" }, y: { domain: yDom, label: "y" }, clip: true,
      marks: [
        Plot.dot(data, { x: "x", y: "y", r: 6, fill: C.orange, fillOpacity: 0.5 }),
        Plot.line([xDom[0], xDom[1]].map((x) => ({ x, y: b0.value + b1.value * x })), { x: "x", y: "y", stroke: C.gray30, strokeWidth: 2.2 }),
        ...rug(data, xDom, yDom),
      ],
    })));
  };
};

builders.lmb = (side, main, redraw) => {
  const n = slider(t.sampleSize, { min: 3, max: 98, step: 5, value: 3 }, redraw);
  const outs = { pop: readout(), sam: readout(), se: readout(), ci: readout() };
  side.append(h("h5", {}, t.certaintyLine), n.node, h("div", { class: "row" }, playButton(n, redraw)),
    h("h5", {}, t.regression), h("p", { class: "formula", html: "Y = β<sub>0</sub> + β<sub>1</sub>X + ε" }),
    h("h5", {}, t.slopeValues), outs.pop, outs.sam, h("h5", {}, t.extras), outs.se, outs.ci);
  const fig = h("div", { class: "figure" });
  main.append(fig, text(t.lmbText));

  const xDom = [0, 100], yDom = [0, 250];
  return () => {
    // Draw (x, y) in pairs so a larger n only adds points to the same sample.
    const r = S.rng(123);
    const data = d3.range(n.value).map(() => { const x = r.norm(50, 20); return { x, y: 2 * x + r.norm(0, 30) }; });
    const xs = data.map((d) => d.x);
    const fit = S.lm(xs, data.map((d) => d.y));
    outs.pop.textContent = `${t.population}${t.colon}2`;
    outs.sam.textContent = `${t.sample}${t.colon}${fmt2(fit.b1)}`;
    outs.se.textContent = `${t.estSe}${t.colon}${fmt2(fit.se1)}`;
    outs.ci.textContent = `${t.ci95}${t.colon}[${fmt2(fit.ci[0])}, ${fmt2(fit.ci[1])}]`;
    const [lo, hi] = d3.extent(xs);
    const band = fit.band(S.seq(lo, hi, 80));
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: xDom, label: "x" }, y: { domain: yDom, label: "y" }, clip: true,
      marks: [
        Plot.areaY(band, { x: "x", y1: "lo", y2: "hi", fill: C.ribbon, fillOpacity: 0.35 }),
        Plot.dot(data, { x: "x", y: "y", r: 6, fill: C.orange, fillOpacity: 0.5 }),
        Plot.line(band, { x: "x", y: "fit", stroke: C.gray30, strokeWidth: 2.2 }),
        Plot.line([{ x: 0, y: 0 }, { x: 125, y: 250 }], { x: "x", y: "y", stroke: C.orange, strokeWidth: 2, strokeDasharray: "7,5" }),
        ...rug(data, xDom, yDom),
      ],
    })));
  };
};

builders.glm = (side, main, redraw) => {
  const n = slider(t.sampleSize, { min: 15, max: 200, step: 5, value: 15 }, redraw);
  const outs = { pop: readout(), sam: readout(), se: readout(), ci: readout() };
  const warn = h("p", { class: "note", hidden: true }, t.separation);
  side.append(h("h5", {}, t.certaintyCurve), n.node, h("div", { class: "row" }, playButton(n, redraw)),
    h("h5", {}, t.regression), h("p", { class: "formula", html: "logit(P) = β<sub>0</sub> + β<sub>1</sub>X" }),
    h("h5", {}, t.slopeValues), outs.pop, outs.sam, h("h5", {}, t.extras), outs.se, outs.ci, warn);
  const fig = h("div", { class: "figure" });
  main.append(fig, text(t.glmText));

  const curveX = S.seq(-3, 3, 121);
  const truth = curveX.map((x) => ({ x, y: 1 / (1 + Math.exp(-4 * x)) }));
  return () => {
    // Paired draws, as in LMb. With seed 123 no sample size from 15 to 200
    // is perfectly separated (a true slope of 4 makes that common at small n).
    const r = S.rng(123);
    const xs = [], ys = [];
    for (let i = 0; i < n.value; i++) { const x = r.norm(); xs.push(x); ys.push(r.bern(1 / (1 + Math.exp(-4 * x)))); }
    const fit = S.logistic(xs, ys);
    const jit = S.rng(7);
    const data = xs.map((x, i) => ({ x, y: ys[i] + (jit.unif() - 0.5) * 0.1 }));
    outs.pop.textContent = `${t.population}${t.colon}4`;
    outs.sam.textContent = `${t.sample}${t.colon}${fmt2(fit.b1)}`;
    outs.se.textContent = `${t.estSe}${t.colon}${fmt2(fit.se1)}`;
    outs.ci.textContent = `${t.ci95}${t.colon}${fit.ci ? `[${fmt2(fit.ci[0])}, ${fmt2(fit.ci[1])}]` : "—"}`;
    warn.hidden = !fit.separated;
    const [lo, hi] = d3.extent(xs);
    const band = fit.band(S.seq(lo, hi, 100));
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [-3, 3], label: "x" },
      y: { domain: [-0.1, 1.1], ticks: [0, 1], tickFormat: String, label: t.response01 }, clip: true,
      marks: [
        Plot.areaY(band, { x: "x", y1: "lo", y2: "hi", fill: C.ribbon, fillOpacity: 0.35 }),
        Plot.dot(data, { x: "x", y: "y", r: 6, fill: C.violet, fillOpacity: 0.5 }),
        Plot.line(band, { x: "x", y: "fit", stroke: C.gray30, strokeWidth: 2.2 }),
        Plot.line(truth, { x: "x", y: "y", stroke: C.violet, strokeWidth: 2, strokeDasharray: "7,5" }),
      ],
    })));
  };
};

builders.bayes = (side, main, redraw) => {
  const pos = slider(t.positives, { min: 0, max: 100, value: 20 }, redraw);
  const neg = slider(t.negatives, { min: 0, max: 100, value: 10 }, redraw);
  const radios = [["yes", t.flatYes], ["no", t.flatNo]].map(([v, label]) => {
    const input = h("input", { type: "radio", name: "flat", value: v, checked: v === "no", onchange: () => { sync(); redraw(); } });
    return { input, node: h("label", {}, input, label) };
  });
  const prior = slider(t.priorMean, { min: 0.2, max: 0.8, step: 0.1, value: 0.5 }, redraw);
  const cert = slider(t.priorCertainty, { min: 0, max: 1, step: 0.1, value: 0.5 }, redraw);
  const mult = slider(t.multiplier, { min: 1, max: 10, step: 1, value: 1 }, redraw);
  const flat = () => radios[0].input.checked;
  const sync = () => { prior.disabled = flat(); cert.disabled = flat(); };
  side.append(h("h5", {}, t.options), pos.node, neg.node,
    h("div", { class: "control" }, h("div", { class: "label" }, t.flatPrior), h("div", { class: "radios" }, radios.map((r) => r.node))),
    prior.node, cert.node, mult.node, h("div", { class: "row" }, playButton(mult, redraw)));
  const fig = h("div", { class: "figure" });
  main.append(
    h("p", { class: "plot-title", html: t.bayesTitle(coloured(t.prior, C.orange), coloured(t.dataWord, C.blue), coloured(t.posterior, "#000")) }),
    fig, text(t.bayesText));

  const grid = S.seq(0, 1, 201);
  return () => {
    let a = 1, b = 1;
    if (!flat()) {
      const p = prior.value;
      // As in the dashboard: certainty 0 is flat, otherwise remapped to 0.65–0.99.
      const certainty = cert.value === 0 ? 0 : 0.65 + cert.value * 0.34;
      const p2 = p <= 0.89 ? p + 0.05 : p - 0.05;
      if (certainty !== 0) [a, b] = S.betaSelect({ p: certainty, x: p2 }, { p: 0.5, x: p }) ?? [1, 1];
    }
    const k = mult.value, P = pos.value * k, N = neg.value * k;
    const curve = (fn, id) => grid.map((x) => ({ x, y: fn(x), id })).filter((d) => Number.isFinite(d.y));
    const lines = [
      ...curve((x) => S.dbeta(x, a, b), "prior"),
      ...curve((x) => S.dbeta(x, P + 1, N + 1), "data"),
      ...curve((x) => S.dbeta(x, a + P, b + N), "posterior"),
    ];
    const style = { prior: [C.orange, "7,5"], data: [C.blue, "7,5"], posterior: ["#000", null] };
    draw(fig, Plot.plot(plotOpts(fig, {
      x: { domain: [0, 1], label: t.bayesX },
      y: { axis: null, line: false },
      marks: ["prior", "data", "posterior"].map((id) => Plot.line(lines.filter((d) => d.id === id), {
        x: "x", y: "y", stroke: style[id][0], strokeWidth: 2.2, strokeDasharray: style[id][1],
      })),
    })));
  };
};

builders.bib = (side, main) => {
  const pre = h("pre", { class: "cite" }, CITATION);
  const btn = h("button", { class: "btn", type: "button", onclick: async () => {
    try { await navigator.clipboard.writeText(CITATION); btn.textContent = "✓"; } catch { /* clipboard blocked */ }
    setTimeout(() => (btn.textContent = t.copy), 1500);
  } }, t.copy);
  main.append(h("h4", {}, t.citeHead), pre, btn);
  return () => {};
};

// ---------------------------------------------------------------------------
// Shell: tabs with hash routing (#viz, #se, ...), lazy drawing.

document.documentElement.lang = t.htmlLang;
document.title = t.docTitle;
document.getElementById("app-title").textContent = t.title;
const nav = document.getElementById("tabs"), panels = document.getElementById("panels");
const tabs = {};

for (const id of TABS) {
  const single = id === "bib";
  const panel = h("section", { class: `panel${single ? " single" : ""}`, id: `panel-${id}`, role: "tabpanel" });
  if (id === TABS[0]) panel.append(h("p", { class: "welcome", html: t.welcome }));
  const side = h("aside", { class: "sidebar" }), main = h("div", { class: "main" });
  if (!single) panel.append(side);
  panel.append(main);
  panels.append(panel);
  // Coalesce bursts of slider events into one draw per frame.
  let queued = false;
  const redraw = () => {
    if (queued || !panel.classList.contains("active")) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tabs[id].draw(); });
  };
  const btn = h("button", { type: "button", role: "tab", "aria-controls": panel.id, html: t.tabs[id], onclick: () => { location.hash = id; } });
  nav.append(btn);
  tabs[id] = { panel, btn, draw: builders[id](side, main, redraw) };
}

function show() {
  const id = TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : TABS[0];
  for (const [k, tab] of Object.entries(tabs)) {
    tab.panel.classList.toggle("active", k === id);
    tab.btn.setAttribute("aria-selected", k === id);
  }
  tabs[id].draw();
}
window.addEventListener("hashchange", show);
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(show, 150); });
show();
