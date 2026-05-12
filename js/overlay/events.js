(function() {
  const OnlineRulerInstance = window.OnlineRulerOverlay && window.OnlineRulerOverlay.OnlineRulerInstance;
  if (!OnlineRulerInstance) return;

  OnlineRulerInstance.prototype.initEvents = function() {
    this.modeToggleBtn.onclick = () => {
      this.state.mode = this.state.mode === 'protractor' ? 'ruler' : 'protractor';
      this.updateLayout();
    };

    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'setMode') {
        this.state.mode = request.mode;
        this.updateLayout();
      }
    });

    this.unitSelect.onchange = (e) => chrome.storage.local.set({ unit: e.target.value });
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
      sX = e.clientX;
      sY = e.clientY;

      if (e.target === this.rotateHandle) {
        this.dragMode = 'rotate';
        this.pivotX = parseInt(this.container.style.left) || 0;
        this.pivotY = parseInt(this.container.style.top) || 0;

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
        }
      };

      const onMouseUp = () => {
        if (this.dragMode === 'rotate') {
          this.rotateHandle.classList.remove('active');
          setTimeout(() => {
            if (!this.dragMode) this.angleBadge.style.display = 'none';
          }, 1000);
        }
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
