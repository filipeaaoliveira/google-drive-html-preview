import { createSettings } from '../lib/settings.js';

const settings = createSettings(chrome.storage.local);
const checkbox = document.getElementById('enabled');

checkbox.checked = await settings.isEnabled();

checkbox.addEventListener('change', () => {
  settings.setEnabled(checkbox.checked);
});
