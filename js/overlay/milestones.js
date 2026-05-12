(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  OnlineRulerInstance.prototype.handleMilestone = function(e) {
    if (document.getElementById('milestone-bubble')) return;
    const { message, reviewUrl, coffeeUrl, milestoneId } = e.detail;

    const bubble = document.createElement('div');
    bubble.id = 'milestone-bubble';
    bubble.className = 'milestone-bubble';

    if (!this.isVertical) {
      bubble.style.bottom = '105%';
      bubble.style.left = '10px';
      bubble.style.width = '200px';
    } else {
      bubble.style.left = '105%';
      bubble.style.top = '10px';
      bubble.style.width = '160px';
    }

    bubble.innerHTML = `
      <div style="margin-bottom:6px;">${message}</div>
      <div style="display:flex; gap:6px;">
        <a href="${reviewUrl}" target="_blank" class="milestone-act" style="color:#2e7d32; font-weight:bold; text-decoration:none;">⭐ ${chrome.i18n.getMessage('rate')}</a>
        <a href="${coffeeUrl}" target="_blank" class="milestone-act" style="color:#ef6c00; font-weight:bold; text-decoration:none;">☕ ${chrome.i18n.getMessage('coffee')}</a>
        <span id="closeBubble" style="margin-left:auto; cursor:pointer; color:#999;">✕</span>
      </div>
    `;
    this.container.appendChild(bubble);

    const markAchieved = (suppress = false) => {
      SharedLogic.Milestones.getStats(stats => {
        stats.achieved.push(milestoneId);
        stats.lastPromptTime = Date.now();
        if (suppress) stats.suppressAll = true;
        chrome.storage.local.set({ user_stats: stats });
        bubble.remove();
      });
    };

    bubble.querySelectorAll('.milestone-act').forEach(a => a.onclick = () => markAchieved(true));
    bubble.querySelector('#closeBubble').onclick = () => markAchieved(false);
  };
})();
