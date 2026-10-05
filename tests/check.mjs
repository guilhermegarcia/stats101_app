// Cross-checks js/stats.js against R. Run from anywhere:
//   node tests/check.mjs
// Generates data in JS, has Rscript compute the same statistics, compares.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
globalThis.jStat = createRequire(import.meta.url)(join(here, "../docs/vendor/jstat.min.js")).jStat;
const S = await import("../docs/js/stats.js");

const cases = [];
const r = S.rng(42);
for (const n of [3, 8, 23, 98]) {
  const x = r.rnorm(n, 50, 20), y = x.map((v) => 2 * v + r.norm(0, 30));
  cases.push({ kind: "lm", x, y });
}
for (const n of [15, 40, 200]) {
  const x = r.rnorm(n), y = x.map((v) => r.bern(1 / (1 + Math.exp(-1.5 * v))));
  cases.push({ kind: "glm", x, y });
}
for (const n of [10, 100]) cases.push({ kind: "t", a: r.rnorm(n, 5, 2.5), b: r.rnorm(n, 6, 1) });
for (const n of [5, 30]) cases.push({ kind: "aov", A: r.rnorm(n, 50, 10), B: r.rnorm(n, 60, 10), C: r.rnorm(n, 52, 10) });
cases.push({ kind: "box", x: [...r.rnorm(57, 0, 1), 4.5, -3.9] });
cases.push({ kind: "dens", x: r.rnorm(100, 3, 2) });

const dir = mkdtempSync(join(tmpdir(), "stats101-"));
writeFileSync(join(dir, "in.json"), JSON.stringify(cases));
const R = `
suppressMessages(library(jsonlite))
cs <- fromJSON("${dir}/in.json", simplifyVector = FALSE)
v <- function(l) unlist(l)
out <- lapply(cs, function(c) switch(c$kind,
  lm = { f <- lm(y ~ x, data.frame(x = v(c$x), y = v(c$y)))
         p <- predict(f, data.frame(x = c(0, 50, 100)), se.fit = TRUE)
         list(b1 = unname(coef(f)[2]), se = summary(f)$coef[2, 2], ci = unname(confint(f)[2, ]),
              band = unname(p$fit + qt(.975, p$df) * p$se.fit)) },
  glm = { f <- glm(y ~ x, binomial, data.frame(x = v(c$x), y = v(c$y)))
          p <- predict(f, data.frame(x = c(-2, 0, 2)), se.fit = TRUE)
          list(b1 = unname(coef(f)[2]), se = summary(f)$coef[2, 2],
               ci = unname(suppressMessages(confint(f))[2, ]),
               band = plogis(unname(p$fit + qnorm(.975) * p$se.fit))) },
  t = { tt <- t.test(v(c$a), v(c$b)); list(t = unname(tt$statistic), df = unname(tt$parameter), p = tt$p.value) },
  aov = { d <- data.frame(y = c(v(c$A), v(c$B), v(c$C)), g = rep(c("A", "B", "C"), each = length(c$A)))
          m <- aov(y ~ g, d); s <- summary(m)[[1]]; tk <- TukeyHSD(m)$g
          list(F = s[["F value"]][1], p = s[["Pr(>F)"]][1], diff = unname(tk[, 1]), lwr = unname(tk[, 2]), padj = unname(tk[, 4])) },
  box = { b <- boxplot.stats(v(c$x), coef = 1.5)
          q <- unname(quantile(v(c$x), c(.25, .5, .75)))
          list(q = q, out = sort(b$out)) },
  dens = { d <- density(v(c$x), from = -2, to = 8, n = 11); list(bw = d$bw, y = d$y) }))
cat(toJSON(out, digits = NA, auto_unbox = TRUE))
`;
const ref = JSON.parse(execFileSync("Rscript", ["--vanilla", "-e", R], { encoding: "utf8" }));

