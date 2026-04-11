import { injectUI, registerEventListeners, refreshPronounInputs } from './src/ui.js';
import { ensureSettings } from './src/pronouns.js';
import { applyMacroSettings, registerPreProcessors } from './src/macros.js';
import { registerSlashCommands } from './src/slash-commands.js';
import { event_types, eventSource } from '/script.js';
import { Popup } from '/scripts/popup.js';
import { t } from '/scripts/i18n.js';
import { disableExtension } from '/scripts/extensions.js';

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

    eventSource.on(event_types.APP_INITIALIZED, checkMacroEngine);

    console.debug(`[${EXTENSION_NAME}] Extension activated`);

    initialized = true;
}

// TODO: This function is needed as long as the experimental macro engine can be off
async function checkMacroEngine() {
    const { powerUserSettings, POPUP_RESULT } = SillyTavern.getContext();

    if (powerUserSettings.experimental_macro_engine) {
        return;
    }

    const result = await Popup.show.confirm(
        t`Pronouns - Enable Macro Engine`,
        t`This extension requires the experimental macro engine to be enabled. Would you like to enable it now?`,
        {
            okButton: t`Enable`,
            cancelButton: t`Disable Extension (and reload)`,
        });

    if (result == POPUP_RESULT.AFFIRMATIVE) {
        powerUserSettings.experimental_macro_engine = true;
        $('#experimental_macro_engine').prop('checked', powerUserSettings.experimental_macro_engine).trigger('input');
        location.reload();
    }

    await disableExtension(`third-party/${EXTENSION_NAME}`);
}
