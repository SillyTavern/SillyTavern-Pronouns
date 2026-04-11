/**
 * UI injection and event handling for the Pronouns extension.
 * Manages the persona pronoun editor and the extension settings panel.
 */

import { eventSource, event_types, saveSettingsDebounced } from '../../../../../script.js';
import { t } from '../../../../../scripts/i18n.js';
import { renderExtensionTemplateAsync } from '../../../../extensions.js';
import { EXTENSION_NAME } from '../index.js';
import {
    getCurrentPersonaId,
    getCurrentPronounValues,
    ensurePersonaContainer,
    pronounPresets,
    pronounsSettings,
    saveSetting,
    settingKeys,
} from './pronouns.js';
import { getMacroManager } from './macros.js';
import { openPronounReplacePopup } from './replacer.js';

let uiInjected = false;
let isUpdating = false;
let lastPersonaId = /** @type {string|null} */ (null);

// ---------------------------------------------------------------------------
// Pronoun input UI
// ---------------------------------------------------------------------------

/**
 * Updates all pronoun input fields from the current persona's stored values.
 */
export function refreshPronounInputs() {
    if (!uiInjected) return;

    const personaId = getCurrentPersonaId();
    if (lastPersonaId !== personaId) lastPersonaId = personaId;

    const pronouns = getCurrentPronounValues();

    isUpdating = true;
    $('#pronoun_subjective').val(pronouns.subjective);
    $('#pronoun_objective').val(pronouns.objective);
    $('#pronoun_pos_det').val(pronouns.posDet);
    $('#pronoun_pos_pro').val(pronouns.posPro);
    $('#pronoun_reflexive').val(pronouns.reflexive);
    isUpdating = false;

    updatePronounTooltips();
}

/**
 * Updates the info icon titles on each field with the currently registered macros.
 */
export function updatePronounTooltips() {
    const manager = getMacroManager();
    const byType = manager.getRegisteredByType();

    /** @param {string} inputId @param {string} typeName @param {string[]} macroNames */
    function setTitle(inputId, typeName, macroNames) {
        const infoEl = $(`#${inputId}`).parent().find('.fa-solid.fa-circle-info');
        if (!infoEl || infoEl.length === 0) return;
        const macroList = macroNames.map(name => `  {{${name}}}`).join('\n');
        const capitalizedTypeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
        infoEl.attr('title', t`${capitalizedTypeName} pronoun macros` + '\n' + macroList);
    }

    setTitle('pronoun_subjective', 'subjective', byType.subjective);
    setTitle('pronoun_objective', 'objective', byType.objective);
    setTitle('pronoun_pos_det', 'possessive determiner', byType.posDet);
    setTitle('pronoun_pos_pro', 'possessive pronoun', byType.posPro);
    setTitle('pronoun_reflexive', 'reflexive pronoun', byType.reflexive);
}

function onPronounInput() {
    if (isUpdating) return;

    const descriptor = ensurePersonaContainer();
    if (!descriptor) return;

    descriptor.pronoun.subjective = String($('#pronoun_subjective').val() ?? '');
    descriptor.pronoun.objective = String($('#pronoun_objective').val() ?? '');
    descriptor.pronoun.posDet = String($('#pronoun_pos_det').val() ?? '');
    descriptor.pronoun.posPro = String($('#pronoun_pos_pro').val() ?? '');
    descriptor.pronoun.reflexive = String($('#pronoun_reflexive').val() ?? '');

    saveSettingsDebounced();
}

function onPronounPresetClick(event) {
    const presetKey = $(event.currentTarget).data('preset');
    const preset = pronounPresets[presetKey];
    if (!preset) return;

    isUpdating = true;
    $('#pronoun_subjective').val(preset.subjective);
    $('#pronoun_objective').val(preset.objective);
    $('#pronoun_pos_det').val(preset.posDet);
    $('#pronoun_pos_pro').val(preset.posPro);
    $('#pronoun_reflexive').val(preset.reflexive);
    isUpdating = false;

    onPronounInput();
}

// ---------------------------------------------------------------------------
// Settings UI
// ---------------------------------------------------------------------------

function onShorthandsToggleChange(event) {
    const enabled = $(event.currentTarget).is(':checked');
    saveSetting(settingKeys.ENABLE_SHORTHANDS, enabled);
    getMacroManager().shorthands.set(enabled);
    updatePronounTooltips();
}

function onJanitorToggleChange(event) {
    const enabled = $(event.currentTarget).is(':checked');
    saveSetting(settingKeys.ENABLE_JANITOR_SHORTHANDS, enabled);
    getMacroManager().janitorAliases.set(enabled);
    updatePronounTooltips();
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * Injects the persona pronoun editor below the persona description field.
 */
async function injectPersonaPronounUI() {
    if (uiInjected || document.getElementById('pronoun_extension')) return;

    const target = $('#persona_description');
    const html = await renderExtensionTemplateAsync(`third-party/${EXTENSION_NAME}`, 'templates/persona-pronouns');
    target.after(html);
}

/**
 * Injects the extension settings block into the extensions settings panel.
 */
async function injectSettingsUI() {
    if (uiInjected || document.getElementById('extension_settings_pronouns')) return;

    // Prefer the column with fewer children to keep balance
    const col2 = document.getElementById('extensions_settings2');
    const col1 = document.getElementById('extensions_settings');
    const parent = col2 && col1
        ? (col2.children.length > col1.children.length ? col1 : col2)
        : (col2 || col1);

    const html = await renderExtensionTemplateAsync(`third-party/${EXTENSION_NAME}`, 'templates/settings');
    const template = document.createElement('template');
    template.innerHTML = html;
    parent.appendChild(template.content);

    // Wire up toggles
    $('#pronouns_enable_shorthands')
        .prop('checked', pronounsSettings.shorthands)
        .on('change', onShorthandsToggleChange);

    $('#pronouns_enable_janitor_shorthands')
        .prop('checked', pronounsSettings.janitorShorthands)
        .on('change', onJanitorToggleChange);
}

/**
 * Injects all UI components and marks injection as done.
 */
export async function injectUI() {
    if (uiInjected) return;
    await injectPersonaPronounUI();
    await injectSettingsUI();
    uiInjected = true;
}

/**
 * Registers all document-level event listeners.
 */
export function registerEventListeners() {
    $(document).on('click', '#pronoun_extension [data-preset]', onPronounPresetClick);
    $(document).on('input', '#pronoun_extension input', onPronounInput);

    $(document).on('click', '#user_avatar_block .avatar-container', () => {
        setTimeout(refreshPronounInputs, 0);
    });
    eventSource.on(event_types.CHAT_CHANGED, () => setTimeout(refreshPronounInputs, 0));

    $(document).on('click', '#pronouns_open_replacer', () => openPronounReplacePopup());
}
