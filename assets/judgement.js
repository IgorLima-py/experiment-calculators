/*
 * judgement.js - the sentence under every result.
 *
 * Each tool ends with one plain sentence on what its number means and what
 * would make it a lie. That sentence is the product, and it has already been
 * wrong once: the sample size page quoted a fixed "14%" for the cost of
 * peeking at every significance level, when that figure is only true at 5%.
 * The arithmetic had a test suite; the prose did not.
 *
 * So the sentences live here, as pure functions that take numbers and return
 * the HTML the page shows, and validation/check_judgement.js runs them in Node
 * against a table of cases. Nothing in this file touches the DOM.
 *
 * Where a sentence repeats a figure the page already shows (the peeking
 * checker's headline rate, the geo holdout's detectable lift), the page passes
 * that figure in, so the two can never disagree. Where the sentence works out
 * a figure of its own (the sample size page's cost of peeking), it computes it
 * here, where the test can reach it.
 *
 * Needs UI (the number formatters) and, for the sample size sentence,
 * Sequential.
 */
var Judgement = (function () {
  'use strict';

  var TIMES = { 2: 'twice', 3: 'three times', 4: 'four times', 5: 'five times' };
  var COUNT = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };

  /* Deep-link the peeking checker to the sample size page's own numbers, so
   * the two agree on screen rather than merely not contradicting each other. */
  function peekingLink(looks, alphaPercent) {
    var parts = [];
    if (looks !== 5) parts.push('looks=' + looks);
    if (alphaPercent !== 5) parts.push('alpha=' + alphaPercent);
    return 'peeking.html' + (parts.length ? '?' + parts.join('&') : '');
  }

  /*
   * Tool 1. The cost of peeking is computed at the page's own alpha rather
   * than quoted. A fixed "about 14%" is only true at 5%: the same five looks
   * cost 3.3% at alpha 1% and 26% at alpha 10%, and a hard-coded figure would
   * have the page contradicting the peeking checker one click away.
   *
   * Looks are capped by the run itself, so a two-day test is never described
   * as having been checked five times.
   */
  function sampleSize(days, alphaPercent) {
    var looks = Math.min(5, Math.max(2, days));
    var inflated = Sequential.alphaInflation(looks, alphaPercent / 100);

    return '<strong>What would make this number a lie.</strong>' +
      'It assumes you look at the result once, after day ' + UI.integer(days) +
      '. Check it ' + TIMES[looks] + ' along the way and stop the moment one of ' +
      'those looks is significant, and the ' + UI.decimal(alphaPercent, 1) +
      '% false-positive rate you think you have is really ' +
      UI.percent(inflated * 100, 1) + '. The test did not get more sensitive; ' +
      'you just gave yourself ' + COUNT[looks] + ' chances to catch it at a ' +
      'lucky moment. <a href="' + peekingLink(looks, alphaPercent) +
      '">See exactly what peeking cost you →</a>';
  }

  /* Tool 2. `relative` is the detectable lift in percent of the baseline. */
  function mde(days, relative) {
    var verdict;
    if (relative >= 100) {
      verdict = 'That is not a test, it is a formality. The variant would ' +
        'have to convert ' + UI.decimal(1 + relative / 100, 1) + '× the ' +
        'control rate before this setup could call the result reliable, and ' +
        'no real change does that.';
    } else if (relative >= 20) {
      verdict = 'That is a big effect to demand. Very few honest changes move ' +
        'a conversion rate by ' + UI.percent(relative, 0) + '. If yours is a ' +
        'copy tweak or a button colour, this test cannot answer your question.';
    } else {
      verdict = 'That is within reach of a substantial change, though still ' +
        'well above what most single tweaks deliver.';
    }

    return '<strong>Read this before you run it.</strong>' +
      'In ' + UI.integer(days) + ' days you can only detect a lift of ' +
      UI.percent(relative, 1) + ' or larger. ' + verdict +
      ' If the effect you realistically expect is smaller than this, do not ' +
      'run the test: you will get an inconclusive result and file it as a ' +
      'failure, when what you ran was a test too small to see the ' +
      'answer. Find more traffic, run longer, or test something bolder.';
  }

  /* Tool 3. `real` is the inflated error rate as a fraction, the same figure
   * the page shows as its headline. */
  function peeking(looks, alphaPercent, real) {
    if (looks === 1) {
      return '<strong>One look is not peeking.</strong>' +
        'A single test at the end is exactly what the ' +
        UI.percent(alphaPercent, 1) + ' level is designed for, so nothing is ' +
        'inflated. Come back if you check again before the planned end.';
    }
    var factor = real / (alphaPercent / 100);
    return '<strong>You looked ' + UI.integer(looks) + ' times.</strong>' +
      'Your real chance of calling a dead change a winner is ' +
      UI.percent(real * 100, 1) + ', not ' + UI.percent(alphaPercent, 1) +
      '. You are ' + UI.decimal(factor, 1) + '× more likely to have been ' +
      'fooled than you believed. The test did not get less reliable because ' +
      'the data changed; it got less reliable because you gave yourself ' +
      UI.integer(looks) + ' chances to catch it at a lucky moment. ' +
      'This assumes your looks were evenly spaced and that you would have ' +
      'stopped at the first significant result.';
  }

  /*
   * Tool 4. `mde` and `power` are fractions, `smallest` is a market count or
   * null when no holdout gets there; `liftPercent` and `powerPercent` are the
   * inputs as typed.
   */
  function geoHoldout(g) {
    var verdict;
    if (g.power >= g.powerPercent / 100) {
      verdict = 'That is enough to see the ' + UI.percent(g.liftPercent, 1) +
        ' lift you are expecting, at ' + UI.percent(g.power * 100, 0) + ' power.';
    } else if (g.smallest !== null) {
      verdict = 'That is not enough to see the ' + UI.percent(g.liftPercent, 1) +
        ' lift you are expecting: you would have ' + UI.percent(g.power * 100, 0) +
        ' power, not ' + UI.percent(g.powerPercent, 0) + '. Holding out ' +
        UI.integer(g.smallest) + ' markets instead would get you there.';
    } else {
      verdict = 'No holdout size reaches ' + UI.percent(g.powerPercent, 0) +
        ' power for a ' + UI.percent(g.liftPercent, 1) + ' lift with this many ' +
        'markets and this much variation between them. Either the effect has ' +
        'to be bigger, or the test cannot answer the question.';
    }

    return '<strong>What would make this number a lie.</strong>' +
      'Holding out ' + UI.integer(g.holdout) + ' of ' + UI.integer(g.geos) +
      ' markets, the smallest lift you could detect is ' +
      UI.percent(g.mde * 100, 1) + '. ' + verdict +
      ' All of it assumes your markets do not leak into each other and that ' +
      'nothing but your campaign changed between the groups. IP-based geo ' +
      'targeting is commonly cited as only 55–80% accurate, and every bit of ' +
      'leakage pushes the measured effect toward zero. A real win can still ' +
      'come back looking like nothing. Treat this as the design-stage estimate ' +
      'and run GeoLift on your own history before the budget moves.';
  }

  /*
   * Tool 5, the ratio-metric demonstration. `result` is what the simulation
   * returns (standard errors as fractions, the session count it drew), and
   * `users` is how many users it simulated.
   */
  function ratioMetric(spread, result, users) {
    if (spread < 0.05) {
      return '<strong>At zero, there is nothing to correct.</strong>' +
        'Every user has the same conversion propensity, so sessions really ' +
        'are independent draws and the two formulas agree with each other. ' +
        'This is the honest half of the lesson: the correction is not always ' +
        'needed, and knowing when it is not matters as much as knowing when ' +
        'it is. Both still sit a hair under the simulated truth, because the ' +
        'number of sessions is random too and only the delta method has any ' +
        'machinery for that: with identical users there is barely anything ' +
        'for it to do. Now drag the slider right: real users are not identical.';
    }
    var understatement = result.trueSe / result.naiveSe;
    return '<strong>The naive standard error is understating the noise by ' +
      UI.decimal(understatement, 1) + '×.</strong>' +
      'Every confidence interval you build from it is that much too narrow, ' +
      'and every p-value that much too small. Nothing about the data looks ' +
      'wrong: you simply counted ' + UI.integer(result.meanSessions) +
      ' independent observations when you had ' + UI.integer(users) + '. ' +
      'The delta method lands on ' + UI.decimal(result.deltaSe * 100, 3) +
      ' pp against a true ' + UI.decimal(result.trueSe * 100, 3) + ' pp. ' +
      'Drag the sessions slider: the more sessions each user brings, the ' +
      'less the naive count of them has to do with how much information you ' +
      'have.';
  }

  /* Percentage points, signed, for an interval the reader compares with 0. */
  function pp(x) {
    return UI.decimal(x * 100, 2) + ' pp';
  }

  function ppRange(ci) {
    return pp(ci.lo) + ' to ' + pp(ci.hi);
  }

  /* The assumptions every reading of a p-value rests on, whatever it says. */
  var ONE_LOOK = 'It holds only if you looked once, at the planned end, and ' +
    'this was the one metric you meant to judge the test on. Stopping at the ' +
    'first good-looking day, or picking the best of several metrics, makes the ' +
    'p-value smaller than it has any right to be.';

  /*
   * Tool 6. `r` is what Readout.analyse returns. The order of the branches is
   * the order a result has to be read in: a traffic split that did not come
   * out as planned voids everything after it, so it is checked first.
   *
   * The exaggeration warning turns on at power below 50%, where Gelman &
   * Carlin (2014) say the problems with the exaggeration ratio start.
   */
  function readout(r) {
    if (r.srm.flagged) {
      return '<strong>Do not read this result.</strong>' +
        'You planned ' + UI.percent(r.srm.plannedShareA * 100, 1) +
        ' of users for the control and got ' +
        UI.percent(r.srm.observedShareA * 100, 1) + '. A split that far off happens ' +
        'by chance with probability ' +
        (r.srm.p < 1e-12 ? 'under one in a trillion' : UI.pValue(r.srm.p)) + ', below the ' +
        '0.001 this page treats as a sample ratio mismatch. Something between ' +
        'assignment and logging lost or duplicated users in one arm, and ' +
        'whatever did it can move the conversion rate too, in either ' +
        'direction. Find the cause (bots, a redirect, a crash in one variant, ' +
        'a tracking change mid-test) before you trust any number from this test.';
    }

    var level = UI.percent((1 - r.alpha) * 100, 0);
    var interval = 'the ' + level + ' interval runs from ' + ppRange(r.ciDiff);

    if (r.significant !== r.intervalExcludesZero) {
      return '<strong>On the edge.</strong>' +
        'The p-value (' + UI.pValue(r.p) + ') and the interval (' +
        ppRange(r.ciDiff) + ') disagree about whether the difference could ' +
        'be zero. That only happens right at the threshold, where the two ' +
        'methods approximate slightly differently. Read it as inconclusive: a ' +
        'result this close to the line is not one to ship on.';
    }

    var tm = r.typeM;
    var planned = tm ? UI.percent(r.mde * 100, 1) : '';

    if (r.significant) {
      var moved = 'The variant ' + (r.diff > 0 ? 'beat' : 'lost to') +
        ' the control by ' + pp(Math.abs(r.diff)) + ' (p = ' + UI.pValue(r.p) +
        '), and ' + interval + '.';

      if (!tm) {
        return '<strong>What would make this number a lie.</strong>' + moved +
          ' Enter the lift you planned to detect to see whether the test was ' +
          'big enough to trust the size of that result: a small test that ' +
          'comes out significant overstates the effect, and by how much ' +
          'depends on the effect it was planned for, never on the one it ' +
          'observed. ' + ONE_LOOK;
      }

      if (tm.power < 0.5) {
        var sign = tm.typeS >= 0.01 ?
          ' There is even a ' + UI.percent(tm.typeS * 100, 0) + ' chance that ' +
          'a significant result points the wrong way.' : '';
        return '<strong>Significant, and probably exaggerated.</strong>' +
          moved + ' But with this much data, a real ' + planned + ' lift ' +
          'would reach significance only ' + UI.percent(tm.power * 100, 0) +
          ' of the time, and when it does, the estimate overstates it by ' +
          UI.decimal(tm.exaggeration, 1) + '× on average.' + sign +
          ' A test this small only comes out significant when luck adds to ' +
          'the effect. Treat the lift as the top of a range, and confirm it ' +
          'before you plan around it.';
      }

      return '<strong>What would make this number a lie.</strong>' + moved +
        ' The test had ' + UI.percent(tm.power * 100, 0) + ' power for the ' +
        planned + ' lift you planned, so a significant estimate of a lift ' +
        'that size overstates it by only ' + UI.decimal(tm.exaggeration, 1) +
        '× on average. What you learned is the whole interval. ' + ONE_LOOK;
    }

    var open = '<strong>Inconclusive, not a loss.</strong>' +
      'The ' + level + ' interval runs from ' + ppRange(r.ciDiff) + ': it ' +
      'includes no effect at all, and it includes a difference as large as ' +
      pp(r.ciDiff.hi > -r.ciDiff.lo ? r.ciDiff.hi : r.ciDiff.lo) + '. ';

    if (!tm) {
      return open + 'A test that cannot tell those apart has not shown the ' +
        'change does nothing. Enter the lift you planned to detect to see ' +
        'whether this test ever had a real chance of finding it.';
    }

    if (tm.power < 0.5) {
      return open + 'With this much data, a real ' + planned + ' lift would ' +
        'have reached significance only ' + UI.percent(tm.power * 100, 0) +
        ' of the time: the test was always more likely to miss it than to ' +
        'find it. Filing this as "the change does not work" would be a ' +
        'conclusion the test was never able to reach.';
    }

    return open + 'The test had ' + UI.percent(tm.power * 100, 0) + ' power ' +
      'for the ' + planned + ' lift you planned, so a real lift that size ' +
      'would usually have shown up. So a lift that size is unlikely, though ' +
      'the interval above still allows it, and the interval is what the data ' +
      'can and cannot rule out.';
  }

  /* What every geo reading rests on, whatever it says. The 55–80% is the same
   * figure, from the same source, as the geo holdout page's. */
  var SPILLOVER = 'All of it assumes the held-out markets did not see the ' +
    'campaign and that nothing else changed between the groups during the ' +
    'test. People cross borders, and IP-based geo targeting is commonly cited ' +
    'as only 55–80% accurate. Every bit of that leakage pushes the estimate ' +
    'toward zero, so a real effect reads smaller than it is.';

  function iroasRange(ci) {
    return UI.decimal(ci.lo, 2) + ' to ' + UI.decimal(ci.hi, 2);
  }

  /*
   * Tool 7, the geo readout. `r` is what GeoReadout.analyse returns.
   *
   * An iROAS of 1 is the break-even line on revenue: each unit spent came back
   * as one unit of revenue. The verdict is on where the interval sits against
   * zero and against 1, never on the point estimate alone.
   *
   * Two things are added when they apply. A test that came out noisier than it
   * was designed to be, from the correlation the plan assumed (only when the
   * ratio still reads above 1.0 at the one decimal the sentence prints). And a
   * small design: under 10 markets, or under 5 held out, the same lines the
   * geo holdout page draws, from the same sources.
   */
  function geoReadout(r) {
    var level = UI.percent((1 - r.alpha) * 100, 0);
    var incr = 'The ' + level + ' interval for the incremental revenue runs ' +
      'from ' + UI.integer(r.ciIncremental.lo) + ' to ' +
      UI.integer(r.ciIncremental.hi);
    var roas = r.ciIroas ? ', an iROAS of ' + iroasRange(r.ciIroas) : '';
    var body;

    if (!r.significant) {
      var far = r.ciIroas ?
        'an iROAS as high as ' + UI.decimal(r.ciIroas.hi, 2) :
        'as much as ' + UI.integer(r.ciIncremental.hi) + ' of incremental revenue';
      body = '<strong>Inconclusive, not a loss.</strong>' + incr + roas +
        '. It includes no effect at all, and it includes ' + far + '. A test ' +
        'that cannot tell those apart has not shown the campaign does nothing.';
    } else if (r.incremental < 0) {
      body = '<strong>Revenue fell where the campaign ran.</strong>' + incr +
        roas + '. Before you believe it, check that the groups are labelled ' +
        'the right way round, and look for anything else that hit the treated ' +
        'markets during the test: a campaign that loses money outright is ' +
        'rarer than a swapped label or a regional shock.';
    } else if (!r.ciIroas) {
      body = '<strong>What would make this number a lie.</strong>' +
        'The treated markets brought in ' + UI.integer(r.incremental) +
        ' more than the model expected from their pre-period (p = ' +
        UI.pValue(r.fit.p) + '). ' + incr + '. Enter what the test spent to ' +
        'turn that into a return on the spend.';
    } else if (r.ciIroas.lo > 1) {
      body = '<strong>It paid back, on revenue.</strong>' +
        'Each unit spent brought back ' + UI.decimal(r.iroas, 2) + ' in ' +
        'revenue (p = ' + UI.pValue(r.fit.p) + '), and the ' + level + ' ' +
        'interval, ' + iroasRange(r.ciIroas) + ', sits above the break-even of ' +
        '1. That is revenue, not profit: once margin is taken out, the bar is ' +
        'higher than 1.';
    } else if (r.ciIroas.hi >= 1) {
      body = '<strong>It moved revenue. Whether it paid back is open.</strong>' +
        'The best estimate is ' + UI.decimal(r.iroas, 2) + ' in revenue for ' +
        'each unit spent (p = ' + UI.pValue(r.fit.p) + '), but the ' + level +
        ' interval runs from ' + iroasRange(r.ciIroas) + ', either side of the ' +
        'break-even of 1. The campaign did something; this test cannot say it ' +
        'covered its cost.';
    } else {
      body = '<strong>It moved revenue, at a loss.</strong>' +
        'Each unit spent brought back ' + UI.decimal(r.iroas, 2) + ' in ' +
        'revenue (p = ' + UI.pValue(r.fit.p) + '), and the whole ' + level +
        ' interval, ' + iroasRange(r.ciIroas) + ', sits below the break-even ' +
        'of 1. The effect is real and smaller than what it cost.';
    }

    var extra = '';
    if (r.noiseFactor !== null && UI.decimal(r.noiseFactor, 1) !== '1.0' &&
        r.noiseFactor > 1) {
      extra += ' The pre-period predicted the test period less well than you ' +
        'planned (a correlation of ' + UI.decimal(r.rho, 3) + ' against ' +
        UI.decimal(r.plannedRho, 3) + '), so this test was ' +
        UI.decimal(r.noiseFactor, 1) + '× noisier than its design.';
    }
    if (r.n < 10 || r.nControl < 5) {
      extra += ' With ' + UI.integer(r.n) + ' markets and ' +
        UI.integer(r.nControl) + ' held out, one local shock in either group ' +
        'can make or erase a result this size.';
    }
    return body + extra + ' ' + SPILLOVER;
  }

  return {
    sampleSize: sampleSize,
    mde: mde,
    peeking: peeking,
    geoHoldout: geoHoldout,
    ratioMetric: ratioMetric,
    readout: readout,
    geoReadout: geoReadout
  };
})();
