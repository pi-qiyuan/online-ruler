let state = { ppi: 96, unit: 'cm', zeroOffset: 0, material: 'WOOD' };
let isVertical = false;

const svg = document.getElementById('rulerSvg');
const modal = document.getElementById('calibrationModal');
const ppiSlider = document.getElementById('ppiSlider');
const calibrationBox = document.getElementById('calibrationBox');
const currentPpiText = document.getElementById('currentPpi');
const unitSelect = document.getElementById('unitSelect');
const materialSelect = document.getElementById('materialSelect');
const customColorSelectorContainer = document.getElementById('customColorSelector');

SharedLogic.initI18n();

// 加载材质库
MeasurementEngine.loadMaterials();

// --- 自定义颜色选择器逻辑 ---
let currentColorIdx = 0;

SharedLogic.UI.setupColorSelector(customColorSelectorContainer, {
  get currentColorIdx() { return currentColorIdx; },
  set currentColorIdx(v) { currentColorIdx = v; }
}, (item) => {
  updateDisplay();
});

// --- End 自定义选择器 ---

function updateDisplay() {
  const container = document.getElementById('rulerContainer');
  MeasurementEngine.drawRuler(svg, {
    width: container.clientWidth,
    height: container.clientHeight,
    isVertical,
    unit: state.unit,
    physicalPpi: state.ppi,
    zeroOffset: state.zeroOffset,
    material: state.material,
    color: state.material === 'PLASTIC' ? SharedLogic.COLORS[currentColorIdx].val : null
  });
  customColorSelectorContainer.style.display = state.material === 'PLASTIC' ? 'block' : 'none';
}

SharedLogic.bindState(state, (init) => {
  if (init) {
    ppiSlider.value = Math.round(state.ppi);
    unitSelect.value = state.unit;
    materialSelect.value = state.material;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('calibrate') === 'true') {
      modal.classList.remove('hidden');
      updateCalibrationBox();
    }
  }
  updateDisplay();
});

function updateCalibrationBox() {
  const selected = document.getElementById('refObject').selectedOptions[0];
  if (!selected) return;
  const wPx = (parseFloat(selected.dataset.w) / SharedLogic.CONSTANTS.MM_PER_INCH) * ppiSlider.value;
  const hPx = (parseFloat(selected.dataset.h) / SharedLogic.CONSTANTS.MM_PER_INCH) * ppiSlider.value;
  calibrationBox.style.width = wPx + 'px';
  calibrationBox.style.height = hPx + 'px';
  currentPpiText.innerText = ppiSlider.value;
}

ppiSlider.oninput = updateCalibrationBox;
document.getElementById('refObject').onchange = updateCalibrationBox;
document.getElementById('ppiMinus').onclick = () => { ppiSlider.value--; updateCalibrationBox(); };
document.getElementById('ppiPlus').onclick = () => { ppiSlider.value++; updateCalibrationBox(); };

document.getElementById('saveCalibration').onclick = () => {
  chrome.storage.local.set({ ppi: parseInt(ppiSlider.value) }, () => {
    modal.classList.add('hidden');
    SharedLogic.Milestones.updateStats('calibrationSaves');
  });
};

document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
document.getElementById('settingsBtn').onclick = () => {
  chrome.tabs.create({ url: 'ruler.html?calibrate=true' });
};

unitSelect.onchange = (e) => {
  chrome.storage.local.set({ unit: e.target.value });
  SharedLogic.Milestones.updateStats('unitSwitches');
};

materialSelect.onchange = (e) => {
  state.material = e.target.value;
  updateDisplay();
  chrome.storage.local.set({ material: e.target.value });
};

document.getElementById('toggleDir').onclick = () => {
  isVertical = !isVertical;
  document.getElementById('rulerContainer').className = isVertical ? 'vertical' : 'horizontal';
  updateDisplay();
};

window.onresize = updateDisplay;
SharedLogic.listenToZoom(updateDisplay);
