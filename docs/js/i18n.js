// UI strings for both apps. The two repos (stats101_app, lng1100_app) share
// every file except js/config.js, which picks the language and the tabs.

const ZHANG = `<a href="https://doi.org/10.1073/pnas.2302491120" target="_blank" rel="noopener">Zhang et al. (2023)</a>`;

export const STRINGS = {
  en: {
    htmlLang: "en", colon: ": ",
    docTitle: "Stats 101",
    title: "Stats 101",
    welcome: `<b>Welcome!</b> This dashboard is adapted from an undergraduate course I teach at Université Laval:
      <i>Méthodes expérimentales et analyse de données</i>. Each tab helps you visualize a concept in stats.
      Along the top, <code>LM</code> = linear regression and <code>GLM</code> = logistic regression.`,
    tabs: { viz: "Viz", se: "SE", t: "<i>t</i> test", anova: "ANOVA", lma: "LMa", lmb: "LMb", glm: "GLM", bayes: "Bayes", bib: "Bib" },

    options: "Options", data: "Data",
    meanA: "Mean of group A", sdA: "SD of group A", meanB: "Mean of group B", sdB: "SD of group B", meanC: "Mean of group C",
    layers: "Choose your layers:",
    metric: { mean: "Means", sd: "Standard deviations", se: "Standard errors", ci: "Confidence intervals", box: "Box plots", points: "Actual data (jitter)" },
    noLayer: "Choose at least one layer.",
    group: "Group", value: "Value",
    vizText: `The figure illustrates the difference between displaying the standard deviation, the standard error, or the 95%
      confidence intervals given some data. When you hide the actual data points, the <i>y</i>-axis is adjusted to the range of the
      statistics you display. This can mislead people to overestimate differences (or effects) in your study, as shown in ${ZHANG}.`,

    initialN: "Initial sample size", resample: "New samples",
    seTitle: "The effect of the sample size on the SE", seX: "Sample size",
    groupsAB: (a, b) => `Groups ${a} and ${b}`,
    seText: `The plot above illustrates how the standard error (SE) of a given distribution is affected by the sample size of said
      distribution (you can also examine how means and standard deviations can change SEs). Once you choose a sample size, the
      <i>x</i>-axis of the plot shows you how increasing that sample size up to ten times its initial value changes the SE. The SE of
      a distribution indicates our level of certainty that the sample mean represents the population mean. The take-home message
      here is that your SE will go down as you increase your sample size, but after a certain point, collecting more data will no
      longer have a meaningful effect on your SE. Compare, for example, 10 to 50, and then 50 to 80 or 100.`,

    meanPopA: "Mean of population A", meanPopB: "Mean of population B", sdPopA: "SD of population A", sdPopB: "SD of population B",
    nPerGroup: "Sample size (per group)",
    samplesAB: (a, b) => `Samples ${a} and ${b}`,
    pShare: (pct) => `${pct}% of p > 0.05`,
    tX: "Value",
    tText: `The plot above illustrates the distributions of two sets of samples (which are normally distributed). You can choose the
      means and standard deviations for the populations from which the samples are taken, as well as the size of each sample.
      Suppose you want to <b>sample</b> from the two populations and perform a <i>t</i>-test on these samples. Now imagine that you
      did this 1,000 times: sample from two populations and perform a <i>t</i>-test. The title of the plot tells you the percentage
      of times you'd get a <i>p</i>-value above 0.05. The thin lines represent 50 of the 1,000 simulated samples. The thick lines
      represent all samples combined, and the dashed lines mark their means.`,

    sdCommon: "SD", nAnova: "Sample size (per group)",
    anovaText: `Notice how the means, the standard deviations and the sample size affect the distribution of the data and,
      consequently, the <i>F</i> value in the ANOVA. Take a look at the multiple comparisons below (Tukey HSD).`,
    aovRows: ["Group", "Residuals"],

    coefficients: "Coefficients", regression: "Regression", results: "Results",
    intercept: "Intercept (β<sub>0</sub>)", slope: "Slope (β<sub>1</sub>)",
    variance: "Variance", stdev: "SD",
    lmaText: `Adjust the intercept and the slope and find the best line, i.e., the line that <b>minimizes variance</b>. The initial
      fit assumes the null hypothesis, i.e., that both intercept and slope are zero.`,

    certaintyLine: "Certainty around our line", certaintyCurve: "Certainty around our curve",
    sampleSize: "Sample size", play: "Play", pause: "Pause",
    slopeValues: "Values for the slope", extras: "Extras",
    population: "Population", sample: "Sample", estSe: "SE of the estimate", ci95: "95% CI",
    separation: "Perfect separation in this sample: the estimate is unstable and has no finite CI.",
    response01: "Response (0 or 1)",
    lmbText: `The figure demonstrates how changing the sample size in our data affects the fit of a simple linear regression. More
      specifically, we're trying to estimate the effect of variable <code>x</code> on variable <code>y</code>. The dashed line
      represents the true effect (population-level).`,
    glmText: `The figure demonstrates how changing the sample size in our data affects the fit of a simple logistic regression.
      More specifically, we're trying to estimate the effect of variable <code>x</code> on variable <code>y</code>. The dashed line
      represents the true effect (population-level). Population value and sample estimate are given in log-odds.`,

    positives: "Number of positives", negatives: "Number of negatives",
    flatPrior: "Make prior flat?", flatYes: "Yes (ignore settings below)", flatNo: "No (set below)",
    priorMean: "Prior for mean(θ)", priorCertainty: "Prior certainty?", multiplier: "Sample size multiplier",
    bayesTitle: (p, d, q) => `${p}, ${d} and ${q}`, prior: "Prior", dataWord: "data", posterior: "posterior",
    bayesX: "Distribution",
    bayesText: `The plot above illustrates how the posterior distribution can be affected by the prior and the data. In this case,
      assume we're interested in a binary outcome, e.g., the application ('positive') or non-application ('negative') of a given
      process/phenomenon, whose underlying probability is denoted by θ. You can use the sample size multiplier to see how increasing
      the sample size affects the posterior holding everything else constant. The prior certainty (from 0 to 1) is remapped onto a
      range of values that optimizes the illustrative purpose of the figure given the underlying beta distribution.`,

    citeHead: "How to cite this dashboard", copy: "Copy",
  },

  fr: {
    htmlLang: "fr", colon: " : ",
    docTitle: "LNG1100",
    title: "LNG1100",
    welcome: `<b>Bienvenue!</b> Ce <i>dashboard</i> est utilisé dans le cours de premier cycle <b>Méthodes expérimentales et analyse
      de données</b> (<a href="https://lng1100.quarto.pub" target="_blank" rel="noopener">LNG-1100</a>) à l'Université Laval.
      Chaque onglet vous aide à visualiser un concept statistique (en particulier en ce qui concerne les changements de taille
      d'échantillon). Dans les onglets du haut, <code>LM</code> = régression linéaire; <code>GLM</code> = régression logistique.`,
    tabs: { viz: "Viz", se: "Erreur std", t: "Test <i>t</i>", anova: "ANOVA", lma: "LMa", lmb: "LMb", glm: "GLM", bib: "Bib" },

    options: "Options", data: "Données",
    meanA: "Moyenne du groupe A", sdA: "Écart-type du groupe A", meanB: "Moyenne du groupe B", sdB: "Écart-type du groupe B",
    meanC: "Moyenne du groupe C",
    layers: "Choisissez le graphique :",
    metric: { mean: "Moyennes", sd: "Écarts-types", se: "Erreur standard", ci: "Intervalles de confiance", box: "Boîtes à moustache", points: "Points" },
    noLayer: "Choisissez au moins un élément.",
    group: "Groupe", value: "Valeur",
    vizText: `La figure illustre la différence entre l'affichage de l'écart type, de l'erreur standard ou des intervalles de
      confiance à 95 % selon certaines données hypothétiques. Lorsque vous masquez les points de données réels, l'axe <i>y</i> est
      ajusté à l'intervalle des statistiques que vous affichez. Cela peut induire en erreur et amener les gens à surestimer les
      différences (ou les effets) de votre étude, comme le montre ${ZHANG}.`,

    initialN: "Taille d'échantillon initiale", resample: "Nouveaux échantillons",
    seTitle: "L'effet de l'échantillon sur l'erreur standard", seX: "Taille de la simulation",
    groupsAB: (a, b) => `Groupes ${a} et ${b}`,
    seText: `Le graphique ci-dessus illustre comment l'erreur standard (SE) d'une distribution donnée est affectée par la taille de
      l'échantillon de cette distribution (vous pouvez également examiner comment les moyennes et les écarts-types peuvent changer
      les SE). Une fois que vous choisissez une taille d'échantillon, l'axe des <i>x</i> du graphique vous montre comment augmenter
      cette taille d'échantillon jusqu'à dix fois sa valeur initiale modifie la SE. L'erreur standard d'une distribution indique
      notre niveau de certitude que la moyenne de l'échantillon représente la moyenne de la population. Le message à retenir ici
      est que votre SE diminuera à mesure que vous augmenterez la taille de votre échantillon, mais après un certain point, la
      collecte de données supplémentaires n'aura plus d'effet significatif sur votre SE. Comparez, par exemple, 10 à 50, puis 50 à
      80 ou 100.`,

    meanPopA: "Moyenne de la population A", meanPopB: "Moyenne de la population B",
    sdPopA: "Écart-type de la population A", sdPopB: "Écart-type de la population B",
    nPerGroup: "Taille d'échantillon (par groupe)",
    samplesAB: (a, b) => `Échantillons ${a} et ${b}`,
    pShare: (pct) => `${pct} % de p > 0,05`,
    tX: "Valeur",
    tText: `Le graphique ci-dessus illustre les distributions de deux ensembles d'échantillons (qui suivent une distribution
      normale). Vous pouvez choisir les moyennes et les écarts-types pour les populations d'où proviennent ces échantillons, ainsi
      que la taille de chaque échantillon. Supposons que vous souhaitiez <b>échantillonner</b> ces deux populations et effectuer un
      test <i>t</i> sur ces échantillons. Imaginez maintenant que vous fassiez cela 1 000 fois : échantillonner deux populations et
      effectuer un test <i>t</i>. Le titre du graphique vous indique le pourcentage de fois où vous obtiendriez une valeur <i>p</i>
      supérieure à 0,05. Les lignes minces représentent 50 des 1 000 simulations. Les lignes épaisses représentent l'ensemble des
      échantillons, et les lignes pointillées indiquent leurs moyennes.`,

    sdCommon: "Écart-type commun", nAnova: "Taille de l'échantillon par groupe",
    anovaText: `Notez comment les moyennes, les écarts-types et la taille des échantillons affectent la distribution des données
      et, par conséquent, la valeur <i>F</i> de l'ANOVA. Examinez aussi les comparaisons multiples à partir d'un test Tukey
      ci-dessous.`,
    aovRows: ["Groupe", "Residuals"],

    coefficients: "Coefficients", regression: "Régression", results: "Résultats",
    intercept: "Ordonnée à l'origine (β<sub>0</sub>)", slope: "Pente (β<sub>1</sub>)",
    variance: "Variance", stdev: "ET",
    lmaText: `Ajustez l'ordonnée à l'origine et la pente et trouvez la meilleure droite, c'est-à-dire celle qui <b>minimise la
      variance</b>. L'ajustement initial suppose l'hypothèse nulle, c'est-à-dire que l'ordonnée à l'origine et la pente sont toutes
      deux nulles.`,

    certaintyLine: "Certitude de la droite", certaintyCurve: "Certitude de la courbe",
    sampleSize: "Taille d'échantillon", play: "Lecture", pause: "Pause",
    slopeValues: "Valeurs de la pente", extras: "Extras",
    population: "Population", sample: "Échantillon", estSe: "ES de l'estimation", ci95: "IC 95 %",
    separation: "Séparation parfaite dans cet échantillon : l'estimation est instable et n'a pas d'IC fini.",
    response01: "Réponse (0 ou 1)",
    lmbText: `La figure montre comment la modification de la taille de l'échantillon dans nos données affecte l'ajustement d'une
      régression linéaire simple. Plus précisément, nous essayons d'estimer l'effet de la variable <code>x</code> sur la variable
      <code>y</code>. La ligne en pointillés représente l'effet réel (au niveau de la population).`,
    glmText: `La figure montre comment la modification de la taille de l'échantillon dans nos données affecte l'ajustement d'une
      régression logistique simple. Plus précisément, nous essayons d'estimer l'effet de la variable <code>x</code> sur la variable
      <code>y</code>. La ligne en pointillés représente l'effet réel (au niveau de la population). La valeur de la population et
      l'estimation de l'échantillon sont données en termes de <i>log-odds</i>.`,

    citeHead: "Comment citer ce dashboard", copy: "Copier",
  },
};
