/**
 * Macro registration and management for the Pronouns extension.
 *
 * Macro naming convention:
 *  - Primary (always on):  {{pronounSubjective}}, {{pronounObjective}},
 *                          {{pronounPosDet}}, {{pronounPosPro}}, {{pronounReflexive}},
 *                          {{pronounVerbBe}} ("is"/"are")
 *    Dot-notation aliases ({{pronoun.subjective}} etc.) are rewritten to these via a pre-processor.
 *  - Shorthand aliases (opt-in toggle): {{she}}/{{he}}/{{they}}, {{her}}/{{him}}/{{them}},
 *                          {{her_}}/{{his_}}/{{their_}}, {{hers}}/{{his}}/{{theirs}},
 *                          {{herself}}/{{himself}}/{{themself}}
 *  - WyvernChat compat (opt-in toggle): {{pronounSubjectiveCap}}, {{pronounObjectiveCap}}, etc.
 *  - JanitorAI compat (opt-in toggle): {{sub}}, {{obj}}, {{pos}}, {{poss_p}}, {{ref}}
 */

import { macros } from '../../../../../scripts/macros/macro-system.js';
import { t } from '../../../../../scripts/i18n.js';
import { getCurrentPronounValues, shorthandAliases, wyvernCapMacros, janitorShorthandAliases, pronounsSettings } from './pronouns.js';

/**
 * Rewrites WyvernChat dot-notation pronoun placeholders to our camelCase macro names.
 * This runs as a pre-processor so the macros engine sees the canonical names.
 * e.g. {{pronoun.subjective}} => {{pronounSubjective}}
 *
 * @param {string} text
 * @returns {string}
 */
function rewriteDotNotation(text) {
    return text
        .replace(/{{pronoun\.subjective}}/gi, '{{pronounSubjective}}')
        .replace(/{{pronoun\.objective}}/gi, '{{pronounObjective}}')
        .replace(/{{pronoun\.pos_det}}/gi, '{{pronounPosDet}}')
        .replace(/{{pronoun\.pos_pro}}/gi, '{{pronounPosPro}}')
        .replace(/{{pronoun\.reflexive}}/gi, '{{pronounReflexive}}');
}

/**
 * Registers the dot-notation pre-processor. Called once during init.
 */
export function registerPreProcessors() {
    macros.engine.addPreProcessor(rewriteDotNotation, { priority: 45, source: 'extension:sillytavern-pronouns' });
}

/**
 * Derives the verb-be form ("is"/"are") from the current subjective pronoun.
 * Matches common English plural/they-form pronouns; everything else gets "is".
 * Non-English custom pronouns: users can still benefit if their language uses the same logic,
 * but this is inherently English-centric.
 * @returns {string}
 */
function getVerbBe() {
    const subjective = getCurrentPronounValues().subjective.toLowerCase().trim();
    if (!subjective) return '';
    // Plural/they-form pronouns use "are"; singular use "is"
    const areForms = new Set(['they', 'we', 'you', 'they/them']);
    return areForms.has(subjective) ? 'are' : 'is';
}

/**
 * @typedef {Object} PronounMacroManager
 * @property {() => string[]} getRegistered
 * @property {() => { subjective: string[]; objective: string[]; posDet: string[]; posPro: string[]; reflexive: string[]; verbBe: string[] }} getRegisteredByType
 * @property {{ toggle: () => void, set: (enabled: boolean) => void, enable: () => void, disable: () => void }} shorthands
 * @property {{ toggle: () => void, set: (enabled: boolean) => void, enable: () => void, disable: () => void }} wyvernCompat
 * @property {{ toggle: () => void, set: (enabled: boolean) => void, enable: () => void, disable: () => void }} janitorAliases
 */

/** @type {PronounMacroManager | null} */
let manager = null;

/**
 * Returns the singleton macro manager, creating it if needed.
 * @returns {PronounMacroManager}
 */
export function getMacroManager() {
    if (!manager) manager = createPronounMacroManager();
    return manager;
}

/**
 * Creates the pronoun macro manager.
 * Registers primary macros immediately; alias groups are toggled separately.
 * @returns {PronounMacroManager}
 */
