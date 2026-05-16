(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  Object.assign(OnlineRulerInstance.prototype, {
    initElements: function() {
      window.OnlineRulerInstance.count = (window.OnlineRulerInstance.count || 0) + 1;
      const offset = (window.OnlineRulerInstance.count - 1) * 30;

      this.container = document.createElement('div');
      this.container.className = 'online-ruler-overlay';
      this.container.style.left = (100 + offset) + 'px';
      this.container.style.top = (100 + offset) + 'px';

      this.rulerBody = document.createElement('div');
      this.rulerBody.className = 'ruler-body';

      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.setAttribute('class', 'ruler-svg');

      this.resizeHandle = document.createElement('div');
      this.resizeHandle.className = 'resize-handle';
      this.resizeIcon = document.createElement('div');
      this.resizeIcon.className = 'resize-icon';
      this.resizeHandle.appendChild(this.resizeIcon);

      this.rotateHandle = document.createElement('div');
      this.rotateHandle.className = 'rotate-handle';

      this.angleBadge = document.createElement('div');
      this.angleBadge.className = 'angle-badge';

      this.toolbar = document.createElement('div');
      this.toolbar.className = 'ruler-toolbar';

      this.rulerBody.append(this.svg, this.resizeHandle, this.rotateHandle, this.angleBadge);
      this.container.append(this.rulerBody, this.toolbar);

      this.angleHandles = {};
      [
        ['armA', 'A'],
        ['vertex', 'V'],
        ['armB', 'B']
      ].forEach(([key, label]) => {
        const handle = document.createElement('div');
        handle.className = `angle-handle angle-handle-${key}`;
        handle.dataset.point = key;
        handle.textContent = label;
        this.angleHandles[key] = handle;
        this.rulerBody.appendChild(handle);
      });

      this.angleLabel = document.createElement('div');
      this.angleLabel.className = 'angle-measure-label';
      this.rulerBody.appendChild(this.angleLabel);

      this.modeToggleBtn = document.createElement('button');
      this.modeToggleBtn.className = 'mode-toggle-btn';
      this.modeToggleBtn.title = 'Switch Ruler/Protractor';
      this.modeToggleBtn.innerText = '📏';

      this.unitSelect = document.createElement('select');
      SharedLogic.CONSTANTS.UNITS.forEach(([v, k, d]) => {
        const o = document.createElement('option');
        o.value = v;
        o.innerText = chrome.i18n.getMessage(k) || d;
        this.unitSelect.appendChild(o);
      });

      this.materialSelect = document.createElement('select');
      SharedLogic.CONSTANTS.MATERIALS.forEach(([v, k, d]) => {
        const o = document.createElement('option');
        o.value = v;
        o.innerText = chrome.i18n.getMessage(k) || d;
        this.materialSelect.appendChild(o);
      });

      this.currentColorIdx = 0;
      this.colorSelector = document.createElement('div');
      this.colorHelper = SharedLogic.UI.setupColorSelector(this.colorSelector, this, () => {
        this.updateRulerContent();
      });

      this.protractorColorState = { currentColorIdx: 0 };
      this.protractorColorSelector = document.createElement('div');
      this.protractorColorHelper = SharedLogic.UI.setupColorSelector(this.protractorColorSelector, this.protractorColorState, () => {
        chrome.storage.local.set({ protractorColorIdx: this.protractorColorState.currentColorIdx });
        this.updateRulerContent();
      });

      this.angleColorState = { currentColorIdx: 6 };
      this.angleColorSelector = document.createElement('div');
      this.angleColorHelper = SharedLogic.UI.setupColorSelector(this.angleColorSelector, this.angleColorState, () => {
        chrome.storage.local.set({ angleColorIdx: this.angleColorState.currentColorIdx });
        this.updateRulerContent();
      });

      this.opacityInput = document.createElement('input');
      this.opacityInput.className = 'opacity-slider';
      this.opacityInput.type = 'range';
      this.opacityInput.min = '30';
      this.opacityInput.max = '100';
      this.opacityInput.value = '100';
      this.opacityInput.oninput = (e) => {
        if (this.state.mode === 'angle') {
          this.angleSectorOpacity = parseFloat(e.target.value) / 100;
          this.updateAngleToolContent();
        } else {
          this.container.style.opacity = e.target.value / 100;
        }
      };

      this.closeBtn = document.createElement('button');
      this.closeBtn.className = 'close-btn';
      this.closeBtn.innerText = '✕';
      this.closeBtn.onclick = () => {
        this.container.remove();
        window.OnlineRulerInstance.count--;
      };

      window.addEventListener('mousedown', () => {
        if (this.colorOptionsList) this.colorOptionsList.style.display = 'none';
      });
    },

    createAnglePresets: function() {
      const group = document.createElement('div');
      group.className = 'angle-presets';
      [0, 45, 90].forEach(deg => {
        const btn = document.createElement('button');
        btn.innerText = deg + '°';
        btn.onclick = (e) => {
          e.stopPropagation();
          this.state.angle = deg;
          this.updateRulerTransform();
        };
        group.appendChild(btn);
      });
      return group;
    }
  });
})();
