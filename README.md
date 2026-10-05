# Stats 101 — static web app

Interactive visualizations of basic statistical concepts: what error bars
show, standard error vs. sample size, *t*-test error rates, ANOVA + Tukey,
fitting a line by hand, linear and logistic regression vs. sample size, and
Bayesian updating with a beta prior.

Pure client-side port of the Quarto/Shiny dashboard in `~/Repos/stats101_dash`.
No server: all
simulation and model fitting run in the browser.

Live at <https://gdgarcia.ca/stats101> (a redirect to this repo's GitHub Pages site,
<https://guilhermegarcia.github.io/stats101_app/>). Pushing to `main` deploys.

Its French sibling, `~/Repos/lng1100_app` (the LNG-1100 course version, no
Bayes tab), shares every file except `docs/js/config.js` and the `<head>` of
`docs/index.html`.

## Layout

```
docs/                 the site (GitHub Pages serves main:/docs; no build step)
├── index.html        static <head>: lang, title, description (per repo)
├── css/app.css
├── js/
│   ├── config.js     language, tab list, citation (per repo)
│   ├── i18n.js       EN + FR strings
│   ├── stats.js      pure statistics (lm, glm, t.test, aov, TukeyHSD,
│   │                 density, LearnBayes::beta.select), no DOM
│   └── app.js        one builder per tab
└── vendor/           d3 7.9.0, @observablehq/plot 0.6.17, jStat 1.9.6
tests/check.mjs       compares stats.js against R
```

## Development

```sh
python3 -m http.server 8000 -d docs   # http://localhost:8000
node tests/check.mjs                  # needs Rscript + jsonlite + LearnBayes
```

`tests/check.mjs` generates data in JS, has R fit the same models, and
compares: `lm`/`confint`, `glm` (IRLS, SEs, profile-likelihood CIs, the
`geom_smooth` ribbon), Welch `t.test`, `aov` + `TukeyHSD`, boxplot stats,
`density` (bw.nrd0), and `beta.select` across every Bayes slider setting.
Random draws come from a seeded JS generator, so the simulated samples differ
from R's `set.seed(123)` streams, but the statistics computed on them match.

## Keeping the two apps in sync

Edit here, then copy everything except the per-repo files to the sibling:

```sh
rsync -a --exclude .git --exclude README.md --exclude docs/index.html \
  --exclude docs/js/config.js ./ ../lng1100_app/
```

## Differences from the Shiny dashboard

- *t* test tab: the "sample size" slider now sets the size of each sample
  (1,000 simulations). In the dashboard it set the number of simulations
  while every sample stayed at n = 100, so moving it could not change the
  Type II error rate.
- LMb / GLM: (x, y) pairs are drawn together, so increasing n adds points
  to the same sample instead of redrawing every y.
- English strings that were left in French in the dashboard (GLM slider and
  axis, *t*-test subtitle) are translated; the BibTeX entry's missing brace
  is fixed.
