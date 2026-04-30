function initI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const arg = el.getAttribute('data-i18n-arg');
    const message = chrome.i18n.getMessage(key, arg !== null ? [arg] : []);
    if (message) el.innerText = message;
  });
}

initI18n();

const zeroOffsetSlider = document.getElementById('zeroOffsetSlider');
const zeroOffsetVal = document.getElementById('zeroOffsetVal');

document.getElementById('openRuler').addEventListener('click', () => {
  chrome.windows.create({
    url: 'ruler.html',
    type: 'popup',
    width: 800,
    height: 200
  });
});

document.getElementById('openCalibration').addEventListener('click', () => {
  chrome.tabs.create({
    url: 'ruler.html?calibrate=true'
  });
});

document.getElementById('addOverlayRuler').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/overlay.js']
      });
    } catch (e) {
      alert(chrome.i18n.getMessage('unsupportedPage'));
    }
  }
});

// 监听零点偏移滑块
zeroOffsetSlider.addEventListener('input', (e) => {
  const val = e.target.value;
  zeroOffsetVal.innerText = val;
  chrome.storage.local.set({ zeroOffset: parseFloat(val) });
});

// 归零按钮
document.getElementById('resetZero').addEventListener('click', () => {
  zeroOffsetSlider.value = 0;
  zeroOffsetVal.innerText = 0;
  chrome.storage.local.set({ zeroOffset: 0 });
});

// 初始化读取
chrome.storage.local.get(['ppi', 'zeroOffset'], (result) => {
  const ppi = result.ppi || 96;
  document.getElementById('ppiStatus').innerText = chrome.i18n.getMessage('currentPpi', [ppi]);
  
  if (result.zeroOffset !== undefined) {
    zeroOffsetSlider.value = result.zeroOffset;
    zeroOffsetVal.innerText = result.zeroOffset;
  }
});