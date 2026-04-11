/**
 * Core pronoun data, persona state management, and settings for the Pronouns extension.
 */

import { saveSettingsDebounced, user_avatar } from '../../../../../script.js';
import { power_user } from '../../../../../scripts/power-user.js';
import { extension_settings } from '../../../../extensions.js';
import { EXTENSION_KEY } from '../index.js';

/**
 * @typedef {Object} Pronouns
 * @property {string} subjective - Subjective pronoun (she/he/they)
 * @property {string} objective - Objective pronoun (her/him/them)
 * @property {string} posDet - Possessive determiner (her/his/their)
 * @property {string} posPro - Possessive pronoun (hers/his/theirs)
 * @property {string} reflexive - Reflexive pronoun (herself/himself/themselves)
 */

/** @type {Pronouns} */
export const defaultPronoun = Object.freeze({
    subjective: '',
    objective: '',
    posDet: '',
    posPro: '',
    reflexive: '',
});

/** @type {{[presetName: string]: Pronouns}} */
export const pronounPresets = {
    she: { subjective: 'she', objective: 'her', posDet: 'her', posPro: 'hers', reflexive: 'herself' },
    he: { subjective: 'he', objective: 'him', posDet: 'his', posPro: 'his', reflexive: 'himself' },
    they: { subjective: 'they', objective: 'them', posDet: 'their', posPro: 'theirs', reflexive: 'themselves' },
    it: { subjective: 'it', objective: 'it', posDet: 'its', posPro: 'its', reflexive: 'itself' },
};

/** @typedef {{ pronounKey: 'subjective'|'objective'|'posDet'|'posPro'|'reflexive'; names: string[] }} PronounShorthandAlias */

/** WyvernChat-style shorthands (she/her/his_ etc.) */
/** @type {ReadonlyArray<PronounShorthandAlias>} */
export const wyvernShorthandAliases = Object.freeze([
    { pronounKey: 'subjective', names: ['she', 'he', 'they'] },
    { pronounKey: 'objective', names: ['her', 'him', 'them'] },
    { pronounKey: 'posDet', names: ['her_', 'his_', 'their_'] },
    { pronounKey: 'posPro', names: ['hers', 'his', 'theirs'] },
    { pronounKey: 'reflexive', names: ['herself', 'himself', 'themself'] },
]);

/** JanitorAI-style shorthands (sub/obj/poss etc.) */
/** @type {ReadonlyArray<PronounShorthandAlias>} */
export const janitorShorthandAliases = Object.freeze([
    { pronounKey: 'subjective', names: ['sub'] },
    { pronounKey: 'objective', names: ['obj'] },
    { pronounKey: 'posDet', names: ['poss'] },
    { pronounKey: 'posPro', names: ['poss_p'] },
    { pronounKey: 'reflexive', names: ['ref'] },
]);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const settingKeys = Object.freeze({
    ENABLE_WYVERN_SHORTHANDS: 'enableWyvernShorthands',
    ENABLE_JANITOR_SHORTHANDS: 'enableJanitorShorthands',
});

const defaultSettings = Object.freeze({
    [settingKeys.ENABLE_WYVERN_SHORTHANDS]: false,
    [settingKeys.ENABLE_JANITOR_SHORTHANDS]: false,
});

/**
 * Migrates settings from v1 to v2 if needed.
 * - v1 had a single `enablePersonaShorthands` key which mapped to WyvernChat shorthands.
 * @param {Record<string, unknown>} settings
 */
function migrateSettings(settings) {
    if ('enablePersonaShorthands' in settings && !(settingKeys.ENABLE_WYVERN_SHORTHANDS in settings)) {
        settings[settingKeys.ENABLE_WYVERN_SHORTHANDS] = settings['enablePersonaShorthands'];
        delete settings['enablePersonaShorthands'];
    }
}

/**
 * Ensures extension settings exist with defaults, running any needed migrations.
 * @returns {Record<string, unknown>}
 */
