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
  }
};
