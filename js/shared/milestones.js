var SharedLogic = SharedLogic || {};

SharedLogic.Milestones = {
  getStats: function(callback) {
    chrome.storage.local.get(['user_stats'], (result) => {
      const stats = result.user_stats || {
        installDate: Date.now(),
        totalOpens: 0,
        overlayInjections: 0,
        calibrationSaves: 0,
        unitSwitches: 0,
        zeroOffsetChanges: 0,
        lastPromptTime: 0,
        achieved: [],
        suppressAll: false
      };
      callback(stats);
    });
  },

  updateStats: function(key, increment = 1) {
    this.getStats((stats) => {
      if (stats.suppressAll) return;
      if (stats[key] !== undefined) {
        if (typeof stats[key] === 'number') stats[key] += increment;
        else stats[key] = increment;
      } else {
        stats[key] = increment;
      }
      chrome.storage.local.set({ user_stats: stats }, () => {
        this.checkTriggers(stats);
      });
    });
  },

  checkTriggers: function(stats) {
    if (stats.suppressAll) return;
    const now = Date.now();
    if (now - (stats.lastPromptTime || 0) < 259200000) return;

    const milestones = [
      { id: 'm1_calibrated', check: s => s.calibrationSaves >= 1 },
      { id: 'm2_power_user', check: s => s.totalOpens >= 10 },
      { id: 'm3_overlay_pro', check: s => s.overlayInjections >= 5 },
      { id: 'm4_night_owl', check: () => { const h = new Date().getHours(); return h >= 23 || h < 4; } },
      { id: 'm5_unit_switcher', check: s => s.unitSwitches >= 3 },
      { id: 'm6_long_term', check: s => (now - s.installDate) > 2592000000 },
      { id: 'm7_detail_oriented', check: s => s.zeroOffsetChanges >= 5 }
    ];

    for (const m of milestones) {
      if (!stats.achieved.includes(m.id) && m.check(stats)) {
        this.showPrompt(m.id);
        break;
      }
    }
  },

  showPrompt: function(milestoneId) {
    const coffeeUrl = SharedLogic.CONSTANTS.COFFEE_URL;
    const reviewUrl = SharedLogic.CONSTANTS.REVIEW_URL;
    const message = chrome.i18n.getMessage('milestone_' + milestoneId) || "Support this project!";
    const popupFooter = document.querySelector('.footer');

    if (popupFooter) {
      this.renderPopupPrompt(message, reviewUrl, coffeeUrl, milestoneId);
    } else {
      window.dispatchEvent(new CustomEvent('showMilestone', { detail: { message, reviewUrl, coffeeUrl, milestoneId } }));
    }
  },

  renderPopupPrompt: function(msg, reviewUrl, coffeeUrl, id) {
    if (document.getElementById('milestone-prompt')) return;

    const div = document.createElement('div');
    div.id = 'milestone-prompt';
    div.innerHTML = `
      <div class="prompt-msg">${msg}</div>
      <div class="prompt-actions">
        <a href="${reviewUrl}" target="_blank" class="prompt-btn">⭐ ${chrome.i18n.getMessage('rate')}</a>
        <a href="${coffeeUrl}" target="_blank" class="prompt-btn">☕ ${chrome.i18n.getMessage('coffee')}</a>
        <button id="closePrompt">${chrome.i18n.getMessage('later')}</button>
      </div>
    `;
    document.body.appendChild(div);

    const markAchieved = (suppress = false) => {
      this.getStats(stats => {
        stats.achieved.push(id);
        stats.lastPromptTime = Date.now();
        if (suppress) stats.suppressAll = true;
        chrome.storage.local.set({ user_stats: stats });
        div.remove();
      });
    };

    div.querySelectorAll('.prompt-btn').forEach(btn => btn.onclick = () => markAchieved(true));
    document.getElementById('closePrompt').onclick = () => markAchieved(false);
  }
};
