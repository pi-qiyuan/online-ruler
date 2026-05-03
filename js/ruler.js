let state = { ppi: 96, unit: 'cm', zeroOffset: 0 };
let isVertical = false;

const svg = document.getElementById('rulerSvg');
const modal = document.getElementById('calibrationModal');
const ppiSlider = document.getElementById('ppiSlider');
const calibrationBox = document.getElementById('calibrationBox');
const currentPpiText = document.getElementById('currentPpi');
const unitSelect = document.getElementById('unitSelect');

SharedLogic.initI18n();

function updateDisplay() {
  const container = document.getElementById('rulerContainer');
  SharedLogic.drawRuler(svg, {
    width: container.clientWidth,
    height: container.clientHeight,
    isVertical,
    unit: state.unit,
    physicalPpi: state.ppi,
    zeroOffset: state.zeroOffset
  });
}

SharedLogic.bindState(state, (isInitial) => {
  if (isInitial) {
    ppiSlider.value = Math.round(state.ppi);
    unitSelect.value = state.unit;
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
  Object.assign(calibrationBox.style, { width: wPx + 'px', height: hPx + 'px' });
  currentPpiText.innerText = ppiSlider.value;
}

ppiSlider.oninput = updateCalibrationBox;
document.getElementById('refObject').onchange = updateCalibrationBox;
document.getElementById('ppiMinus').onclick = () => { ppiSlider.value--; updateCalibrationBox(); };
document.getElementById('ppiPlus').onclick = () => { ppiSlider.value++; updateCalibrationBox(); };

document.getElementById('saveCalibration').onclick = () => {
  chrome.storage.local.set({ ppi: parseInt(ppiSlider.value) }, () => modal.classList.add('hidden'));
};

document.getElementById('closeModal').onclick = () => modal.classList.add('hidden');
document.getElementById('settingsBtn').onclick = () => {
  chrome.tabs.create({ url: 'ruler.html?calibrate=true' });
};
unitSelect.onchange = (e) => chrome.storage.local.set({ unit: e.target.value });

document.getElementById('toggleDir').onclick = () => {
  isVertical = !isVertical;
  document.getElementById('rulerContainer').className = isVertical ? 'vertical' : 'horizontal';
  updateDisplay();
};

window.onresize = updateDisplay;
SharedLogic.listenToZoom(updateDisplay);
