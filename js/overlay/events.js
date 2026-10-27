(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  OnlineRulerInstance.prototype.showKeyboardHint = function(message, duration) {
    this.keyboardHint.textContent = message;

    // Centered text can land between device pixels, especially when the message
    // width is fractional. Snap its viewport position without changing ruler motion.
    this.keyboardHint.style.setProperty('--keyboard-hint-snap-x', '0px');
    this.keyboardHint.style.setProperty('--keyboard-hint-snap-y', '0px');
    const rect = this.keyboardHint.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const viewportDx = Math.round(rect.left * dpr) / dpr - rect.left;
    const viewportDy = Math.round(rect.top * dpr) / dpr - rect.top;
    const transform = getComputedStyle(this.container).transform;
    const matrix = transform === 'none' ? new DOMMatrix() : new DOMMatrix(transform);
    const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
    const localDx = (matrix.d * viewportDx - matrix.c * viewportDy) / determinant;
    const localDy = (-matrix.b * viewportDx + matrix.a * viewportDy) / determinant;
    this.keyboardHint.style.setProperty('--keyboard-hint-snap-x', `${localDx}px`);
    this.keyboardHint.style.setProperty('--keyboard-hint-snap-y', `${localDy}px`);

    this.keyboardHint.classList.add('visible');
    clearTimeout(this.keyboardHintTimeout);
    this.keyboardHintTimeout = setTimeout(() => {
      this.keyboardHint.classList.remove('visible');
      this.keyboardHint.textContent = this.keyboardHintFocusText;
    }, duration);
  };

  OnlineRulerInstance.prototype.initEvents = function() {
    this.container.addEventListener('focus', () => {
      this.container.classList.add('keyboard-focused');
      this.showKeyboardHint(this.keyboardHintFocusText, 2800);
    });

    this.container.addEventListener('blur', () => {
      this.container.classList.remove('keyboard-focused');
      this.keyboardHint.classList.remove('visible');
      clearTimeout(this.keyboardHintTimeout);
    });

    this.container.addEventListener('keydown', (e) => {
      // Only handle keys while the ruler container itself owns focus. Form controls
      // inside its toolbar retain their normal keyboard behavior.
      if (document.activeElement !== this.container) return;

      if (e.key === 'Tab') {
        const rulers = Array.from(document.querySelectorAll('.online-ruler-overlay'));
        if (rulers.length < 2) return;
        const currentIndex = rulers.indexOf(this.container);
        const direction = e.shiftKey ? -1 : 1;
        const next = rulers[(currentIndex + direction + rulers.length) % rulers.length];
        e.preventDefault();
        e.stopPropagation();
        next.focus({ preventScroll: true });
        return;
      }

      const movement = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1]
      }[e.key];
      if (!movement) return;

      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 10 : 1;
      const left = parseFloat(this.container.style.left) || 0;
      const top = parseFloat(this.container.style.top) || 0;
      this.container.style.left = (left + movement[0] * step) + 'px';
      this.container.style.top = (top + movement[1] * step) + 'px';
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.container.contains(e.target) && document.activeElement === this.container) {
        this.container.blur();
      }
    });

    this.modeToggleBtn.onclick = () => {
      this.state.mode = this.state.mode === 'ruler' ? 'protractor' : 'ruler';
      this.updateLayout();
    };

    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'setMode') {
        this.state.mode = request.mode;
        this.updateLayout();
      }
    });

    this.unitSelect.onchange = (e) => {
      this.state.unit = e.target.value;
      this.updateRulerContent();
      chrome.storage.local.set({ unit: e.target.value });
    };
    this.materialSelect.onchange = (e) => {
      this.state.material = e.target.value;
      this.updateLayout();
      chrome.storage.local.set({ material: e.target.value });
    };

    let sX, sY, iL, iT, iW, iH;

    this.container.onmousedown = (e) => {
      window.OnlineRulerInstance.maxZIndex = (window.OnlineRulerInstance.maxZIndex || 1000000) + 1;
      this.container.style.zIndex = window.OnlineRulerInstance.maxZIndex;

      if (e.target.closest('select, input, button, .color-selector')) return;
      this.container.focus({ preventScroll: true });
      sX = e.clientX;
      sY = e.clientY;

      if (this.state.mode === 'angle' && e.target.closest('.angle-handle')) {
        this.dragMode = 'angle-point';
        this.activeAnglePoint = e.target.closest('.angle-handle').dataset.point;
      } else if (e.target === this.rotateHandle) {
        this.dragMode = 'rotate';
        
        const style = window.getComputedStyle(this.container);
        const origin = style.transformOrigin.split(' ');
        const ox = parseFloat(origin[0]) || 0;
        const oy = parseFloat(origin[1]) || 0;

        this.pivotX = (parseInt(this.container.style.left) || 0) + ox;
        this.pivotY = (parseInt(this.container.style.top) || 0) + oy;

        const startMouseAngle = Math.atan2(e.clientY - this.pivotY, e.clientX - this.pivotX) * 180 / Math.PI;
        this.startRotationOffset = this.state.angle - startMouseAngle;

        this.rotateHandle.classList.add('active');
        this.angleBadge.style.display = 'block';
      } else if (e.target.closest('.resize-handle')) {
        this.dragMode = 'resize';
        iW = this.container.offsetWidth;
        iH = this.container.offsetHeight;
      } else {
        this.dragMode = 'drag';
        iL = this.container.offsetLeft;
        iT = this.container.offsetTop;
      }
      e.preventDefault();

      const onMouseMove = (me) => {
        if (!this.dragMode) return;
        if (this.dragMode === 'drag') {
          this.container.style.left = (iL + me.clientX - sX) + 'px';
          this.container.style.top = (iT + me.clientY - sY) + 'px';
        } else if (this.dragMode === 'resize') {
          if (!this.isVertical) {
            this.hW = Math.max(320, iW + me.clientX - sX);
            this.container.style.width = this.hW + 'px';
            this.updateRulerContent();
          } else {
            this.vH = Math.max(320, iH + me.clientY - sY);
            this.container.style.height = this.vH + 'px';
            this.updateRulerContent();
          }
        } else if (this.dragMode === 'rotate') {
          const currentMouseAngle = Math.atan2(me.clientY - this.pivotY, me.clientX - this.pivotX) * 180 / Math.PI;
          let finalAngle = currentMouseAngle + this.startRotationOffset;

          [0, 45, 90, 135, 180, -45, -90, -135, -180].forEach(snap => {
            if (Math.abs(finalAngle - snap) < 2) finalAngle = snap;
          });
          this.state.angle = finalAngle;
          this.updateRulerTransform();
        } else if (this.dragMode === 'angle-point') {
          const rect = this.rulerBody.getBoundingClientRect();
          const point = this.anglePoints[this.activeAnglePoint];
          point.x = me.clientX - rect.left;
          point.y = me.clientY - rect.top;
          this.snapAngleToolArm(this.activeAnglePoint);
          this.updateAngleToolContent();
        }
      };

      const onMouseUp = () => {
        if (this.dragMode === 'rotate') {
          this.rotateHandle.classList.remove('active');
          setTimeout(() => {
            if (!this.dragMode) this.angleBadge.style.display = 'none';
          }, 1000);
        }
        this.activeAnglePoint = '';
        this.dragMode = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('showMilestone', this.handleMilestone.bind(this));
  };
})();
