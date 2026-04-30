(function() {
  if (document.getElementById('online-ruler-overlay')) {
    return;
  }

  // 内存变量，确保同步访问
  let ppi = 96;
  let unit = 'cm';
  let isVertical = false;
  let zeroOffset = 0; // mm

  const container = document.createElement('div');
  container.id = 'online-ruler-overlay';
  container.style.cssText = `
    position: fixed;
    top: 50px;
    left: 50px;
    width: 600px;
    height: 95px; 
    z-index: 1000000;
    cursor: move;
    user-select: none;
    display: flex;
    flex-direction: column;
    overflow: visible;
    box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    border-radius: 6px;
    min-width: 320px;
    min-height: 95px;
    background: transparent;
  `;

  const woodBaseColor = "#dcb35c";
  const horizontalWoodTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6 0.005' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
  const verticalWoodTexture = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005 0.6' numOctaves='5' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.25 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

  // Ruler Body
  const rulerBody = document.createElement('div');
  rulerBody.style.cssText = `
    width: 100%;
    height: 60px;
    position: relative;
    background-color: ${woodBaseColor};
    background-image: ${horizontalWoodTexture};
    overflow: hidden;
    flex-shrink: 0;
    border-radius: 6px 6px 0 0;
  `;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = "width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0;";
  rulerBody.appendChild(svg);

  // Resize Handle
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'ruler-resize-handle';
  resizeHandle.style.cssText = `
    position: absolute;
    right: 0;
    top: 0;
    width: 16px;
    height: 60px;
    cursor: ew-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.15);
    border-left: 1px solid rgba(0,0,0,0.2);
    z-index: 10;
  `;
  rulerBody.appendChild(resizeHandle);

  // Toolbar Area
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `
    height: 35px;
    width: 100%;
    background: #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    gap: 8px;
    cursor: default;
    box-sizing: border-box;
    color: white;
    border-radius: 0 0 6px 6px;
  `;

  // Controls
  const unitSelect = document.createElement('select');
  unitSelect.style.cssText = "font-size: 11px; padding: 2px; width: 100px; box-sizing: border-box; background: #444; color: white; border: 1px solid #555; border-radius: 3px;";
  const optCm = document.createElement('option');
  optCm.value = 'cm';
  optCm.innerText = chrome.i18n.getMessage('unitCm') || 'CM/MM';
  const optIn = document.createElement('option');
  optIn.value = 'in';
  optIn.innerText = chrome.i18n.getMessage('unitIn') || 'Inch';
  unitSelect.appendChild(optCm);
  unitSelect.appendChild(optIn);

  const toggleBtn = document.createElement('button');
  toggleBtn.innerText = '↔/↕';
  toggleBtn.style.cssText = "padding: 2px 8px; cursor: pointer; font-size: 11px; background: #444; color: white; border: 1px solid #555; border-radius: 3px;";

  const opacityInput = document.createElement('input');
  opacityInput.type = 'range';
  opacityInput.min = '30';
  opacityInput.max = '100';
  opacityInput.value = '100';
  opacityInput.style.cssText = "width: 80px; cursor: pointer;";
  opacityInput.oninput = (e) => {
    container.style.opacity = e.target.value / 100;
  };

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕';
  closeBtn.style.cssText = "background: none; border: none; color: #aaa; cursor: pointer; font-size: 14px; padding: 0 5px;";
  closeBtn.onclick = () => container.remove();

  function updateLayout() {
    toolbar.innerHTML = '';
    if (!isVertical) {
      container.style.width = container.offsetWidth + 'px';
      container.style.height = '95px';
      container.style.flexDirection = 'column';
      container.style.minWidth = '320px';
      container.style.minHeight = '95px';
      rulerBody.style.width = '100%';
      rulerBody.style.height = '60px';
      rulerBody.style.backgroundImage = horizontalWoodTexture;
      rulerBody.style.borderRadius = '6px 6px 0 0';
      
      resizeHandle.style.width = '16px';
      resizeHandle.style.height = '60px';
      resizeHandle.style.right = '0';
      resizeHandle.style.top = '0';
      resizeHandle.style.bottom = 'auto';
      resizeHandle.style.left = 'auto';
      resizeHandle.style.cursor = 'ew-resize';
      resizeHandle.innerHTML = `<div style="width: 4px; height: 25px; border-left: 2px solid rgba(0,0,0,0.6); border-right: 2px solid rgba(0,0,0,0.6);"></div>`;

      toolbar.style.width = '100%';
      toolbar.style.height = '35px';
      toolbar.style.flexDirection = 'row';
      toolbar.style.borderRadius = '0 0 6px 6px';
      toolbar.style.padding = '0 10px';
      
      opacityInput.style.cssText = "width: 80px; cursor: pointer; writing-mode: horizontal-tb; direction: ltr;";
      unitSelect.style.width = '140px';
      toggleBtn.style.width = 'auto';

      const leftGroup = document.createElement('div');
      leftGroup.style.cssText = "display: flex; align-items: center; gap: 8px;";
      leftGroup.appendChild(unitSelect);
      leftGroup.appendChild(toggleBtn);
      
      const rightGroup = document.createElement('div');
      rightGroup.style.cssText = "display: flex; align-items: center; gap: 8px;";
      rightGroup.appendChild(opacityInput);
      rightGroup.appendChild(closeBtn);
      
      toolbar.appendChild(leftGroup);
      toolbar.appendChild(rightGroup);
    } else {
      container.style.width = '200px';
      container.style.height = container.offsetHeight + 'px';
      container.style.flexDirection = 'row';
      container.style.minWidth = '200px';
      container.style.minHeight = '320px';
      rulerBody.style.width = '60px';
      rulerBody.style.height = '100%';
      rulerBody.style.backgroundImage = verticalWoodTexture;
      rulerBody.style.borderRadius = '6px 0 0 6px';

      resizeHandle.style.width = '60px';
      resizeHandle.style.height = '16px';
      resizeHandle.style.right = 'auto';
      resizeHandle.style.top = 'auto';
      resizeHandle.style.bottom = '0';
      resizeHandle.style.left = '0';
      resizeHandle.style.cursor = 'ns-resize';
      resizeHandle.innerHTML = `<div style="width: 25px; height: 4px; border-top: 2px solid rgba(0,0,0,0.6); border-bottom: 2px solid rgba(0,0,0,0.6);"></div>`;

      toolbar.style.width = '140px';
      toolbar.style.height = '100%';
      toolbar.style.flexDirection = 'column';
      toolbar.style.borderRadius = '0 6px 6px 0';
      toolbar.style.padding = '15px 10px';
      toolbar.style.justifyContent = 'flex-start';
      toolbar.style.alignItems = 'stretch';
      toolbar.style.gap = '15px';

      unitSelect.style.width = '100%';
      toggleBtn.style.width = '100%';
      opacityInput.style.cssText = "height: 80px; width: 20px; cursor: pointer; writing-mode: vertical-lr; direction: rtl; margin: 0 auto;";
      
      const closeWrapper = document.createElement('div');
      closeWrapper.style.cssText = "display: flex; justify-content: flex-end; width: 100%; margin-bottom: 5px;";
      closeWrapper.appendChild(closeBtn);

      toolbar.appendChild(closeWrapper);
      toolbar.appendChild(unitSelect);
      toolbar.appendChild(toggleBtn);
      
      const opacityWrapper = document.createElement('div');
      opacityWrapper.style.cssText = "margin-top: auto; padding-bottom: 10px; display: flex; justify-content: center;";
      opacityWrapper.appendChild(opacityInput);
      toolbar.appendChild(opacityWrapper);
    }
  }

  function drawRuler() {
    svg.innerHTML = '';
    const width = rulerBody.clientWidth;
    const height = rulerBody.clientHeight;
    if (width === 0 || height === 0) return;

    const pixelsPerMm = ppi / 25.4;
    const offsetPx = zeroOffset * pixelsPerMm;
    const rulerLength = isVertical ? height : width;
    
    if (unit === 'cm') {
      const startMm = -Math.ceil(Math.max(0, -zeroOffset));
      const totalMm = rulerLength / pixelsPerMm;
      for (let i = startMm; i <= totalMm + Math.abs(startMm); i++) {
        const pos = (i * pixelsPerMm) + offsetPx;
        if (pos < 0) continue;
        if (pos > rulerLength) break;
        let lineH = (i % 10 === 0) ? 25 : (i % 5 === 0 ? 18 : 10);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        svg.appendChild(line);
        if (i % 10 === 0) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.textContent = i / 10;
          svg.appendChild(text);
        }
      }
    } else {
      const pixelsPerInch = ppi;
      const startStep = -Math.ceil(Math.max(0, -(zeroOffset / 25.4) * 16));
      const totalSteps = (rulerLength / ppi) * 16;
      for (let i = startStep; i <= totalSteps + Math.abs(startStep); i++) {
        const pos = (i * (pixelsPerInch / 16)) + offsetPx;
        if (pos < 0) continue;
        if (pos > rulerLength) break;
        let lineH = (i % 16 === 0) ? 25 : (i % 8 === 0 ? 18 : (i % 4 === 0 ? 14 : (i % 2 === 0 ? 11 : 8)));
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        svg.appendChild(line);
        if (i % 16 === 0) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.textContent = i / 16;
          svg.appendChild(text);
        }
      }
    }
  }

  // 初始化获取数据并渲染
  chrome.storage.local.get(['ppi', 'unit', 'zeroOffset'], (result) => {
    ppi = result.ppi || 96;
    unit = result.unit || 'cm';
    zeroOffset = result.zeroOffset || 0;
    unitSelect.value = unit;
    updateLayout();
    drawRuler();
  });

  // 监听存储变化（实现零点实时同步）
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.ppi) ppi = changes.ppi.newValue;
      if (changes.unit) {
        unit = changes.unit.newValue;
        unitSelect.value = unit;
      }
      if (changes.zeroOffset !== undefined) zeroOffset = changes.zeroOffset.newValue;
      drawRuler();
    }
  });

  unitSelect.onchange = (e) => {
    unit = e.target.value;
    chrome.storage.local.set({ unit: unit });
  };

  toggleBtn.onclick = () => {
    isVertical = !isVertical;
    updateLayout();
    drawRuler();
  };

  // Dragging & Resizing logic
  let isDragging = false;
  let isResizing = false;
  let startX, startY, initialLeft, initialTop, initialWidth, initialHeight;

  container.addEventListener('mousedown', (e) => {
    if (e.target === opacityInput || e.target === unitSelect || e.target === toggleBtn || e.target === closeBtn) return;
    
    if (e.target === resizeHandle || resizeHandle.contains(e.target)) {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      initialWidth = container.offsetWidth;
      initialHeight = container.offsetHeight;
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = container.offsetLeft;
    initialTop = container.offsetTop;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      container.style.left = (initialLeft + e.clientX - startX) + 'px';
      container.style.top = (initialTop + e.clientY - startY) + 'px';
    } else if (isResizing) {
      if (!isVertical) {
        const newWidth = initialWidth + (e.clientX - startX);
        container.style.width = Math.max(320, newWidth) + 'px';
      } else {
        const newHeight = initialHeight + (e.clientY - startY);
        container.style.height = Math.max(320, newHeight) + 'px';
      }
      drawRuler(); // 同步绘制，由于不再有 async 调用，刻度不会消失
    }
  });

  window.addEventListener('mouseup', () => { 
    isDragging = false; 
    isResizing = false;
  });

  container.appendChild(rulerBody);
  container.appendChild(toolbar);
  document.body.appendChild(container);
})();