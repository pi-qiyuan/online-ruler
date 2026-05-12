var SharedLogic = SharedLogic || {};

SharedLogic.initI18n = function() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const args = el.getAttribute('data-i18n-arg') ? [el.getAttribute('data-i18n-arg')] : [];
    const message = chrome.i18n.getMessage(el.getAttribute('data-i18n'), args);
    if (message) el.innerText = message;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const message = chrome.i18n.getMessage(el.getAttribute('data-i18n-title'));
    if (message) el.title = message;
  });
};
