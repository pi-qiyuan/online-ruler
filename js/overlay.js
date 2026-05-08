(function() {
  // 避免重复定义类
  if (window.OnlineRulerInstance) {
    new window.OnlineRulerInstance();
    return;
  }

  class OnlineRulerInstance {
    constructor() {
      this.state = { ppi: 96, unit: 'cm', zeroOffset: 0, angle: 0, material: 'WOOD' };
      this.isVertical = false;
      this.hW = 600;
      this.vH = 600;
      this.pivotX = 100;
      this.pivotY = 100;
      this.mode = '';
      
      this.initElements();
      this.initEvents();
      this.loadInitialState();
      
      // 加载材质库
      MeasurementEngine.loadMaterials();
      
      document.body.appendChild(this.container);
      this.updateLayout();
    }

    initElements() {
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

      this.unitSelect = document.createElement('select');
      SharedLogic.CONSTANTS.UNITS.forEach(([v, k, d]) => {
        const o = document.createElement('option'); o.value = v; o.innerText = chrome.i18n.getMessage(k) || d; this.unitSelect.appendChild(o);
      });

      this.materialSelect = document.createElement('select');
      SharedLogic.CONSTANTS.MATERIALS.forEach(([v, k, d]) => {
        const o = document.createElement('option'); o.value = v; o.innerText = chrome.i18n.getMessage(k) || d; this.materialSelect.appendChild(o);
      });

      // --- 自定义颜色选择器 ---
      this.currentColorIdx = 0;
      this.colorSelector = document.createElement('div');
      
      this.colorHelper = SharedLogic.UI.setupColorSelector(this.colorSelector, this, () => {
        this.updateRulerContent();
      });
      // --- End 自定义选择器 ---

      this.opacityInput = document.createElement('input');
      this.opacityInput.className = 'opacity-slider';
      this.opacityInput.type = 'range'; this.opacityInput.min = '30'; this.opacityInput.max = '100'; this.opacityInput.value = '100';
      this.opacityInput.oninput = (e) => this.container.style.opacity = e.target.value / 100;

      this.closeBtn = document.createElement('button');
      this.closeBtn.className = 'close-btn';
      this.closeBtn.innerText = '✕';
      this.closeBtn.onclick = () => {
        this.container.remove();
        window.OnlineRulerInstance.count--;
      };

      // 点击外部关闭列表
      window.addEventListener('mousedown', () => { if(this.colorOptionsList) this.colorOptionsList.style.display = 'none'; });
    }

    loadInitialState() {
      SharedLogic.bindState(this.state, (init) => { 
        if(init) {
          this.unitSelect.value = this.state.unit; 
          this.materialSelect.value = this.state.material;
          this.updateLayout();
        }
        this.updateRulerContent(); 
        this.updateRulerTransform();
      });
    }

    updateRulerContent() {
      MeasurementEngine.drawRuler(this.svg, { 
        width: this.isVertical ? 60 : this.hW, 
        height: this.isVertical ? this.vH : 60, 
        isVertical: this.isVertical, 
        unit: this.state.unit, 
        physicalPpi: this.state.ppi, 
        zeroOffset: this.state.zeroOffset,
        material: this.state.material,
        color: this.state.material === 'PLASTIC' ? SharedLogic.COLORS[this.currentColorIdx].val : null
      });
    }

    updateRulerTransform() {
      this.container.style.transform = `rotate(${this.state.angle}deg)`;
      this.angleBadge.innerText = `${parseFloat(this.state.angle).toFixed(1)}°`;
    }

    createAnglePresets() {
      const group = document.createElement('div');
      group.className = 'angle-presets';
      [0, 45, 90].forEach(deg => {
        const btn = document.createElement('button'); btn.innerText = deg + '°';
        btn.onclick = (e) => { 
          e.stopPropagation(); 
          this.state.angle = deg; 
          this.updateRulerTransform();
        };
        group.appendChild(btn);
      });
      return group;
    }

    updateLayout() {
      const curL = this.container.style.left;
      const curT = this.container.style.top;
      
      // 清除行内样式（除了位置和旋转）
      [this.container, this.rulerBody, this.resizeHandle, this.resizeIcon, this.toolbar, this.opacityInput].forEach(el => el.style.cssText = '');
      Object.assign(this.container.style, { left: curL, top: curT });
      this.updateRulerTransform();
      
      this.container.classList.remove('or-horizontal', 'or-vertical');
      this.container.classList.add(this.isVertical ? 'or-vertical' : 'or-horizontal');

      this.toolbar.innerHTML = '';
      const presets = this.createAnglePresets();

      this.colorSelector.style.display = this.state.material === 'PLASTIC' ? 'block' : 'none';

      if (!this.isVertical) {
        Object.assign(this.container.style, { width: this.hW + 'px' });
        
        const L = document.createElement('div'); 
        L.style.cssText = 'display:flex;gap:8px;align-items:center;overflow:visible;'; 
        L.append(this.unitSelect, this.materialSelect, this.colorSelector, presets);
        
        const R = document.createElement('div'); 
        R.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0;'; 
        R.append(this.opacityInput, this.closeBtn);
        
        this.toolbar.append(L, R); 
      } else {
        Object.assign(this.container.style, { height: this.vH + 'px' });
        
        const T = document.createElement('div'); T.style.textAlign = 'right'; T.append(this.closeBtn);
        const O = document.createElement('div'); O.style.cssText = "margin-top: auto; padding-bottom: 10px; display: flex; justify-content: center;";
        O.append(this.opacityInput); 
        
        this.toolbar.append(T, this.unitSelect, this.materialSelect, this.colorSelector, presets, O);
      }
      this.updateRulerContent();
    }

    initEvents() {
      this.unitSelect.onchange = (e) => chrome.storage.local.set({ unit: e.target.value });
      this.materialSelect.onchange = (e) => {
        this.state.material = e.target.value;
        this.updateLayout();
        chrome.storage.local.set({ material: e.target.value });
      };

      let sX, sY, iL, iT, iW, iH;
      
      this.container.onmousedown = (e) => {
        // 置顶逻辑
        window.OnlineRulerInstance.maxZIndex = (window.OnlineRulerInstance.maxZIndex || 1000000) + 1;
        this.container.style.zIndex = window.OnlineRulerInstance.maxZIndex;

        if (e.target.closest('select, input, button, .color-selector')) return;
        sX = e.clientX; sY = e.clientY;
        if (e.target === this.rotateHandle) { 
          this.mode = 'rotate'; 
          this.pivotX = parseInt(this.container.style.left) || 100;
          this.pivotY = parseInt(this.container.style.top) || 100;
          this.rotateHandle.classList.add('active'); this.angleBadge.style.display = 'block';
        } else if (e.target.closest('.resize-handle')) { 
          this.mode = 'resize'; iW = this.container.offsetWidth; iH = this.container.offsetHeight; 
        } else { 
          this.mode = 'drag'; iL = this.container.offsetLeft; iT = this.container.offsetTop; 
        }
        e.preventDefault();

        const onMouseMove = (me) => {
          if (!this.mode) return;
          if (this.mode === 'drag') {
            this.container.style.left = (iL + me.clientX - sX) + 'px';
            this.container.style.top = (iT + me.clientY - sY) + 'px';
          } else if (this.mode === 'resize') {
            if (!this.isVertical) { 
              this.hW = Math.max(320, iW + me.clientX - sX); 
              this.container.style.width = this.hW + 'px'; 
              this.updateRulerContent(); 
            } else { 
              this.vH = Math.max(320, iH + me.clientY - sY); 
              this.container.style.height = this.vH + 'px'; 
              this.updateRulerContent(); 
            }
          } else if (this.mode === 'rotate') {
            const angle = Math.atan2(me.clientY - this.pivotY, me.clientX - this.pivotX) * 180 / Math.PI;
            let finalAngle = this.isVertical ? angle - 90 : angle;
            [0, 45, 90, 135, 180, -45, -90, -135, -180].forEach(snap => {
              if (Math.abs(finalAngle - snap) < 2) finalAngle = snap;
            });
            this.state.angle = finalAngle;
            this.updateRulerTransform();
          }
        };

        const onMouseUp = () => {
          if (this.mode === 'rotate') {
            this.rotateHandle.classList.remove('active');
            setTimeout(() => { if(!this.mode) this.angleBadge.style.display = 'none'; }, 1000);
          }
          this.mode = ''; 
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('showMilestone', this.handleMilestone.bind(this));
    }

    handleMilestone(e) {
      if (document.getElementById('milestone-bubble')) return;
      const { message, reviewUrl, coffeeUrl, milestoneId } = e.detail;

      const bubble = document.createElement('div');
      bubble.id = 'milestone-bubble';
      bubble.className = 'milestone-bubble';
      
      if (!this.isVertical) {
        bubble.style.bottom = '105%'; bubble.style.left = '10px'; bubble.style.width = '200px';
      } else {
        bubble.style.left = '105%'; bubble.style.top = '10px'; bubble.style.width = '160px';
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
    }
  }

  window.OnlineRulerInstance = OnlineRulerInstance;
  new OnlineRulerInstance();
})();
