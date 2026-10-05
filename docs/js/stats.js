// Statistics core for the Stats 101 app: pure functions, no DOM.
// Ports of the R calls the original Shiny app made (rnorm, lm, glm,
// confint, t.test, aov, TukeyHSD, density). Distribution functions come
// from jStat; tests/check.mjs compares every function here against R.

// jStat is a global in the browser and a CommonJS module in Node.
const J = globalThis.jStat ?? (await import("jstat")).default.jStat;

// ---------------------------------------------------------------------------
// Random numbers. Seeded so that plots which used set.seed(123) in R stay
// stable while sliders move; the streams differ from R's, which is fine for
// a teaching visual.

export function rng(seed = 123) {
  let a = seed >>> 0;
  const unif = () => {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare = null;
  const norm = (mean = 0, sd = 1) => {
    if (spare !== null) { const z = spare; spare = null; return mean + sd * z; }
    let u = 0;
    while (u === 0) u = unif();
    const r = Math.sqrt(-2 * Math.log(u)), th = 2 * Math.PI * unif();
    spare = r * Math.sin(th);
    return mean + sd * r * Math.cos(th);
  };
  return {
    unif,
    norm,
    rnorm: (n, mean = 0, sd = 1) => Array.from({ length: n }, () => norm(mean, sd)),
    bern: (p) => (unif() < p ? 1 : 0),
  };
}

export const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;

// ---------------------------------------------------------------------------
// Descriptives

export const sum = (x) => x.reduce((s, v) => s + v, 0);
export const mean = (x) => sum(x) / x.length;
export function variance(x) {
  const m = mean(x);
  return sum(x.map((v) => (v - m) ** 2)) / (x.length - 1);
}
export const sd = (x) => Math.sqrt(variance(x));
export const se = (x) => sd(x) / Math.sqrt(x.length);
export const qt = (p, df) => J.studentt.inv(p, df);
export const qnorm = (p) => J.normal.inv(p, 0, 1);

// R's quantile(type = 7), the default, also used by ggplot's boxplot.
export function quantile(x, p) {
  const s = [...x].sort((a, b) => a - b);
  const h = (s.length - 1) * p, lo = Math.floor(h);
  return s[lo] + (h - lo) * ((s[lo + 1] ?? s[lo]) - s[lo]);
}

// ggplot2 stat_boxplot: hinges from quantile type 7, whiskers to the most
// extreme points within 1.5 IQR, everything beyond is an outlier.
export function boxStats(x) {
  const q1 = quantile(x, 0.25), q2 = quantile(x, 0.5), q3 = quantile(x, 0.75);
  const iqr = q3 - q1;
  const inside = x.filter((v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  return {
    q1, q2, q3,
    lo: Math.min(...inside),
    hi: Math.max(...inside),
    outliers: x.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr),
  };
}

// ggplot2 summary functions used by stat_summary in the app.
export const meanSdl = (x) => [mean(x) - sd(x), mean(x) + sd(x)];       // mean_sdl(mult = 1)
export const meanSe = (x) => [mean(x) - se(x), mean(x) + se(x)];        // mean_se()
export const meanClNormal = (x) => {                                     // mean_cl_normal()
  const h = qt(0.975, x.length - 1) * se(x);
  return [mean(x) - h, mean(x) + h];
};

// ---------------------------------------------------------------------------
// t.test(a, b): Welch two-sample test (R's default, var.equal = FALSE).

export function welchT(a, b) {
  const va = variance(a) / a.length, vb = variance(b) / b.length;
  const t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
  const df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  return { t, df, p: 2 * (1 - J.studentt.cdf(Math.abs(t), df)) };
}

// ---------------------------------------------------------------------------
// lm(y ~ x): estimates, SE, confint(), and the geom_smooth(method = "lm")
// ribbon (t-based, level 0.95).

export function lm(x, y) {
  const n = x.length, mx = mean(x), my = mean(y);
  const sxx = sum(x.map((v) => (v - mx) ** 2));
  const b1 = sum(x.map((v, i) => (v - mx) * (y[i] - my))) / sxx;
  const b0 = my - b1 * mx;
  const df = n - 2;
  const s2 = sum(y.map((v, i) => (v - b0 - b1 * x[i]) ** 2)) / df;
  const se1 = Math.sqrt(s2 / sxx);
  const tq = qt(0.975, df);
  return {
    b0, b1, se1, df,
    ci: [b1 - tq * se1, b1 + tq * se1],
    band(xs) {
      return xs.map((v) => {
        const fit = b0 + b1 * v;
        const h = tq * Math.sqrt(s2 * (1 / n + (v - mx) ** 2 / sxx));
        return { x: v, fit, lo: fit - h, hi: fit + h };
      });
    },
  };
}

// ---------------------------------------------------------------------------
// glm(y ~ x, family = binomial): IRLS as in glm.fit (epsilon 1e-8, maxit 25).

const plogis = (eta) => 1 / (1 + Math.exp(-eta));

function logLik(x, y, b0, b1) {
  let ll = 0;
  for (let i = 0; i < x.length; i++) {
    const eta = b0 + b1 * x[i];
    // log(1 + exp(eta)) without overflow
    const l1p = eta > 0 ? eta + Math.log1p(Math.exp(-eta)) : Math.log1p(Math.exp(eta));
    ll += y[i] * eta - l1p;
  }
  return ll;
}

export function logistic(x, y) {
  let b0 = 0, b1 = 0, dev = Infinity, converged = false, it = 0;
  let info = null;
  for (it = 1; it <= 25; it++) {
    // Weighted least squares on the working response.
    let s00 = 0, s01 = 0, s11 = 0, r0 = 0, r1 = 0;
    for (let i = 0; i < x.length; i++) {
      const eta = b0 + b1 * x[i], mu = plogis(eta);
      const w = Math.max(mu * (1 - mu), 1e-300);
      const z = eta + (y[i] - mu) / w;
      s00 += w; s01 += w * x[i]; s11 += w * x[i] * x[i];
      r0 += w * z; r1 += w * x[i] * z;
    }
    const det = s00 * s11 - s01 * s01;
    b0 = (s11 * r0 - s01 * r1) / det;
    b1 = (s00 * r1 - s01 * r0) / det;
    const newDev = -2 * logLik(x, y, b0, b1);
    if (Math.abs(newDev - dev) / (Math.abs(newDev) + 0.1) < 1e-8) { dev = newDev; converged = true; break; }
    dev = newDev;
  }
  // Fisher information at the estimate, for SEs.
  let s00 = 0, s01 = 0, s11 = 0;
  for (let i = 0; i < x.length; i++) {
    const mu = plogis(b0 + b1 * x[i]), w = mu * (1 - mu);
    s00 += w; s01 += w * x[i]; s11 += w * x[i] * x[i];
  }
  const det = s00 * s11 - s01 * s01;
  info = { v00: s11 / det, v01: -s01 / det, v11: s00 / det };
  const se1 = Math.sqrt(info.v11);
  // Fitted probabilities numerically 0 or 1 is R's separation warning.
  const separated = x.some((v) => { const mu = plogis(b0 + b1 * v); return mu < 1e-8 || mu > 1 - 1e-8; });
  return {
    b0, b1, se1, converged, separated, iterations: it,
    ci: converged && !separated ? profileCI(x, y, b0, b1, se1) : null,
    // geom_smooth(method = "glm"): Wald interval on the link scale, mapped back.
    band(xs) {
      const z = qnorm(0.975);
      return xs.map((v) => {
        const eta = b0 + b1 * v;
        const s = Math.sqrt(info.v00 + 2 * v * info.v01 + v * v * info.v11);
        return { x: v, fit: plogis(eta), lo: plogis(eta - z * s), hi: plogis(eta + z * s) };
      });
    },
  };
}

// confint() on a glm profiles the likelihood: the CI holds the values of b1
// whose profile deviance is within qchisq(0.95, 1) of the minimum.
function profileCI(x, y, b0hat, b1hat, se1) {
  const llMax = logLik(x, y, b0hat, b1hat);
  const crit = J.chisquare.inv(0.95, 1);
  // Maximise over b0 with b1 fixed (1-D Newton).
  const profile = (b1) => {
    let b0 = b0hat;
    for (let k = 0; k < 50; k++) {
      let g = 0, h = 0;
      for (let i = 0; i < x.length; i++) {
        const mu = plogis(b0 + b1 * x[i]);
        g += y[i] - mu; h += mu * (1 - mu);
      }
      const step = g / h;
      b0 += step;
      if (Math.abs(step) < 1e-12) break;
    }
    return 2 * (llMax - logLik(x, y, b0, b1)) - crit;
  };
  const root = (dir) => {
    let inner = b1hat, outer = b1hat + dir * se1;
    for (let k = 0; profile(outer) < 0; k++) {
      if (k > 60) return NaN;
      inner = outer; outer = b1hat + dir * se1 * 2 ** (k + 1);
    }
    for (let k = 0; k < 100; k++) {
      const mid = (inner + outer) / 2;
      if (profile(mid) < 0) inner = mid; else outer = mid;
    }
    return (inner + outer) / 2;
  };
  return [root(-1), root(1)];
}

// ---------------------------------------------------------------------------
// aov(y ~ group) + TukeyHSD(), for balanced or unbalanced groups.

export function anova(groups) {
  const names = Object.keys(groups);
  const all = names.flatMap((g) => groups[g]);
  const N = all.length, k = names.length, gm = mean(all);
  const ssb = sum(names.map((g) => groups[g].length * (mean(groups[g]) - gm) ** 2));
  const ssw = sum(names.map((g) => { const m = mean(groups[g]); return sum(groups[g].map((v) => (v - m) ** 2)); }));
  const dfb = k - 1, dfw = N - k;
  const msb = ssb / dfb, msw = ssw / dfw, F = msb / msw;
  const table = {
    between: { df: dfb, ss: ssb, ms: msb, F, p: 1 - J.centralF.cdf(F, dfb, dfw) },
    within: { df: dfw, ss: ssw, ms: msw },
  };
  const qcrit = J.tukey.inv(0.95, k, dfw);
  const tukey = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const a = groups[names[i]], b = groups[names[j]];
      const diff = mean(b) - mean(a);
      const s = Math.sqrt((msw / 2) * (1 / a.length + 1 / b.length));
      tukey.push({
        pair: `${names[j]}-${names[i]}`,
        diff, lwr: diff - qcrit * s, upr: diff + qcrit * s,
        p: 1 - J.tukey.cdf(Math.abs(diff) / s, k, dfw),
      });
    }
  }
  return { table, tukey };
}

