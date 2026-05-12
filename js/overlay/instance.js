(function() {
  window.OnlineRulerOverlay = window.OnlineRulerOverlay || {};
  if (window.OnlineRulerOverlay.OnlineRulerInstance) return;

  class OnlineRulerInstance {
    constructor() {
      const initialMode = window.__onlineRulerNextMode || 'ruler';
      delete window.__onlineRulerNextMode;

      this.state = { ppi: 96, unit: 'cm', zeroOffset: 0, angle: 0, material: 'WOOD', mode: initialMode };
      this.isVertical = false;
      this.hW = 600;
      this.vH = 600;
      this.pivotX = 100;
      this.pivotY = 100;
      this.dragMode = '';

      this.initElements();
      this.initEvents();
      this.loadInitialState();

      MeasurementEngine.loadMaterials();

      document.body.appendChild(this.container);
      this.updateLayout();
    }

    loadInitialState() {
      SharedLogic.bindState(this.state, (init) => {
        if (init) {
          this.unitSelect.value = this.state.unit;
          this.materialSelect.value = this.state.material;
          chrome.storage.local.get(['protractorColorIdx'], (result) => {
            this.protractorColorState.currentColorIdx = result.protractorColorIdx || 0;
            this.protractorColorHelper.updateUI();
            this.updateRulerContent();
          });
          this.updateLayout();
        }
        this.updateRulerContent();
        this.updateRulerTransform();
      });
    }

    updateRulerContent() {
      if (this.state.mode === 'protractor') {
        MeasurementEngine.drawProtractor(this.svg, {
          physicalPpi: this.state.ppi,
          color: SharedLogic.COLORS[this.protractorColorState.currentColorIdx || 0].val
        });
        const svgW = this.svg.getAttribute('width');
        const svgH = this.svg.getAttribute('height');
        this.rulerBody.style.width = svgW + 'px';
        this.rulerBody.style.height = svgH + 'px';
        this.container.style.width = svgW + 'px';
      } else {
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
    }

    updateRulerTransform() {
      this.container.style.transform = `rotate(${this.state.angle}deg)`;
      this.angleBadge.innerText = `${parseFloat(this.state.angle).toFixed(1)}°`;
    }
  }

  window.OnlineRulerOverlay.OnlineRulerInstance = OnlineRulerInstance;
  window.OnlineRulerInstance = OnlineRulerInstance;
})();
