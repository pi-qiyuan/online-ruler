var SharedLogic = SharedLogic || {};

SharedLogic.getPhysicalPpi = function(result) {
  if (result.ppi) return result.ppi;
  if (result.physicalPpi) return result.physicalPpi;
  return SharedLogic.CONSTANTS.DEFAULT_PPI;
};

SharedLogic.getLocalizedCoinReference = function() {
  const locale = chrome.i18n.getUILanguage().toLowerCase().replace('_', '-');
  const language = locale.split('-')[0];
  return SharedLogic.CONSTANTS.COIN_REFERENCES[language] || SharedLogic.CONSTANTS.COIN_REFERENCES.default;
};

SharedLogic.bindState = function(state, callback) {
  chrome.storage.local.get(['ppi', 'unit', 'zeroOffset', 'physicalPpi', 'angle', 'material'], (result) => {
    state.ppi = SharedLogic.getPhysicalPpi(result);
    state.unit = result.unit || 'cm';
    state.zeroOffset = result.zeroOffset || 0;
    state.angle = result.angle || 0;
    state.material = result.material || 'WOOD';
    callback(true);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    let changed = false;
    if (changes.ppi || changes.physicalPpi) {
      state.ppi = (changes.physicalPpi || changes.ppi).newValue;
      changed = true;
    }
    if (changes.unit) {
      state.unit = changes.unit.newValue;
      changed = true;
    }
    if (changes.zeroOffset !== undefined) {
      state.zeroOffset = changes.zeroOffset.newValue;
      changed = true;
    }
    if (changes.angle !== undefined) {
      state.angle = changes.angle.newValue;
      changed = true;
    }
    if (changes.material) {
      state.material = changes.material.newValue;
      changed = true;
    }
    if (changed) callback(false);
  });
};

SharedLogic.listenToZoom = function(callback) {
  const check = () => {
    let currentDPR = window.devicePixelRatio;
    const mql = window.matchMedia(`(resolution: ${currentDPR}dppx)`);
    mql.addEventListener('change', () => {
      callback();
      check();
    }, { once: true });
  };
  check();
};
