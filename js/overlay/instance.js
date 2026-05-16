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
      this.angleToolMinWidth = 380;
      this.angleToolMinHeight = 280;
      this.angleToolWidth = 380;
      this.angleToolHeight = 280;
      this.angleSectorOpacity = 0.22;
      this.anglePoints = {
        vertex: { x: 150, y: 170 },
        armA: { x: 70, y: 80 },
        armB: { x: 310, y: 105 }
      };
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
          chrome.storage.local.get(['protractorColorIdx', 'angleColorIdx'], (result) => {
            this.protractorColorState.currentColorIdx = result.protractorColorIdx || 0;
            this.angleColorState.currentColorIdx = result.angleColorIdx ?? 6;
            this.protractorColorHelper.updateUI();
            this.angleColorHelper.updateUI();
            this.updateRulerContent();
          });
          this.updateLayout();
        }
        this.updateRulerContent();
        this.updateRulerTransform();
      });
    }

    updateRulerContent() {
      if (this.state.mode === 'angle') {
        this.updateAngleToolContent();
      } else if (this.state.mode === 'protractor') {
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

    getAngleDegrees() {
      const { vertex, armA, armB } = this.anglePoints;
      const lenA = Math.hypot(armA.x - vertex.x, armA.y - vertex.y);
      const lenB = Math.hypot(armB.x - vertex.x, armB.y - vertex.y);
      if (lenA < 1 || lenB < 1) return 0;

      const start = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
      const end = Math.atan2(armB.y - vertex.y, armB.x - vertex.x);
      return this.normalizeAngleRadians(end - start) * 180 / Math.PI;
    }

    normalizeAngleRadians(angle) {
      const fullCircle = Math.PI * 2;
      while (angle < 0) angle += fullCircle;
      while (angle >= fullCircle) angle -= fullCircle;
      return angle;
    }

    snapAngleToolArm(pointKey) {
      if (pointKey === 'vertex') return;

      const point = this.anglePoints[pointKey];
      const { vertex } = this.anglePoints;
      const dx = point.x - vertex.x;
      const dy = point.y - vertex.y;
      const length = Math.hypot(dx, dy);
      if (length < 1) return;

      const snapStep = 45;
      const snapThreshold = 2;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const nearest = Math.round(angle / snapStep) * snapStep;
      const diff = Math.abs(angle - nearest);

      if (diff <= snapThreshold) {
        const snappedRad = nearest * Math.PI / 180;
        point.x = vertex.x + length * Math.cos(snappedRad);
        point.y = vertex.y + length * Math.sin(snappedRad);
      }
    }

    getAngleColor() {
      return SharedLogic.COLORS[this.angleColorState.currentColorIdx || 0];
    }

    getAngleColorWithOpacity(opacity) {
      const hex = this.getAngleColor().hex.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    getAngleColorTextColor() {
      const hex = this.getAngleColor().hex.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114) > 170 ? '#111' : '#fff';
    }

    getAngleSectorPath() {
      const { vertex, armA, armB } = this.anglePoints;
      const lenA = Math.hypot(armA.x - vertex.x, armA.y - vertex.y);
      const lenB = Math.hypot(armB.x - vertex.x, armB.y - vertex.y);
      const radius = Math.max(18, lenA, lenB);
      if (lenA < 1 || lenB < 1) return '';

      const start = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
      const delta = this.normalizeAngleRadians(Math.atan2(armB.y - vertex.y, armB.x - vertex.x) - start);
      const end = start + delta;

      const sx = vertex.x + radius * Math.cos(start);
      const sy = vertex.y + radius * Math.sin(start);
      const ex = vertex.x + radius * Math.cos(end);
      const ey = vertex.y + radius * Math.sin(end);
      const largeArc = delta > Math.PI ? 1 : 0;

      return `M ${vertex.x} ${vertex.y} L ${sx} ${sy} A ${radius} ${radius} 0 ${largeArc} 1 ${ex} ${ey} Z`;
    }

    normalizeAngleToolBounds() {
      const padding = 48;
      const points = Object.values(this.anglePoints);
      const { vertex, armA, armB } = this.anglePoints;
      const lenA = Math.hypot(armA.x - vertex.x, armA.y - vertex.y);
      const lenB = Math.hypot(armB.x - vertex.x, armB.y - vertex.y);
      const radius = Math.max(18, lenA, lenB);
      const boundsPoints = [...points];

      if (lenA >= 1) {
        boundsPoints.push({
          x: vertex.x + radius * (armA.x - vertex.x) / lenA,
          y: vertex.y + radius * (armA.y - vertex.y) / lenA
        });
      }
      if (lenB >= 1) {
        boundsPoints.push({
          x: vertex.x + radius * (armB.x - vertex.x) / lenB,
          y: vertex.y + radius * (armB.y - vertex.y) / lenB
        });
      }

      const maxX = Math.max(...boundsPoints.map(point => point.x));
      const maxY = Math.max(...boundsPoints.map(point => point.y));
      const minPointX = Math.min(...points.map(point => point.x));
      const minPointY = Math.min(...points.map(point => point.y));
      const edgePadding = 24;
      const shiftX = minPointX < edgePadding ? Math.ceil(edgePadding - minPointX) : 0;
      const shiftY = minPointY < edgePadding ? Math.ceil(edgePadding - minPointY) : 0;

      if (shiftX || shiftY) {
        points.forEach(point => {
          point.x += shiftX;
          point.y += shiftY;
        });
        this.container.style.left = ((parseFloat(this.container.style.left) || 0) - shiftX) + 'px';
        this.container.style.top = ((parseFloat(this.container.style.top) || 0) - shiftY) + 'px';
      }

      const shiftedMaxX = maxX + shiftX;
      const shiftedMaxY = maxY + shiftY;
      const activeDragWidth = this.dragMode === 'angle-point' ? this.angleToolWidth : 0;
      const activeDragHeight = this.dragMode === 'angle-point' ? this.angleToolHeight : 0;
      this.angleToolWidth = Math.max(this.angleToolMinWidth, activeDragWidth, shiftedMaxX + padding);
      this.angleToolHeight = Math.max(this.angleToolMinHeight, activeDragHeight, shiftedMaxY + padding);
      this.container.style.width = this.angleToolWidth + 'px';
      this.container.style.height = this.angleToolHeight + 'px';
      this.rulerBody.style.width = this.angleToolWidth + 'px';
      this.rulerBody.style.height = this.angleToolHeight + 'px';
    }

    updateAngleToolContent() {
      const ns = "http://www.w3.org/2000/svg";
      const { vertex, armA, armB } = this.anglePoints;
      this.normalizeAngleToolBounds();
      const color = this.getAngleColor();

      this.svg.setAttribute('width', this.angleToolWidth);
      this.svg.setAttribute('height', this.angleToolHeight);
      this.svg.setAttribute('viewBox', `0 0 ${this.angleToolWidth} ${this.angleToolHeight}`);
      while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

      const surface = document.createElementNS(ns, 'rect');
      surface.setAttribute('class', 'angle-tool-surface');
      surface.setAttribute('width', '100%');
      surface.setAttribute('height', '100%');
      surface.setAttribute('fill', 'rgba(255,255,255,0.01)');
      this.svg.appendChild(surface);

      const sector = document.createElementNS(ns, 'path');
      sector.setAttribute('class', 'angle-sector');
      sector.setAttribute('d', this.getAngleSectorPath());
      sector.setAttribute('fill', this.getAngleColorWithOpacity(this.angleSectorOpacity));
      sector.setAttribute('stroke', this.getAngleColorWithOpacity(0.55));
      this.svg.appendChild(sector);

      [['armA', armA], ['armB', armB]].forEach(([, point]) => {
        const arm = document.createElementNS(ns, 'line');
        arm.setAttribute('class', 'angle-arm');
        arm.setAttribute('x1', vertex.x);
        arm.setAttribute('y1', vertex.y);
        arm.setAttribute('x2', point.x);
        arm.setAttribute('y2', point.y);
        arm.setAttribute('stroke', color.hex);
        this.svg.appendChild(arm);
      });

      const vertexRing = document.createElementNS(ns, 'circle');
      vertexRing.setAttribute('class', 'angle-vertex-ring');
      vertexRing.setAttribute('cx', vertex.x);
      vertexRing.setAttribute('cy', vertex.y);
      vertexRing.setAttribute('r', '10');
      vertexRing.setAttribute('stroke', color.hex);
      this.svg.appendChild(vertexRing);

      const centerDot = document.createElementNS(ns, 'circle');
      centerDot.setAttribute('class', 'angle-center-dot');
      centerDot.setAttribute('cx', vertex.x);
      centerDot.setAttribute('cy', vertex.y);
      centerDot.setAttribute('r', '2.4');
      centerDot.setAttribute('fill', color.hex);
      this.svg.appendChild(centerDot);

      this.updateAngleHandles();
      this.updateAngleLabel();
    }

    updateAngleHandles() {
      if (!this.angleHandles) return;

      Object.keys(this.angleHandles).forEach(key => {
        const point = this.anglePoints[key];
        const handle = this.angleHandles[key];
        handle.style.left = point.x + 'px';
        handle.style.top = point.y + 'px';
        handle.style.borderColor = this.getAngleColor().hex;
        handle.style.color = this.getAngleColor().hex;
      });
      this.angleHandles.vertex.style.backgroundColor = 'transparent';
      this.angleHandles.vertex.style.color = 'transparent';
      this.updateAngleToolbarPosition();
    }

    updateAngleLabel() {
      if (!this.angleLabel) return;

      const { vertex, armA, armB } = this.anglePoints;
      const angle = this.getAngleDegrees();
      this.angleLabel.textContent = `${angle.toFixed(1)}°`;

      const a1 = Math.atan2(armA.y - vertex.y, armA.x - vertex.x);
      const delta = this.normalizeAngleRadians(Math.atan2(armB.y - vertex.y, armB.x - vertex.x) - a1);
      const mid = a1 + delta / 2;
      const radius = Math.min(Math.hypot(armA.x - vertex.x, armA.y - vertex.y), Math.hypot(armB.x - vertex.x, armB.y - vertex.y), 96);
      const x = Math.max(32, Math.min(this.angleToolWidth - 32, vertex.x + radius * Math.cos(mid)));
      const y = Math.max(24, Math.min(this.angleToolHeight - 24, vertex.y + radius * Math.sin(mid)));

      this.angleLabel.style.left = x + 'px';
      this.angleLabel.style.top = y + 'px';
    }

    updateAngleToolbarPosition() {
      if (!this.toolbar || this.state.mode !== 'angle') return;

      const gap = 6;
      const toolbarWidth = 252;
      const toolbarHeight = 28;
      const left = Math.max(10, Math.min(this.angleToolWidth - toolbarWidth - 10, this.anglePoints.vertex.x + 16));
      const top = Math.max(10, Math.min(this.angleToolHeight - toolbarHeight - 10, this.anglePoints.vertex.y + 16));

      this.toolbar.style.left = left + 'px';
      this.toolbar.style.top = top + 'px';
      this.toolbar.style.right = 'auto';
      this.toolbar.style.bottom = 'auto';
      this.toolbar.style.gap = gap + 'px';
    }
  }

  window.OnlineRulerOverlay.OnlineRulerInstance = OnlineRulerInstance;
  window.OnlineRulerInstance = OnlineRulerInstance;
})();
