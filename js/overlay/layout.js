(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  OnlineRulerInstance.prototype.updateLayout = function() {
    const curL = this.container.style.left;
    const curT = this.container.style.top;

    [this.container, this.rulerBody, this.resizeHandle, this.resizeIcon, this.toolbar, this.opacityInput].forEach(el => el.style.cssText = '');
    Object.assign(this.container.style, { left: curL, top: curT });
    this.updateRulerTransform();

    this.container.classList.remove('or-horizontal', 'or-vertical', 'or-protractor');

    if (this.state.mode === 'protractor') {
      this.container.classList.add('or-protractor');
      this.resizeHandle.style.display = 'none';
      this.rotateHandle.style.left = '50%';
      this.rotateHandle.style.top = '-30px';
      this.rotateHandle.style.transform = 'translateX(-50%)';
    } else {
      this.container.classList.add(this.isVertical ? 'or-vertical' : 'or-horizontal');
      this.resizeHandle.style.display = 'flex';
    }

    this.toolbar.innerHTML = '';
    this.rulerBody.querySelectorAll('.protractor-angle-presets').forEach(el => el.remove());
    const presets = this.createAnglePresets();

    this.colorSelector.style.display = (this.state.material === 'PLASTIC' && this.state.mode === 'ruler') ? 'block' : 'none';
    this.protractorColorSelector.style.display = this.state.mode === 'protractor' ? 'block' : 'none';
    this.materialSelect.style.display = this.state.mode === 'ruler' ? 'block' : 'none';
    this.unitSelect.style.display = this.state.mode === 'ruler' ? 'block' : 'none';
    this.modeToggleBtn.innerText = this.state.mode === 'protractor' ? '📏' : '📐';

    if (this.state.mode === 'protractor' || !this.isVertical) {
      if (this.state.mode !== 'protractor') {
        Object.assign(this.container.style, { width: this.hW + 'px' });
      }

      const L = document.createElement('div');
      L.style.cssText = 'display:flex;gap:8px;align-items:center;overflow:visible;';
      if (this.state.mode === 'protractor') {
        L.append(this.protractorColorSelector);
        presets.classList.add('protractor-angle-presets');
        this.rulerBody.appendChild(presets);
      } else {
        L.append(this.modeToggleBtn, this.unitSelect, this.materialSelect, this.colorSelector, presets);
      }

      const R = document.createElement('div');
      R.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0;';
      R.append(this.opacityInput, this.closeBtn);

      this.toolbar.append(L, R);
    } else {
      Object.assign(this.container.style, { height: this.vH + 'px' });

      const T = document.createElement('div');
      T.style.textAlign = 'right';
      T.append(this.closeBtn);

      const O = document.createElement('div');
      O.style.cssText = "margin-top: auto; padding-bottom: 10px; display: flex; justify-content: center;";
      O.append(this.opacityInput);

      this.toolbar.append(T, this.modeToggleBtn, this.unitSelect, this.materialSelect, this.colorSelector, presets, O);
    }
    this.updateRulerContent();
  };
})();
