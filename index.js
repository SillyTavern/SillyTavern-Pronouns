import { injectUI, registerEventListeners, refreshPronounInputs } from './src/ui.js';
import { ensureSettings } from './src/pronouns.js';
import { applyMacroSettings, registerPreProcessors } from './src/macros.js';
import { registerSlashCommands } from './src/slash-commands.js';

export const EXTENSION_KEY = 'sillytavern-pronouns';
export const EXTENSION_NAME = 'SillyTavern-Pronouns';

let initCalled = false;
export let initialized = false;

/**
 * Extension initialization — called via the 'activate' lifecycle hook.
 */
export async function init() {
    if (initCalled) return;
    initCalled = true;

    console.debug(`[${EXTENSION_NAME}] Initializing...`);

    const version = SillyTavern.getContext().getExtensionManifest?.(EXTENSION_NAME)?.version ?? null;
    ensureSettings(version);

    await injectUI();
    registerEventListeners();

    registerPreProcessors();
    applyMacroSettings();
    refreshPronounInputs();

    registerSlashCommands();

    initialized = true;
    console.debug(`[${EXTENSION_NAME}] Initialized.`);
}