export function ensureSettings() {
    extension_settings[EXTENSION_KEY] = extension_settings[EXTENSION_KEY] || {};
    const settings = extension_settings[EXTENSION_KEY];
    migrateSettings(settings);
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!(key in settings)) settings[key] = value;
    }
    return settings;
}

export const pronounsSettings = {
    get wyvernShorthands() {
        return Boolean(ensureSettings()[settingKeys.ENABLE_WYVERN_SHORTHANDS]);
    },
    get janitorShorthands() {
        return Boolean(ensureSettings()[settingKeys.ENABLE_JANITOR_SHORTHANDS]);
    },
};

/**
 * Persists a setting value and triggers a settings save.
 * @param {string} key
 * @param {unknown} value
 */
export function saveSetting(key, value) {
    ensureSettings()[key] = value;
    saveSettingsDebounced();
}

// ---------------------------------------------------------------------------
// Persona pronoun data access
// ---------------------------------------------------------------------------

/**
 * Gets the current persona ID.
 * @returns {string}
 */
export function getCurrentPersonaId() {
    return user_avatar || '';
}

/**
 * Ensures the persona descriptor exists and has a pronoun object.
 * @returns {{ pronoun: Pronouns } | null}
 */
export function ensurePersonaContainer() {
    power_user.persona_descriptions = power_user.persona_descriptions || {};
    const personaId = getCurrentPersonaId();
    if (!personaId) return null;

    if (!power_user.persona_descriptions[personaId]) {
        power_user.persona_descriptions[personaId] = {};
    }

    const descriptor = power_user.persona_descriptions[personaId];
    if (!descriptor.pronoun) {
        descriptor.pronoun = { ...defaultPronoun };
    } else {
        descriptor.pronoun = {
            subjective: descriptor.pronoun.subjective ?? '',
            objective: descriptor.pronoun.objective ?? '',
            posDet: descriptor.pronoun.posDet ?? '',
            posPro: descriptor.pronoun.posPro ?? '',
            reflexive: descriptor.pronoun.reflexive ?? '',
        };
    }

    return descriptor;
}

/**
 * Gets the current persona's pronoun values.
 * @returns {Pronouns}
 */
export function getCurrentPronounValues() {
    const personaId = getCurrentPersonaId();
    if (!personaId) return { ...defaultPronoun };

    const descriptor = power_user.persona_descriptions?.[personaId];
    const pronoun = descriptor?.pronoun;
    return {
        subjective: pronoun?.subjective ?? '',
        objective: pronoun?.objective ?? '',
        posDet: pronoun?.posDet ?? '',
        posPro: pronoun?.posPro ?? '',
        reflexive: pronoun?.reflexive ?? '',
    };
}

/**
 * Sets all pronoun fields for the current persona and persists.
 * @param {Pronouns} values
 * @returns {Pronouns}
 */
export function setCurrentPronounValues(values) {
    const descriptor = ensurePersonaContainer();
    if (!descriptor) return { ...defaultPronoun };
    descriptor.pronoun.subjective = String(values?.subjective ?? '');
    descriptor.pronoun.objective = String(values?.objective ?? '');
    descriptor.pronoun.posDet = String(values?.posDet ?? '');
    descriptor.pronoun.posPro = String(values?.posPro ?? '');
    descriptor.pronoun.reflexive = String(values?.reflexive ?? '');
    saveSettingsDebounced();
    return getCurrentPronounValues();
}

/**
 * Sets a single pronoun field for the current persona and persists.
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
export function setCurrentPronounValue(key, value) {
    const descriptor = ensurePersonaContainer();
    if (!descriptor) return '';
    if (key in descriptor.pronoun) {
        descriptor.pronoun[key] = String(value ?? '');
        saveSettingsDebounced();
        return String(value ?? '');
    }
    return '';
}

/**
 * Applies a preset to the current persona.
 * @param {keyof typeof pronounPresets} presetKey
 * @returns {Pronouns}
 */
export function applyPronounPreset(presetKey) {
    const preset = pronounPresets[presetKey];
    if (!preset) return getCurrentPronounValues();
    return setCurrentPronounValues(preset);
}
