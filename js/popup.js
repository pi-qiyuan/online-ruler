SharedLogic.initI18n();
SharedLogic.Milestones.updateStats('totalOpens');

const state = { ppi: 96, zeroOffset: 0 };
const zSlider = document.getElementById('zeroOffsetSlider');
const zVal = document.getElementById('zeroOffsetVal');

SharedLogic.bindState(state, () => {
  document.getElementById('ppiStatus').innerText = chrome.i18n.getMessage('currentPpi', [Math.round(state.ppi)]);
  zSlider.value = state.zeroOffset;
  zVal.innerText = state.zeroOffset;
});

document.getElementById('openRuler').onclick = () => {
  chrome.windows.create({ url: 'ruler.html', type: 'popup', width: 800, height: 200 });
};

document.getElementById('openCalibration').onclick = () => chrome.tabs.create({ url: 'ruler.html?calibrate=true' });

async function injectOverlay(mode = 'ruler') {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      // 注入 CSS
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['css/overlay.css']
      });
      // 注入 JS
      await chrome.scripting.executeScript({ 
        target: { tabId: tab.id }, 
        files: [
          'js/shared.js',
          'js/shared/constants.js',
          'js/shared/ui.js',
          'js/shared/storage.js',
          'js/shared/i18n.js',
          'js/shared/milestones.js',
          'js/engine.js'
        ] 
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (nextMode) => {
          window.__onlineRulerNextMode = nextMode;
        },
        args: [mode]
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'js/overlay/instance.js',
          'js/overlay/elements.js',
          'js/overlay/layout.js',
          'js/overlay/milestones.js',
          'js/overlay/events.js',
          'js/overlay.js'
        ]
      });

      SharedLogic.Milestones.updateStats('overlayInjections');
    } catch (e) {
      alert(chrome.i18n.getMessage('unsupportedPage'));
    }
  }
}

document.getElementById('addOverlayRuler').onclick = () => injectOverlay('ruler');
document.getElementById('addProtractor').onclick = () => injectOverlay('protractor');

zSlider.onchange = () => {
  SharedLogic.Milestones.updateStats('zeroOffsetChanges');
};

zSlider.oninput = (e) => {
  zVal.innerText = e.target.value;
  chrome.storage.local.set({ zeroOffset: parseFloat(e.target.value) });
};

document.getElementById('resetZero').onclick = () => {
  zSlider.value = 0;
  zVal.innerText = 0;
  chrome.storage.local.set({ zeroOffset: 0 });
  SharedLogic.Milestones.updateStats('zeroOffsetChanges');
};
