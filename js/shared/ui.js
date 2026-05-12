var SharedLogic = SharedLogic || {};

SharedLogic.UI = {
  /**
   * 设置颜色选择器
   * @param {HTMLElement} container 容器
   * @param {Object} state 状态对象
   * @param {Function} onColorChange 回调
   */
  setupColorSelector: function(container, state, onColorChange) {
    container.className = 'color-selector';
    container.innerHTML = '';

    const colorTrigger = document.createElement('div');
    colorTrigger.className = 'color-trigger';
    container.appendChild(colorTrigger);

    const colorOptionsList = document.createElement('div');
    colorOptionsList.className = 'color-options-list';
    container.appendChild(colorOptionsList);

    const updateUI = () => {
      const item = SharedLogic.COLORS[state.currentColorIdx || 0];
      colorTrigger.innerText = chrome.i18n.getMessage(item.key) || item.key;
      colorTrigger.style.backgroundColor = item.hex;
    };

    SharedLogic.COLORS.forEach((item, idx) => {
      const opt = document.createElement('div');
      opt.className = 'color-opt';
      opt.innerText = chrome.i18n.getMessage(item.key) || item.key;
      opt.style.backgroundColor = item.hex;
      opt.onmousedown = (e) => {
        e.stopPropagation();
        state.currentColorIdx = idx;
        updateUI();
        onColorChange(item);
        colorOptionsList.style.display = 'none';
      };
      colorOptionsList.appendChild(opt);
    });

    colorTrigger.onmousedown = (e) => {
      e.stopPropagation();
      const isVisible = colorOptionsList.style.display === 'flex';
      colorOptionsList.style.display = isVisible ? 'none' : 'flex';
    };

    window.addEventListener('mousedown', () => {
      colorOptionsList.style.display = 'none';
    });

    updateUI();
    return { updateUI };
  }
};
