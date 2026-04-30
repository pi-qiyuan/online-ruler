let ppi = 96;
let unit = 'cm'; // 'cm' or 'in'
let isVertical = false;
let zeroOffset = 0; // mm

const svg = document.getElementById('rulerSvg');
const modal = document.getElementById('calibrationModal');
const ppiSlider = document.getElementById('ppiSlider');
const calibrationBox = document.getElementById('calibrationBox');
const currentPpiText = document.getElementById('currentPpi');
const unitSelect = document.getElementById('unitSelect');

function initI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const arg = el.getAttribute('data-i18n-arg');
    const message = chrome.i18n.getMessage(key, arg !== null ? [arg] : []);
    if (message) el.innerText = message;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const message = chrome.i18n.getMessage(key);
    if (message) el.title = message;
  });
}

initI18n();

// 初始化
chrome.storage.local.get(['ppi', 'unit', 'zeroOffset'], (result) => {
  if (result.ppi) {
    ppi = result.ppi;
    ppiSlider.value = ppi;
  }
  if (result.unit) {
    unit = result.unit;
    unitSelect.value = unit;
  }
  if (result.zeroOffset !== undefined) {
    zeroOffset = result.zeroOffset;
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('calibrate') === 'true') {
    modal.classList.remove('hidden');
    updateCalibrationBox();
  }
  
  drawRuler();
});

// 监听存储变化，实现多窗口同步
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.ppi) {
      ppi = changes.ppi.newValue;
      ppiSlider.value = ppi;
    }
    if (changes.unit) {
      unit = changes.unit.newValue;
      unitSelect.value = unit;
    }
    if (changes.zeroOffset !== undefined) {
      zeroOffset = changes.zeroOffset.newValue;
    }
    drawRuler();
  }
});

function drawRuler() {
  const container = document.getElementById('rulerContainer');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const rulerLength = isVertical ? height : width;
  svg.innerHTML = '';
  
  const pixelsPerMm = ppi / 25.4;
  const offsetPx = zeroOffset * pixelsPerMm;

  if (unit === 'cm') {
    // 计算起始刻度，确保偏移时刻度不断掉
    const startMm = -Math.ceil(Math.max(0, -zeroOffset));
    const totalMm = rulerLength / pixelsPerMm;

    for (let i = startMm; ; i++) {
      const pos = i * pixelsPerMm + offsetPx;
      if (pos > rulerLength) break;
      if (pos < 0) continue; 

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
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      if (i % 10 === 0) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        if (!isVertical) {
          text.setAttribute("x", pos + 2); text.setAttribute("y", 38);
        } else {
          text.setAttribute("x", 30); text.setAttribute("y", pos + 5);
        }
        text.setAttribute("font-size", "11");
        text.setAttribute("font-family", "sans-serif");
        text.textContent = i / 10;
        svg.appendChild(text);
      }
    }
  } else {
    const pixelsPerInch = ppi;
    const startStep = -Math.ceil(Math.max(0, -(zeroOffset / 25.4) * 16));
    const totalSteps = (rulerLength / pixelsPerInch) * 16;

    for (let i = startStep; ; i++) {
      const pos = i * (pixelsPerInch / 16) + offsetPx;
      if (pos > rulerLength) break;
      if (pos < 0) continue;

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
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      if (i % 16 === 0) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        if (!isVertical) {
          text.setAttribute("x", pos + 2); text.setAttribute("y", 38);
        } else {
          text.setAttribute("x", 30); text.setAttribute("y", pos + 5);
        }
        text.setAttribute("font-size", "11");
        text.setAttribute("font-family", "sans-serif");
        text.textContent = i / 16;
        svg.appendChild(text);
      }
    }
  }
}

// 校准逻辑
function updateCalibrationBox() {
  const selected = document.getElementById('refObject').selectedOptions[0];
  const wMm = parseFloat(selected.dataset.w);
  const hMm = parseFloat(selected.dataset.h);
  const currentPpi = ppiSlider.value;
  
  const wPx = (wMm / 25.4) * currentPpi;
  const hPx = (hMm / 25.4) * currentPpi;
  
  calibrationBox.style.width = wPx + 'px';
  calibrationBox.style.height = hPx + 'px';
  currentPpiText.innerText = currentPpi;
}

ppiSlider.addEventListener('input', updateCalibrationBox);
document.getElementById('refObject').addEventListener('change', updateCalibrationBox);

document.getElementById('ppiMinus').addEventListener('click', () => {
  ppiSlider.value = parseInt(ppiSlider.value) - 1;
  updateCalibrationBox();
});

document.getElementById('ppiPlus').addEventListener('click', () => {
  ppiSlider.value = parseInt(ppiSlider.value) + 1;
  updateCalibrationBox();
});

document.getElementById('saveCalibration').addEventListener('click', () => {
  ppi = parseInt(ppiSlider.value);
  chrome.storage.local.set({ ppi: ppi }, () => {
    modal.classList.add('hidden');
    drawRuler();
  });
});

document.getElementById('closeModal').addEventListener('click', () => {
    modal.classList.add('hidden');
});

document.getElementById('settingsBtn').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'ruler.html?calibrate=true'
  });
});

unitSelect.addEventListener('change', (e) => {
  unit = e.target.value;
  chrome.storage.local.set({ unit: unit });
  drawRuler();
});

document.getElementById('toggleDir').addEventListener('click', () => {
  isVertical = !isVertical;
  document.getElementById('rulerContainer').className = isVertical ? 'vertical' : 'horizontal';
  drawRuler();
});

window.addEventListener('resize', drawRuler);
