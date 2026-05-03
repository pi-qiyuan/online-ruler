(function() {
  if (document.getElementById('online-ruler-overlay')) return;

  let state = { ppi: 96, unit: 'cm', zeroOffset: 0, angle: 0 };
  let isVertical = false, hW = 600, vH = 600;
  let pivotX = 100, pivotY = 100; // 记录旋转中心（左上角）在视口中的位置

  const styles = `
    #online-ruler-overlay { position: fixed; top: 100px; left: 100px; z-index: 1000000; cursor: move; user-select: none; display: flex; box-shadow: 0 10px 40px rgba(0,0,0,0.4); border-radius: 6px; transform-origin: 0 0; will-change: transform, left, top; }
    .ruler-body { position: relative; background-color: ${SharedLogic.CONSTANTS.WOOD_BASE_COLOR}; overflow: visible; flex-shrink: 0; }
    .ruler-svg { width: 100%; height: 100%; display: block; position: absolute; top: 0; left: 0; pointer-events: none; }
    
    .resize-handle { position: absolute; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.1); z-index: 10; opacity: 0; transition: opacity 0.2s; }
    .ruler-body:hover .resize-handle { opacity: 1; }
    .resize-handle div { border: 2px solid rgba(0,0,0,0.5); }
    
    .rotate-handle { position: absolute; width: 24px; height: 24px; background: #fff; border: 2px solid #333; border-radius: 50%; right: -35px; top: 50%; margin-top: -12px; cursor: crosshair; z-index: 20; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s; }
    .ruler-body:hover .rotate-handle, .rotate-handle.active { opacity: 0.8; }
    .rotate-handle::after { content: '↻'; font-size: 14px; color: #333; font-weight: bold; }

    .angle-badge { position: absolute; top: -40px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 12px; pointer-events: none; display: none; white-space: nowrap; z-index: 100; }
    
    .ruler-toolbar { background: #333; display: flex; gap: 8px; cursor: default; box-sizing: border-box; color: white; }
    .ruler-toolbar select, .ruler-toolbar button { font-size: 11px; padding: 2px 5px; background: #444; color: white; border: 1px solid #555; border-radius: 3px; cursor: pointer; }
    .angle-presets { display: flex; gap: 4px; border-left: 1px solid #555; padding-left: 8px; margin-left: 4px; }
  `;
  const styleSheet = document.createElement("style"); styleSheet.innerText = styles; document.head.appendChild(styleSheet);

  const container = document.createElement('div'); container.id = 'online-ruler-overlay';
  const rulerBody = document.createElement('div'); rulerBody.className = 'ruler-body';
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.className = 'ruler-svg';
  const resizeHandle = document.createElement('div'); resizeHandle.className = 'resize-handle';
  const resizeIcon = document.createElement('div'); resizeHandle.appendChild(resizeIcon);
  const rotateHandle = document.createElement('div'); rotateHandle.className = 'rotate-handle';
  const angleBadge = document.createElement('div'); angleBadge.className = 'angle-badge';
  const toolbar = document.createElement('div'); toolbar.className = 'ruler-toolbar';

  rulerBody.append(svg, resizeHandle, rotateHandle, angleBadge);
  container.append(rulerBody, toolbar);

  const unitSelect = document.createElement('select');
  [['cm', 'unitCm', 'CM/MM'], ['in', 'unitIn', 'Inch']].forEach(([v, k, d]) => {
    const o = document.createElement('option'); o.value = v; o.innerText = chrome.i18n.getMessage(k) || d; unitSelect.appendChild(o);
  });

  const opacityInput = document.createElement('input'); opacityInput.type = 'range'; opacityInput.min = '30'; opacityInput.max = '100'; opacityInput.value = '100';
  opacityInput.oninput = (e) => container.style.opacity = e.target.value / 100;

  const closeBtn = document.createElement('button'); closeBtn.innerText = '✕';
  closeBtn.style.cssText = "background: none; border: none; color: #aaa; font-size: 14px;";
  closeBtn.onclick = () => { container.remove(); styleSheet.remove(); };

  function updateRulerContent() {
    SharedLogic.drawRuler(svg, { width: isVertical?60:hW, height: isVertical?vH:60, isVertical, unit: state.unit, physicalPpi: state.ppi, zeroOffset: state.zeroOffset });
  }

  function updateRulerTransform() {
    container.style.transform = `rotate(${state.angle}deg)`;
    angleBadge.innerText = `${parseFloat(state.angle).toFixed(1)}°`;
  }

  function createAnglePresets() {
    const group = document.createElement('div'); group.className = 'angle-presets';
    [0, 45, 90].forEach(deg => {
      const btn = document.createElement('button'); btn.innerText = deg + '°';
      btn.onclick = (e) => { e.stopPropagation(); state.angle = deg; chrome.storage.local.set({ angle: deg }); updateRulerTransform(); };
      group.appendChild(btn);
    });
    return group;
  }

  function updateLayout() {
    const curL = container.style.left;
    const curT = container.style.top;
    
    [container, rulerBody, resizeHandle, resizeIcon, toolbar, opacityInput].forEach(el => el.style.cssText = '');
    Object.assign(container.style, { position: 'fixed', zIndex: '1000000', boxShadow: '0 10px 40px rgba(0,0,0,0.4)', borderRadius: '6px', transformOrigin: '0 0', left: curL || '100px', top: curT || '100px' });
    
    toolbar.innerHTML = '';
    const presets = createAnglePresets();

    if (!isVertical) {
      Object.assign(container.style, { width: hW + 'px', height: '95px', flexDirection: 'column', minWidth: '320px' });
      Object.assign(rulerBody.style, { width: '100%', height: '60px', backgroundImage: SharedLogic.CONSTANTS.TEXTURES.HORIZONTAL, borderRadius: '6px 6px 0 0' });
      Object.assign(resizeHandle.style, { width: '16px', height: '60px', right: '0', top: '0', cursor: 'ew-resize', borderLeft: '1px solid rgba(0,0,0,0.2)' });
      Object.assign(resizeIcon.style, { width: '4px', height: '25px', borderLeft: '2px solid rgba(0,0,0,0.6)', borderRight: '2px solid rgba(0,0,0,0.6)' });
      Object.assign(toolbar.style, { width: '100%', height: '35px', flexDirection: 'row', borderRadius: '0 0 6px 6px', padding: '0 10px', justifyContent: 'space-between', alignItems: 'center', display: 'flex' });
      Object.assign(rotateHandle.style, { right: '-35px', top: '30px' });
      opacityInput.style.width = '60px';
      const L = document.createElement('div'); L.style.cssText = 'display:flex;gap:8px;align-items:center;'; L.append(unitSelect, presets);
      const R = document.createElement('div'); R.style.cssText = 'display:flex;gap:8px;align-items:center;'; R.append(opacityInput, closeBtn);
      toolbar.append(L, R); 
    } else {
      Object.assign(container.style, { width: '200px', height: vH + 'px', flexDirection: 'row', minHeight: '320px' });
      Object.assign(rulerBody.style, { width: '60px', height: '100%', backgroundImage: SharedLogic.CONSTANTS.TEXTURES.VERTICAL, borderRadius: '6px 0 0 6px' });
      Object.assign(resizeHandle.style, { width: '60px', height: '16px', bottom: '0', left: '0', cursor: 'ns-resize', borderTop: '1px solid rgba(0,0,0,0.2)' });
      Object.assign(resizeIcon.style, { width: '25px', height: '4px', borderTop: '2px solid rgba(0,0,0,0.6)', borderBottom: '2px solid rgba(0,0,0,0.6)' });
      Object.assign(toolbar.style, { width: '140px', height: '100%', flexDirection: 'column', borderRadius: '0 6px 6px 0', padding: '10px', gap: '10px', display: 'flex' });
      Object.assign(rotateHandle.style, { bottom: '-35px', left: '30px' });
      const T = document.createElement('div'); T.style.textAlign = 'right'; T.append(closeBtn);
      const P = document.createElement('div'); P.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;justify-content:center;'; P.append(...presets.childNodes);
      const O = document.createElement('div'); O.style.cssText = "margin-top: auto; padding-bottom: 10px; display: flex; justify-content: center;";
      opacityInput.style.cssText = "height: 60px; width: 20px; writing-mode: vertical-lr; direction: rtl;";
      O.append(opacityInput); toolbar.append(T, unitSelect, P, O);
    }
    updateRulerContent();
    updateRulerTransform();
  }

  SharedLogic.bindState(state, (init) => { 
    if(init) unitSelect.value = state.unit; 
    updateRulerContent(); 
    updateRulerTransform();
  });

  unitSelect.onchange = (e) => chrome.storage.local.set({ unit: e.target.value });

  let mode = '', sX, sY, iL, iT, iW, iH;
  container.onmousedown = (e) => {
    if (e.target.closest('select, input, button')) return;
    sX = e.clientX; sY = e.clientY;
    if (e.target === rotateHandle) { 
      mode = 'rotate'; 
      pivotX = parseInt(container.style.left) || 100;
      pivotY = parseInt(container.style.top) || 100;
      rotateHandle.classList.add('active'); angleBadge.style.display = 'block';
    } else if (e.target.closest('.resize-handle')) { 
      mode = 'resize'; iW = container.offsetWidth; iH = container.offsetHeight; 
    } else { 
      mode = 'drag'; iL = container.offsetLeft; iT = container.offsetTop; 
    }
    e.preventDefault();
  };

  window.addEventListener('mousemove', (e) => {
    if (!mode) return;
    if (mode === 'drag') {
      container.style.left = (iL + e.clientX - sX) + 'px';
      container.style.top = (iT + e.clientY - sY) + 'px';
    } else if (mode === 'resize') {
      if (!isVertical) { hW = Math.max(320, iW + e.clientX - sX); container.style.width = hW + 'px'; updateRulerContent(); }
      else { vH = Math.max(320, iH + e.clientY - sY); container.style.height = vH + 'px'; updateRulerContent(); }
    } else if (mode === 'rotate') {
      const angle = Math.atan2(e.clientY - pivotY, e.clientX - pivotX) * 180 / Math.PI;
      let finalAngle = isVertical ? angle - 90 : angle;
      [0, 45, 90, 135, 180, -45, -90, -135, -180].forEach(snap => {
        if (Math.abs(finalAngle - snap) < 2) finalAngle = snap;
      });
      state.angle = finalAngle;
      updateRulerTransform();
    }
  });

  window.addEventListener('mouseup', () => { 
    if (mode === 'rotate') {
      chrome.storage.local.set({ angle: state.angle });
      rotateHandle.classList.remove('active');
      setTimeout(() => { if(!mode) angleBadge.style.display = 'none'; }, 1000);
    }
    mode = ''; 
  });

  document.body.appendChild(container); updateLayout();
})();
