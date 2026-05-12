/**
 * Measurement Engine - Handles SVG rendering for rulers, protractors, etc.
 */
var MeasurementEngine = {
  // 材质与 ID 映射 (对应 assets/materials.svg 中的 ID)
  get MATERIALS() {
    return SharedLogic.CONSTANTS.MATERIAL_DETAILS;
  },

  /**
   * 加载材质库（读取外部文件并注入 DOM）
   * 必须在 drawRuler 之前或初始化时调用一次
   */
  loadMaterials: async function() {
    if (document.getElementById('online-ruler-materials')) return;
    
    try {
      const response = await fetch(chrome.runtime.getURL('assets/materials.svg'));
      const svgText = await response.text();
      const div = document.createElement('div');
      div.id = 'online-ruler-materials';
      div.style.cssText = "position: absolute; width: 0; height: 0; overflow: hidden; pointer-events: none;";
      div.innerHTML = svgText;
      document.body.appendChild(div);
    } catch (e) {
      console.error("Failed to load materials library", e);
    }
  },

  /**
   * Draw a standard ruler
   */
  drawRuler: function(svg, options) {
    const { width, height, isVertical, unit, physicalPpi, zeroOffset, material = 'WOOD', color } = options;
    if (width === 0 || height === 0) return;

    const ns = "http://www.w3.org/2000/svg";
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // 背景绘制改用引用的 ID
    const filterId = isVertical ? this.MATERIALS[material].filterV : this.MATERIALS[material].filterH;

    // 1. Draw Background (Double Layer for Wood/Plastic)
    // 第一层：纯色底色
    const bgBase = document.createElementNS(ns, "rect");
    bgBase.setAttribute("width", "100%");
    bgBase.setAttribute("height", "100%");
    bgBase.setAttribute("fill", color || this.MATERIALS[material].baseColor);
    svg.appendChild(bgBase);

    // 第二层：纹理滤镜（引用 DOM 中的 filterId）
    const bgTexture = document.createElementNS(ns, "rect");
    bgTexture.setAttribute("width", "100%");
    bgTexture.setAttribute("height", "100%");
    bgTexture.setAttribute("fill", "transparent");
    bgTexture.setAttribute("filter", `url(#${filterId})`);
    svg.appendChild(bgTexture);

    // 2. Scale Calculation
    const ppi = physicalPpi;
    const pixelsPerMm = ppi / 25.4;
    const offsetPx = (zeroOffset || 0) * pixelsPerMm;
    const rulerLength = isVertical ? height : width;
    
    const fragment = document.createDocumentFragment();

    if (unit === 'cm') {
      const startMm = -Math.ceil(Math.max(0, -(zeroOffset || 0)));
      for (let i = startMm; ; i++) {
        const pos = i * pixelsPerMm + offsetPx;
        if (pos > rulerLength + 5) break;
        if (pos < -5) continue; 

        const lineH = (i % 10 === 0) ? 25 : (i % 5 === 0 ? 18 : 10);
        const line = document.createElementNS(ns, "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        fragment.appendChild(line);

        if (i % 10 === 0) {
          const text = document.createElementNS(ns, "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.setAttribute("font-family", "sans-serif");
          text.textContent = i / 10;
          fragment.appendChild(text);
        }
      }
    } else {
      const pixelsPerInch = ppi;
      const startStep = -Math.ceil(Math.max(0, -((zeroOffset || 0) / 25.4) * 16));
      for (let i = startStep; ; i++) {
        const pos = i * (pixelsPerInch / 16) + offsetPx;
        if (pos > rulerLength + 5) break;
        if (pos < -5) continue;

        const lineH = (i % 16 === 0) ? 25 : (i % 8 === 0 ? 18 : (i % 4 === 0 ? 14 : (i % 2 === 0 ? 11 : 8)));
        const line = document.createElementNS(ns, "line");
        if (!isVertical) {
          line.setAttribute("x1", pos); line.setAttribute("y1", 0);
          line.setAttribute("x2", pos); line.setAttribute("y2", lineH);
        } else {
          line.setAttribute("x1", 0); line.setAttribute("y1", pos);
          line.setAttribute("x2", lineH); line.setAttribute("y2", pos);
        }
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "1");
        fragment.appendChild(line);

        if (i % 16 === 0) {
          const text = document.createElementNS(ns, "text");
          if (!isVertical) { text.setAttribute("x", pos + 2); text.setAttribute("y", 35); }
          else { text.setAttribute("x", 28); text.setAttribute("y", pos + 5); }
          text.setAttribute("font-size", "10");
          text.setAttribute("font-family", "sans-serif");
          text.textContent = i / 16;
          fragment.appendChild(text);
        }
      }
    }
    svg.appendChild(fragment);
  },

  /**
   * Draw a standard protractor
   * 180-degree semi-circle with 6-inch and 10cm rulers at bottom
   */
  drawProtractor: function(svg, options) {
    const { physicalPpi, color } = options;
    const ns = "http://www.w3.org/2000/svg";
    const ppi = physicalPpi;
    const pxPerMm = ppi / 25.4;
    const pxPerInch = ppi;

    // Dimensions
    const baseWidth = 6 * pxPerInch; // Base bottom stays 6 inches
    const outerR = baseWidth / 2; // Aligned with the 6-inch bottom edge (3 inches radius)
    const baseTopHalfWidth = 55 * pxPerMm;
    const tenDegreeRad = 10 * Math.PI / 180;
    const bottomBarTopOffset = baseTopHalfWidth * Math.tan(tenDegreeRad);
    const longestInchTickHeight = 18 * pxPerMm / 4;
    const bottomBarBottomOffset = pxPerMm + longestInchTickHeight;
    
    // Width of top edge inside arc: 100mm ruler + 2x5mm margins = 110mm
    // Radius R needed for width W at height H from center: R = sqrt((W/2)^2 + H^2)
    const cutoutR = baseTopHalfWidth / Math.cos(tenDegreeRad); 
    const scaleThickness = 15 * pxPerMm; 
    
    const height = outerR + bottomBarBottomOffset;
    
    svg.setAttribute('width', baseWidth);
    svg.setAttribute('height', height);
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const centerX = baseWidth / 2;
    const centerY = outerR; // Vertex point (also vertical center of the bottom bar)
    
    const barTopY = centerY - bottomBarTopOffset;
    const barBottomY = centerY + bottomBarBottomOffset;

    // 1. Background - Transparent plastic (Hollow)
    // Outer boundary path: Semi-circle arc aligned with base bottom
    const bgOuterD = `
      M 0,${centerY}
      A ${outerR},${outerR} 0 0 1 ${baseWidth},${centerY}
      V ${barBottomY}
      H 0
      Z
    `;
    
    // Inner cutout path
    const bgInnerD = `
      M ${centerX - baseTopHalfWidth},${barTopY}
      A ${cutoutR},${cutoutR} 0 0 1 ${centerX + baseTopHalfWidth},${barTopY}
      H ${centerX - baseTopHalfWidth}
      Z
    `;
    
    const combinedD = bgOuterD + " " + bgInnerD;
    
    const bgBase = document.createElementNS(ns, "path");
    bgBase.setAttribute("d", combinedD);
    bgBase.setAttribute("fill", color || "rgba(255, 255, 255, 0.85)");
    bgBase.setAttribute("fill-rule", "evenodd");
    svg.appendChild(bgBase);

    const bgTexture = document.createElementNS(ns, "path");
    bgTexture.setAttribute("d", combinedD);
    bgTexture.setAttribute("fill", "transparent");
    bgTexture.setAttribute("filter", "url(#plasticFilter)");
    bgTexture.setAttribute("fill-rule", "evenodd");
    svg.appendChild(bgTexture);

    const fragment = document.createDocumentFragment();

    // 2. Center Mark (Crosshair + Hole)
    const crossSize = 7 * pxPerMm;
    const crossH = document.createElementNS(ns, "line");
    crossH.setAttribute("x1", centerX - crossSize); crossH.setAttribute("y1", centerY);
    crossH.setAttribute("x2", centerX + crossSize); crossH.setAttribute("y2", centerY);
    crossH.setAttribute("stroke", "rgba(0,0,0,0.8)"); crossH.setAttribute("stroke-width", "0.5");
    fragment.appendChild(crossH);

    const crossV = document.createElementNS(ns, "line");
    crossV.setAttribute("x1", centerX); crossV.setAttribute("y1", barTopY);
    crossV.setAttribute("x2", centerX); crossV.setAttribute("y2", barBottomY);
    crossV.setAttribute("stroke", "rgba(0,0,0,0.8)"); crossV.setAttribute("stroke-width", "0.5");
    fragment.appendChild(crossV);

    const hole = document.createElementNS(ns, "circle");
    hole.setAttribute("cx", centerX); hole.setAttribute("cy", centerY);
    hole.setAttribute("r", 1.2 * pxPerMm);
    hole.setAttribute("fill", "white"); hole.setAttribute("fill-opacity", "0.5");
    hole.setAttribute("stroke", "black"); hole.setAttribute("stroke-width", "0.5");
    fragment.appendChild(hole);

    // 3. Degree Scales (Centered at centerY)
    const tickOuterR = outerR - 0.5 * pxPerMm;
    const tickInnerR = cutoutR + 0.5 * pxPerMm;
    const arcTickLengthScale = 0.75;
    
    for (let i = 0; i <= 180; i++) {
      const angleRad = (180 - i) * Math.PI / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      const shouldDrawInnerScale = i > 5 && i < 175;
      
      let lineLen = (i % 10 === 0) ? 8 : (i % 5 === 0 ? 5.5 : 3);
      lineLen *= arcTickLengthScale;
      lineLen *= pxPerMm;

      // Outer Ticks
      const ox1 = centerX + tickOuterR * cos;
      const oy1 = centerY - tickOuterR * sin;
      const ox2 = centerX + (tickOuterR - lineLen) * cos;
      const oy2 = centerY - (tickOuterR - lineLen) * sin;
      
      const oLine = document.createElementNS(ns, "line");
      oLine.setAttribute("x1", ox1); oLine.setAttribute("y1", oy1);
      oLine.setAttribute("x2", ox2); oLine.setAttribute("y2", oy2);
      oLine.setAttribute("stroke", "black"); oLine.setAttribute("stroke-width", "0.5");
      fragment.appendChild(oLine);

      // Inner Ticks
      const ix1 = centerX + tickInnerR * cos;
      const iy1 = centerY - tickInnerR * sin;
      const ix2 = centerX + (tickInnerR + lineLen) * cos;
      const iy2 = centerY - (tickInnerR + lineLen) * sin;

      if (shouldDrawInnerScale) {
        const iLine = document.createElementNS(ns, "line");
        iLine.setAttribute("x1", ix1); iLine.setAttribute("y1", iy1);
        iLine.setAttribute("x2", ix2); iLine.setAttribute("y2", iy2);
        iLine.setAttribute("stroke", "black"); iLine.setAttribute("stroke-width", "0.5");
        fragment.appendChild(iLine);
      }

      // Labels
      if (i % 10 === 0) {
        const tangentRotation = i - 90;
        const outerLabel = 180 - i;
        const innerLabel = i;

        if (i !== 0 && i !== 180) {
          // Outer scale labels
          const labelR1 = tickOuterR - 12 * pxPerMm;
          const lx1 = centerX + labelR1 * cos;
          const ly1 = centerY - labelR1 * sin;
          const t1 = document.createElementNS(ns, "text");
          t1.setAttribute("x", lx1); t1.setAttribute("y", ly1);
          t1.setAttribute("font-size", "11"); t1.setAttribute("text-anchor", "middle"); t1.setAttribute("dominant-baseline", "middle");
          t1.setAttribute("transform", `rotate(${tangentRotation }, ${lx1}, ${ly1})`);
          t1.textContent = outerLabel;
          fragment.appendChild(t1);
        }

        if (shouldDrawInnerScale) {
          // Inner scale labels
          const labelR2 = tickInnerR + 12 * pxPerMm;
          const lx2 = centerX + labelR2 * cos;
          const ly2 = centerY - labelR2 * sin;
          const t2 = document.createElementNS(ns, "text");
          t2.setAttribute("x", lx2); t2.setAttribute("y", ly2);
          t2.setAttribute("font-size", "11"); t2.setAttribute("text-anchor", "middle"); t2.setAttribute("dominant-baseline", "middle");
          t2.setAttribute("transform", `rotate(${tangentRotation}, ${lx2}, ${ly2})`);
          t2.textContent = innerLabel;
          fragment.appendChild(t2);
        }
      }
    }

    // 4. Bottom Rulers
    const rulerWidth = 6 * pxPerInch;
    const rulerStartX = centerX - rulerWidth / 2;
    
    // 6-inch ruler at absolute bottom
    const inchY = barBottomY;
    for (let i = 0; i <= 6 * 16; i++) {
      const x = rulerStartX + i * (pxPerInch / 16);
      const h = (i % 16 === 0) ? 18 : (i % 8 === 0 ? 14 : (i % 4 === 0 ? 10 : 6));
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x); line.setAttribute("y1", inchY);
      line.setAttribute("x2", x); line.setAttribute("y2", inchY - h * pxPerMm / 4);
      line.setAttribute("stroke", "black"); line.setAttribute("stroke-width", "0.5");
      fragment.appendChild(line);

      if (i % 16 === 0) {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("x", x + 1); t.setAttribute("y", inchY - 4);
        t.setAttribute("font-size", "11");
        t.textContent = i / 16;
        fragment.appendChild(t);
      }
    }

    // 10cm ruler at top edge of the base bar, centered
    const cmY = barTopY;
    const cmStartX = centerX - 50 * pxPerMm; // 50mm each side = 100mm total
    for (let i = 0; i <= 100; i++) {
      const x = cmStartX + i * pxPerMm;
      const h = (i % 10 === 0) ? 18 : (i % 5 === 0 ? 14 : 10);
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", x); line.setAttribute("y1", cmY);
      line.setAttribute("x2", x); line.setAttribute("y2", cmY + h * pxPerMm / 4);
      line.setAttribute("stroke", "black"); line.setAttribute("stroke-width", "0.5");
      fragment.appendChild(line);

      if (i % 10 === 0) {
        const t = document.createElementNS(ns, "text");
        t.setAttribute("x", x + 1);
        t.setAttribute("y", cmY + h * pxPerMm / 4 - 2);
        t.setAttribute("font-size", "11");
        t.textContent = i / 10;
        fragment.appendChild(t);
      }
    }

    svg.appendChild(fragment);
  }
};
