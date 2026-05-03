SharedLogic.initI18n();

const state = { ppi: 96, zeroOffset: 0 };
const zSlider = document.getElementById('zeroOffsetSlider');
const zVal = document.getElementById('zeroOffsetVal');

SharedLogic.bindState(state, () => {
  document.getElementById('ppiStatus').innerText = chrome.i18n.getMessage('currentPpi', [Math.round(state.ppi)]);
  zSlider.value = state.zeroOffset;
  zVal.innerText = state.zeroOffset;
});

document.getElementById('openRuler').onclick = () => chrome.windows.create({ url: 'ruler.html', type: 'popup', width: 800, height: 200 });
document.getElementById('openCalibration').onclick = () => chrome.tabs.create({ url: 'ruler.html?calibrate=true' });
document.getElementById('addOverlayRuler').onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['js/shared.js', 'js/overlay.js'] });
    } catch (e) {
      alert(chrome.i18n.getMessage('unsupportedPage'));
    }
  }
};

zSlider.oninput = (e) => {
  zVal.innerText = e.target.value;
  chrome.storage.local.set({ zeroOffset: parseFloat(e.target.value) });
};

document.getElementById('resetZero').onclick = () => {
  zSlider.value = 0;
  zVal.innerText = 0;
  chrome.storage.local.set({ zeroOffset: 0 });
};