let fails = 0, checks = 0;
const close = (label, a, b, tol = 1e-6) => {
  const A = [a].flat(), B = [b].flat();
  A.forEach((x, i) => {
    checks++;
    const ok = Math.abs(x - B[i]) <= tol * Math.max(1, Math.abs(B[i]));
    if (!ok) { fails++; console.log(`FAIL ${label}[${i}]: js ${x} vs R ${B[i]}`); }
  });
};

cases.forEach((c, i) => {
  const e = ref[i], tag = `${c.kind}#${i}`;
  if (c.kind === "lm") {
    const f = S.lm(c.x, c.y);
    close(`${tag} b1`, f.b1, e.b1); close(`${tag} se`, f.se1, e.se); close(`${tag} ci`, f.ci, e.ci);
    close(`${tag} band`, f.band([0, 50, 100]).map((d) => d.hi), e.band);
  } else if (c.kind === "glm") {
    const f = S.logistic(c.x, c.y);
    close(`${tag} b1`, f.b1, e.b1); close(`${tag} se`, f.se1, e.se, 1e-5);
    close(`${tag} ci`, f.ci, e.ci, 1e-3); // R spline-interpolates a coarse profile grid; JS solves it exactly
    close(`${tag} band`, f.band([-2, 0, 2]).map((d) => d.hi), e.band, 1e-5);
  } else if (c.kind === "t") {
    const f = S.welchT(c.a, c.b);
    close(`${tag} t`, f.t, e.t); close(`${tag} df`, f.df, e.df); close(`${tag} p`, f.p, e.p);
  } else if (c.kind === "aov") {
    const f = S.anova({ A: c.A, B: c.B, C: c.C });
    close(`${tag} F`, f.table.between.F, e.F); close(`${tag} p`, f.table.between.p, e.p);
    close(`${tag} diff`, f.tukey.map((d) => d.diff), e.diff);
    close(`${tag} lwr`, f.tukey.map((d) => d.lwr), e.lwr, 1e-5);
    close(`${tag} padj`, f.tukey.map((d) => d.p), e.padj, 1e-5);
  } else if (c.kind === "box") {
    const b = S.boxStats(c.x);
    close(`${tag} q`, [b.q1, b.q2, b.q3], e.q);
    close(`${tag} out`, b.outliers.sort((a, b) => a - b), e.out);
  } else if (c.kind === "dens") {
    close(`${tag} bw`, S.bwNrd0(c.x), e.bw);
    // R's density() bins onto an FFT grid, so allow a small difference.
    close(`${tag} y`, S.density(c.x, S.seq(-2, 8, 11)), e.y, 2e-3);
  }
});
// Bayes tab: beta.select over every prior/certainty slider setting.
const grid = [];
for (let p = 2; p <= 8; p++) for (let c = 1; c <= 10; c++) grid.push([p / 10, 0.65 + (c / 10) * 0.34]);
const bs = execFileSync("Rscript", ["--vanilla", "-e", `suppressMessages(library(LearnBayes))
for (s in strsplit("${grid.map((g) => g.join(":")).join(",")}", ",")[[1]]) {
  v <- as.numeric(strsplit(s, ":")[[1]]); p2 <- if (v[1] <= 0.89) v[1] + 0.05 else v[1] - 0.05
  cat(beta.select(list(p = v[2], x = p2), list(p = 0.5, x = v[1])), "\\n") }`], { encoding: "utf8" })
  .trim().split("\n").map((l) => l.trim().split(/\s+/).map(Number));
grid.forEach(([p, c], i) => {
  const js = S.betaSelect({ p: c, x: p <= 0.89 ? p + 0.05 : p - 0.05 }, { p: 0.5, x: p });
  // Both sides round to 2 decimals; allow one unit in the last place.
  js.forEach((v, k) => {
    checks++;
    if (Math.abs(v - bs[i][k]) > 0.0101) { fails++; console.log(`FAIL betaSelect(${p}, ${c})[${k}]: js ${v} vs R ${bs[i][k]}`); }
  });
});

console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