function createPronounMacroManager() {
    const descriptions = {
        subjective: t`Subjective pronoun (she/he/they)`,
        objective: t`Objective pronoun (her/him/them)`,
        posDet: t`Possessive determiner (her/his/their)`,
        posPro: t`Possessive pronoun (hers/his/theirs)`,
        reflexive: t`Reflexive pronoun (herself/himself/themselves)`,
        verbBe: t`Verb-be agreement derived from the subjective pronoun ("is" for singular, "are" for plural/they)`,
    };

    const valueGetters = {
        subjective: () => getCurrentPronounValues().subjective,
        objective: () => getCurrentPronounValues().objective,
        posDet: () => getCurrentPronounValues().posDet,
        posPro: () => getCurrentPronounValues().posPro,
        reflexive: () => getCurrentPronounValues().reflexive,
        verbBe: getVerbBe,
    };

    /** @type {Map<'subjective'|'objective'|'posDet'|'posPro'|'reflexive'|'verbBe', Set<string>>} */
    const macrosByType = new Map([
        ['subjective', new Set()],
        ['objective', new Set()],
        ['posDet', new Set()],
        ['posPro', new Set()],
        ['reflexive', new Set()],
        ['verbBe', new Set()],
    ]);

    /** @type {Set<string>} */
    const shorthandRegistered = new Set();
    /** @type {Set<string>} */
    const wyvernCompatRegistered = new Set();
    /** @type {Set<string>} */
    const janitorRegistered = new Set();

    // --- Primary macros (always registered) ---
    // Names match WyvernChat's pronoun placeholder names exactly (camelCase).
    /** @type {Array<{name: string, pronounKey: keyof typeof valueGetters}>} */
    const primaryMacros = [
        { name: 'pronounSubjective', pronounKey: 'subjective' },
        { name: 'pronounObjective', pronounKey: 'objective' },
        { name: 'pronounPosDet', pronounKey: 'posDet' },
        { name: 'pronounPosPro', pronounKey: 'posPro' },
        { name: 'pronounReflexive', pronounKey: 'reflexive' },
        { name: 'pronounVerbBe', pronounKey: 'verbBe' },
    ];

    for (const { name, pronounKey } of primaryMacros) {
        if (macros.registry.hasMacro(name)) continue;
        macros.registry.registerMacro(name, {
            category: 'pronouns',
            description: descriptions[pronounKey],
            handler: valueGetters[pronounKey],
        });
        macrosByType.get(pronounKey).add(name);
    }

    // --- Alias group helpers ---

    /**
     * Registers a set of alias macros from a shorthand alias list.
     * @param {ReadonlyArray<import('./pronouns.js').PronounShorthandAlias>} aliasList
     * @param {Set<string>} registeredSet - Tracks which names were registered by this group
     */
    function enableAliasGroup(aliasList, registeredSet) {
        for (const { names, pronounKey } of aliasList) {
            const getter = valueGetters[pronounKey];
            const description = descriptions[pronounKey];
            if (!getter || !description) continue;
            for (const name of names) {
                if (macros.registry.hasMacro(name)) continue;
                macros.registry.registerMacro(name, {
                    category: 'legacy',
                    description: description,
                    handler: getter,
                });
                macrosByType.get(pronounKey).add(name);
                registeredSet.add(name);
            }
        }
    }

    /**
     * Registers the WyvernChat capitalized macro variants.
     * These return the primary value with the first letter uppercased.
     * @param {Set<string>} registeredSet
     */
    function enableWyvernCompatGroup(registeredSet) {
        for (const { pronounKey, name } of wyvernCapMacros) {
            if (macros.registry.hasMacro(name)) continue;
            const getter = valueGetters[pronounKey];
            macros.registry.registerMacro(name, {
                category: 'legacy',
                description: descriptions[pronounKey],
                handler: () => {
                    const v = getter();
                    return v ? v.charAt(0).toUpperCase() + v.slice(1) : '';
                },
            });
            macrosByType.get(pronounKey).add(name);
            registeredSet.add(name);
        }
    }

    /**
     * Unregisters all macros in a registered set.
     * @param {Set<string>} registeredSet
     */
    function disableAliasGroup(registeredSet) {
        for (const name of registeredSet) {
            macros.registry.unregisterMacro(name);
            for (const typeSet of macrosByType.values()) {
                typeSet.delete(name);
            }
        }
        registeredSet.clear();
    }

    /** @param {Set<string>} registeredSet @param {ReadonlyArray<import('./pronouns.js').PronounShorthandAlias>} aliasList @param {boolean} enabled */
    function setAliasGroup(registeredSet, aliasList, enabled) {
        if (enabled) {
            enableAliasGroup(aliasList, registeredSet);
        } else {
            disableAliasGroup(registeredSet);
        }
    }

    return {
        shorthands: {
            enable: () => enableAliasGroup(shorthandAliases, shorthandRegistered),
            disable: () => disableAliasGroup(shorthandRegistered),
            toggle: () => shorthandRegistered.size > 0 ? disableAliasGroup(shorthandRegistered) : enableAliasGroup(shorthandAliases, shorthandRegistered),
            set: (enabled) => setAliasGroup(shorthandRegistered, shorthandAliases, enabled),
        },
        wyvernCompat: {
            enable: () => enableWyvernCompatGroup(wyvernCompatRegistered),
            disable: () => disableAliasGroup(wyvernCompatRegistered),
            toggle: () => wyvernCompatRegistered.size > 0 ? disableAliasGroup(wyvernCompatRegistered) : enableWyvernCompatGroup(wyvernCompatRegistered),
            set: (enabled) => enabled ? enableWyvernCompatGroup(wyvernCompatRegistered) : disableAliasGroup(wyvernCompatRegistered),
        },
        janitorAliases: {
            enable: () => enableAliasGroup(janitorShorthandAliases, janitorRegistered),
            disable: () => disableAliasGroup(janitorRegistered),
            toggle: () => janitorRegistered.size > 0 ? disableAliasGroup(janitorRegistered) : enableAliasGroup(janitorShorthandAliases, janitorRegistered),
            set: (enabled) => setAliasGroup(janitorRegistered, janitorShorthandAliases, enabled),
        },
        getRegistered: () => Array.from(macrosByType.values()).flatMap(s => Array.from(s)),
        getRegisteredByType: () => ({
            subjective: Array.from(macrosByType.get('subjective') ?? []),
            objective: Array.from(macrosByType.get('objective') ?? []),
            posDet: Array.from(macrosByType.get('posDet') ?? []),
            posPro: Array.from(macrosByType.get('posPro') ?? []),
            reflexive: Array.from(macrosByType.get('reflexive') ?? []),
            verbBe: Array.from(macrosByType.get('verbBe') ?? []),
        }),
    };
}

/**
 * Applies current settings to the macro manager (call on init and on toggle change).
 */
export function applyMacroSettings() {
    const m = getMacroManager();
    m.shorthands.set(pronounsSettings.shorthands);
    m.wyvernCompat.set(pronounsSettings.wyvernCompat);
    m.janitorAliases.set(pronounsSettings.janitorShorthands);
}
