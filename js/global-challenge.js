/**
 * Fills in the "Today's global challenge" card from the share Worker.
 *
 * The card ships hidden and is only revealed once real data arrives, so every
 * failure path -- offline, CloudKit down, no challenge running, too few people
 * finished -- leaves the page exactly as it was served. Nothing here should
 * ever produce a spinner or a zero.
 *
 * The endpoint lives on the apex because that is where the Worker runs; the
 * page itself is served from www, so this is a cross-origin request.
 */
(function () {
  "use strict";

  var ENDPOINT = "https://sporadic.app/_stats/global-challenge";

  var section = document.getElementById("global-challenge");
  var nameEl = document.getElementById("global-name");
  var totalEl = document.getElementById("global-total");
  var countdownEl = document.getElementById("global-countdown");
  var timeEl = document.getElementById("global-time");
  if (!section || !nameEl || !totalEl || !countdownEl || !timeEl) return;

  /** Mirrors Challenge.timeRemaining in the app so both read identically. */
  function timeRemaining(endTime) {
    var secondsLeft = Math.floor((endTime - Date.now()) / 1000);
    if (secondsLeft <= 0) return "0s";

    var hours = Math.floor(secondsLeft / 3600);
    var minutes = Math.floor((secondsLeft % 3600) / 60);
    var seconds = secondsLeft % 60;

    if (hours > 0) return hours + "hr " + minutes + "m";
    if (minutes > 0) return minutes + "m " + seconds + "s";
    return seconds + "s";
  }

  function render(challenge) {
    // Totals are cached for a few minutes, so a challenge can expire between
    // the Worker generating this and the page reading it.
    if (challenge.endTime <= Date.now()) return;

    var unit = challenge.unit ? " " + challenge.unit : "";
    nameEl.textContent = challenge.amount
      ? challenge.amount + unit + " of " + challenge.activityName
      : challenge.activityName;
    totalEl.textContent =
      challenge.totalAmount.toLocaleString() +
      (challenge.unit ? " " + challenge.unit : "") +
      " completed worldwide today";

    section.hidden = false;

    var tick = function () {
      if (challenge.endTime <= Date.now()) {
        countdownEl.hidden = true;
        window.clearInterval(timer);
        return;
      }
      timeEl.textContent = timeRemaining(challenge.endTime);
    };
    tick();
    countdownEl.hidden = false;
    var timer = window.setInterval(tick, 1000);
  }

  fetch(ENDPOINT, { mode: "cors" })
    .then(function (response) {
      if (!response.ok) throw new Error("stats " + response.status);
      return response.json();
    })
    .then(function (data) {
      if (data && data.challenge) render(data.challenge);
    })
    .catch(function () {
      /* Leave the card hidden -- the page reads fine without it. */
    });
})();
