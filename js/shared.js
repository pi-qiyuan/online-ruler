var SharedLogic = SharedLogic || {
  // 常量定义
  CONSTANTS: {
    MM_PER_INCH: 25.4,
    DEFAULT_PPI: 96,
    WOOD_BASE_COLOR: "#dcb35c",
    TEXTURES: {
      HORIZONTAL: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6 0.005' numOctaves='5'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      VERTICAL: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005 0.6' numOctaves='5'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
    }
  },

  getPhysicalPpi: function(result) {
    if (result.physicalPpi) return result.physicalPpi;
    if (result.ppi) return result.ppi;
    return SharedLogic.CONSTANTS.DEFAULT_PPI;
  },

  drawRuler: function(svg, options) {
    const { width, height, isVertical, unit, physicalPpi, zeroOffset } = options;
    if (width === 0 || height === 0) return;

    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const ppi = physicalPpi;
    const pixelsPerMm = ppi / SharedLogic.CONSTANTS.MM_PER_INCH;
    const offsetPx = (zeroOffset || 0) * pixelsPerMm;
    const rulerLength = isVertical ? height : width;
    
    const fragment = document.createDocumentFragment();
    const ns = "http://www.w3.org/2000/svg";

    if (unit === 'cm') {
      const startMm = -Math.ceil(Math.max(0, -(zeroOffset || 0)));
      for (let i = startMm; ; i++) {
        const pos = i * pixelsPerMm + offsetPx;
        if (pos > rulerLength + 5) break;
        if (pos < -5) continue; 

        const lineH = (i % 10 === 0) ? 25 : (i % 5 === 0 ? 18 : 10);
        const line = document.createElementNS(ns, "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        fragment.appendChild(line);

        if (i % 10 === 0) {
          const text = document.createElementNS(ns, "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.setAttribute("font-family", "sans-serif");
          text.textContent = i / 10;
          fragment.appendChild(text);
        }
      }
    } else {
      const pixelsPerInch = ppi;
      const startStep = -Math.ceil(Math.max(0, -((zeroOffset || 0) / SharedLogic.CONSTANTS.MM_PER_INCH) * 16));
      for (let i = startStep; ; i++) {
        const pos = i * (pixelsPerInch / 16) + offsetPx;
        if (pos > rulerLength + 5) break;
        if (pos < -5) continue;

        const lineH = (i % 16 === 0) ? 25 : (i % 8 === 0 ? 18 : (i % 4 === 0 ? 14 : (i % 2 === 0 ? 11 : 8)));
        const line = document.createElementNS(ns, "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        fragment.appendChild(line);

        if (i % 16 === 0) {
          const text = document.createElementNS(ns, "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.setAttribute("font-family", "sans-serif");
          text.textContent = i / 16;
          fragment.appendChild(text);
        }
      }
    }
    svg.appendChild(fragment);
  },

  // 状态同步引擎，增加 angle 支持
  bindState: function(state, callback) {
    chrome.storage.local.get(['ppi', 'unit', 'zeroOffset', 'physicalPpi', 'angle'], (result) => {
      state.ppi = SharedLogic.getPhysicalPpi(result);
      state.unit = result.unit || 'cm';
      state.zeroOffset = result.zeroOffset || 0;
      state.angle = result.angle || 0;
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
  }
};