// ---------------------------------------------------------------------------
// density(x): Gaussian kernel, bw.nrd0 bandwidth, evaluated on a grid.

export function bwNrd0(x) {
  const hi = sd(x);
  const iqr = quantile(x, 0.75) - quantile(x, 0.25);
  let lo = Math.min(hi, iqr / 1.34);
  if (!(lo > 0)) lo = hi || Math.abs(x[0]) || 1;
  return 0.9 * lo * x.length ** -0.2;
}

export function density(x, grid) {
  const bw = bwNrd0(x), n = x.length;
  const c = 1 / (n * bw * Math.sqrt(2 * Math.PI));
  return grid.map((g) => {
    let s = 0;
    for (let i = 0; i < n; i++) { const u = (g - x[i]) / bw; s += Math.exp(-0.5 * u * u); }
    return s * c;
  });
}

// ---------------------------------------------------------------------------
// LearnBayes::beta.select(quantile1, quantile2): the Beta(a, b) whose
// quantiles pass through two given points. Ported statement by statement.

export const dbeta = (x, a, b) => J.beta.pdf(x, a, b);

export function betaSelect(q1, q2) {
  const betaprior1 = (K, x, p) => {
    let lo = 0, hi = 1, m0;
    for (;;) {
      m0 = (lo + hi) / 2;
      const p0 = J.beta.cdf(x, K * m0, K * (1 - m0));
      if (p0 < p) hi = m0; else lo = m0;
      if (Math.abs(p0 - p) < 1e-4) return m0;
    }
  };
  const logK = seq(-3, 8, 100);
  const K = logK.map(Math.exp);
  const m = K.map((k) => betaprior1(k, q1.x, q1.p));
  const prob2 = K.map((k, i) => J.beta.cdf(q2.x, k * m[i], k * (1 - m[i])));
  const pts = prob2.map((p, i) => [p, logK[i]]).filter(([p]) => p > 0 && p < 1);
  const app = approx(pts, q2.p);
  if (Number.isNaN(app)) return null;
  const K0 = Math.exp(app);
  const m0 = betaprior1(K0, q1.x, q1.p);
  const round2 = (v) => Math.round(v * 100) / 100;
  return [round2(K0 * m0), round2(K0 * (1 - m0))];
}

// stats::approx(x, y, xout) with its defaults: sorted by x, tied x values
// collapsed to their mean y, NA outside the range.
function approx(pts, xout) {
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  const xs = [], ys = [];
  for (let i = 0; i < sorted.length;) {
    let j = i, s = 0;
    while (j < sorted.length && sorted[j][0] === sorted[i][0]) s += sorted[j++][1];
    xs.push(sorted[i][0]); ys.push(s / (j - i)); i = j;
  }
  if (xs.length === 0 || xout < xs[0] || xout > xs[xs.length - 1]) return NaN;
  let k = 0;
  while (k < xs.length - 1 && xs[k + 1] < xout) k++;
  if (xs[k] === xout || k === xs.length - 1) return ys[k];
  return ys[k] + ((ys[k + 1] - ys[k]) * (xout - xs[k])) / (xs[k + 1] - xs[k]);
}

export const seq = (from, to, n) => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
