var SharedLogic = SharedLogic || {
  // 常量定义
  CONSTANTS: {
    MM_PER_INCH: 25.4,
    DEFAULT_PPI: 96,
    COFFEE_URL: "https://ko-fi.com/qiyuanyang",
    REVIEW_URL: "https://chromewebstore.google.com/detail/online-ruler/hdflbmnojjkedghfaioipcbjiainnpnn/reviews",
    UNITS: [['cm', 'unitCm', 'CM/MM'], ['in', 'unitIn', 'Inch']],
    MATERIALS: [['WOOD', 'matWood', 'Wood'], ['PLASTIC', 'matPlastic', 'Plastic'], ['METAL', 'matMetal', 'Metal']],
    get MATERIAL_DETAILS() {
      return {
        WOOD: { 
          baseColor: "#dcb35c", 
          filterH: "woodFilterH", 
          filterV: "woodFilterV" 
        },
        PLASTIC: { 
          baseColor: SharedLogic.COLORS[0].val, 
          filterH: "plasticFilter", 
          filterV: "plasticFilter" 
        },
        METAL: { 
          baseColor: "#bdc3c7", 
          filterH: "metalFilterH", 
          filterV: "metalFilterV" 
        }
      };
    }
  },

  // 公用颜色定义
  COLORS: [
    { val: 'rgba(255, 255, 255, 0.85)', key: 'colorWhite', hex: '#FFFFFF' },
    { val: 'rgba(64, 235, 253, 0.85)', key: 'colorCyan', hex: '#40EBFD' },
    { val: 'rgba(255, 0, 234, 0.85)', key: 'colorMagenta', hex: '#FF00EA' },
    { val: 'rgba(255, 136, 229, 0.85)', key: 'colorPink', hex: '#FF88E5' },
    { val: 'rgba(255, 142, 55, 0.85)', key: 'colorOrange', hex: '#FF8E37' },
    { val: 'rgba(229, 249, 93, 0.85)', key: 'colorLime', hex: '#E5F95D' },
    { val: 'rgba(0, 255, 83, 0.85)', key: 'colorGreen', hex: '#00FF53' }
  ],

  UI: {
    /**
     * 设置颜色选择器
     * @param {HTMLElement} container 容器
     * @param {Object} state 状态对象
     * @param {Function} onColorChange 回调
     */
    setupColorSelector: function(container, state, onColorChange) {
      container.className = 'color-selector';
      container.innerHTML = ''; // 清空

      const colorTrigger = document.createElement('div');
      colorTrigger.className = 'color-trigger';
      container.appendChild(colorTrigger);

      const colorOptionsList = document.createElement('div');
      colorOptionsList.className = 'color-options-list';
      container.appendChild(colorOptionsList);

      const updateUI = () => {
        const item = SharedLogic.COLORS[state.currentColorIdx || 0];
        colorTrigger.innerText = chrome.i18n.getMessage(item.key) || item.key;
        colorTrigger.style.backgroundColor = item.hex;
      };

      SharedLogic.COLORS.forEach((item, idx) => {
        const opt = document.createElement('div');
        opt.className = 'color-opt';
        opt.innerText = chrome.i18n.getMessage(item.key) || item.key;
        opt.style.backgroundColor = item.hex;
        opt.onmousedown = (e) => {
          e.stopPropagation();
          state.currentColorIdx = idx;
          updateUI();
          onColorChange(item);
          colorOptionsList.style.display = 'none';
        };
        colorOptionsList.appendChild(opt);
      });

      colorTrigger.onmousedown = (e) => {
        e.stopPropagation();
        const isVisible = colorOptionsList.style.display === 'flex';
        colorOptionsList.style.display = isVisible ? 'none' : 'flex';
      };

      window.addEventListener('mousedown', () => { 
        colorOptionsList.style.display = 'none'; 
      });

      updateUI();
      return { updateUI };
    }
  },

  getPhysicalPpi: function(result) {
    if (result.physicalPpi) return result.physicalPpi;
    if (result.ppi) return result.ppi;
    return SharedLogic.CONSTANTS.DEFAULT_PPI;
  },

  // 状态同步引擎，增加 material 支持
  bindState: function(state, callback) {
    chrome.storage.local.get(['ppi', 'unit', 'zeroOffset', 'physicalPpi', 'angle', 'material'], (result) => {
      state.ppi = SharedLogic.getPhysicalPpi(result);
      state.unit = result.unit || 'cm';
      state.zeroOffset = result.zeroOffset || 0;
      state.angle = result.angle || 0;
      state.material = result.material || 'WOOD';
      callback(true);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        let changed = false;
        if (changes.ppi || changes.physicalPpi) {
          state.ppi = (changes.physicalPpi || changes.ppi).newValue;
          changed = true;
        }
        if (changes.unit) { state.unit = changes.unit.newValue; changed = true; }
        if (changes.zeroOffset !== undefined) { state.zeroOffset = changes.zeroOffset.newValue; changed = true; }
        if (changes.angle !== undefined) { state.angle = changes.angle.newValue; changed = true; }
        if (changed) callback(false);
      }
    });
  },

  initI18n: function() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const message = chrome.i18n.getMessage(el.getAttribute('data-i18n'), el.getAttribute('data-i18n-arg') ? [el.getAttribute('data-i18n-arg')] : []);
      if (message) el.innerText = message;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const message = chrome.i18n.getMessage(el.getAttribute('data-i18n-title'));
      if (message) el.title = message;
    });
  },

  listenToZoom: function(callback) {
    const check = () => {
      let currentDPR = window.devicePixelRatio;
      const mql = window.matchMedia(`(resolution: ${currentDPR}dppx)`);
      mql.addEventListener('change', () => { callback(); check(); }, { once: true });
    };
    check();
  },

  // 里程碑管理系统
  Milestones: {
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
      // 冷却时间：3天 (3 * 24 * 60 * 60 * 1000)
      if (now - (stats.lastPromptTime || 0) < 259200000) return;

      const milestones = [
        { id: 'm1_calibrated', check: s => s.calibrationSaves >= 1 },
        { id: 'm2_power_user', check: s => s.totalOpens >= 10 },
        { id: 'm3_overlay_pro', check: s => s.overlayInjections >= 5 },
        { id: 'm4_night_owl', check: () => { const h = new Date().getHours(); return h >= 23 || h < 4; } },
        { id: 'm5_unit_switcher', check: s => s.unitSwitches >= 3 },
        { id: 'm6_long_term', check: s => (now - s.installDate) > 2592000000 }, // 30天
        { id: 'm7_detail_oriented', check: s => s.zeroOffsetChanges >= 5 }
      ];

      for (const m of milestones) {
        if (!stats.achieved.includes(m.id) && m.check(stats)) {
          this.showPrompt(m.id);
          break; // 一次只触发一个
        }
      }
    },

    showPrompt: function(milestoneId) {
      const coffeeUrl = SharedLogic.CONSTANTS.COFFEE_URL; 
      const reviewUrl = SharedLogic.CONSTANTS.REVIEW_URL;

      const message = chrome.i18n.getMessage('milestone_' + milestoneId) || "Support this project!";
      
      // 发送消息给当前的 UI 层（Popup 或 Overlay）来显示
      // 如果是 Popup，直接查找容器显示
      const popupFooter = document.querySelector('.footer');
      if (popupFooter) {
        this.renderPopupPrompt(message, reviewUrl, coffeeUrl, milestoneId);
      } else {
        // 通知 Overlay
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
  }
};
