(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  OnlineRulerInstance.prototype.updateLayout = function() {
    const curL = this.container.style.left;
    const curT = this.container.style.top;

    [this.container, this.rulerBody, this.resizeHandle, this.resizeIcon, this.toolbar, this.opacityInput].forEach(el => el.style.cssText = '');
    Object.assign(this.container.style, { left: curL, top: curT });
    this.updateRulerTransform();

    this.container.classList.remove('or-horizontal', 'or-vertical', 'or-protractor', 'or-angle');

    if (this.state.mode === 'angle') {
      this.container.classList.add('or-angle');
      this.resizeHandle.style.display = 'none';
      this.rotateHandle.style.display = 'none';
      this.angleBadge.style.display = 'none';
      Object.assign(this.container.style, { width: this.angleToolWidth + 'px', height: this.angleToolHeight + 'px' });
      Object.assign(this.rulerBody.style, { width: this.angleToolWidth + 'px', height: this.angleToolHeight + 'px' });
    } else if (this.state.mode === 'protractor') {
      this.container.classList.add('or-protractor');
      this.resizeHandle.style.display = 'none';
      this.rotateHandle.style.display = '';
      this.rotateHandle.style.left = '50%';
      this.rotateHandle.style.top = '-30px';
      this.rotateHandle.style.transform = 'translateX(-50%)';
    } else {
      this.container.classList.add(this.isVertical ? 'or-vertical' : 'or-horizontal');
      this.resizeHandle.style.display = 'flex';
      this.rotateHandle.style.display = '';
    }

    this.toolbar.innerHTML = '';
    this.rulerBody.querySelectorAll('.protractor-angle-presets').forEach(el => el.remove());
    const presets = this.createAnglePresets();

    Object.values(this.angleHandles).forEach(handle => {
      handle.style.display = this.state.mode === 'angle' ? 'flex' : 'none';
    });
    this.angleLabel.style.display = this.state.mode === 'angle' ? 'block' : 'none';

    this.colorSelector.style.display = (this.state.material === 'PLASTIC' && this.state.mode === 'ruler') ? 'block' : 'none';
    this.protractorColorSelector.style.display = this.state.mode === 'protractor' ? 'block' : 'none';
    this.angleColorSelector.style.display = this.state.mode === 'angle' ? 'block' : 'none';
    this.materialSelect.style.display = this.state.mode === 'ruler' ? 'block' : 'none';
    this.unitSelect.style.display = this.state.mode === 'ruler' ? 'block' : 'none';
    this.modeToggleBtn.innerText = this.state.mode === 'ruler' ? '📐' : '📏';

    if (this.state.mode === 'angle') {
      const L = document.createElement('div');
      L.style.cssText = 'display:flex;gap:6px;align-items:center;';
      this.opacityInput.min = '0';
      this.opacityInput.max = '60';
      this.opacityInput.value = Math.round(this.angleSectorOpacity * 100);
      L.append(this.angleColorSelector, this.opacityInput, this.closeBtn);

      this.toolbar.append(L);
    } else if (this.state.mode === 'protractor' || !this.isVertical) {
      this.opacityInput.min = '30';
      this.opacityInput.max = '100';
      this.opacityInput.value = Math.round((parseFloat(this.container.style.opacity) || 1) * 100);
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
      this.opacityInput.min = '30';
      this.opacityInput.max = '100';
      this.opacityInput.value = Math.round((parseFloat(this.container.style.opacity) || 1) * 100);
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
