/**
 * Macro registration and management for the Pronouns extension.
 *
 * Macro naming convention:
 *  - Primary (always on):  {{pronoun-subjective}}, {{pronoun-objective}},
 *                          {{pronoun-pos-det}}, {{pronoun-pos-pro}}, {{pronoun-reflexive}}
 *  - WyvernChat aliases (opt-in toggle): {{she}}/{{he}}/{{they}}, {{her}}/{{him}}/{{them}},
 *                          {{her_}}/{{his_}}/{{their_}}, {{hers}}/{{his}}/{{theirs}},
 *                          {{herself}}/{{himself}}/{{themself}}
 *  - JanitorAI aliases (opt-in toggle): {{sub}}, {{obj}}, {{poss}}, {{poss_p}}, {{ref}}
 */

import { macros } from '../../../../../scripts/macros/macro-system.js';
import { t } from '../../../../../scripts/i18n.js';
import { getCurrentPronounValues, wyvernShorthandAliases, janitorShorthandAliases, pronounsSettings } from './pronouns.js';

/**
 * @typedef {Object} PronounMacroManager
 * @property {{ toggle: () => void, set: (enabled: boolean) => void, enable: () => void, disable: () => void }} wyvernAliases
 * @property {{ toggle: () => void, set: (enabled: boolean) => void, enable: () => void, disable: () => void }} janitorAliases
 * @property {() => string[]} getRegistered
 * @property {() => { subjective: string[]; objective: string[]; posDet: string[]; posPro: string[]; reflexive: string[] }} getRegisteredByType
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
    };

    const valueGetters = {
        subjective: () => getCurrentPronounValues().subjective,
        objective: () => getCurrentPronounValues().objective,
        posDet: () => getCurrentPronounValues().posDet,
        posPro: () => getCurrentPronounValues().posPro,
        reflexive: () => getCurrentPronounValues().reflexive,
    };

    /** @type {Map<'subjective'|'objective'|'posDet'|'posPro'|'reflexive', Set<string>>} */
    const macrosByType = new Map([
        ['subjective', new Set()],
        ['objective', new Set()],
        ['posDet', new Set()],
        ['posPro', new Set()],
        ['reflexive', new Set()],
    ]);

    /** @type {Set<string>} */
    const wyvernRegistered = new Set();
    /** @type {Set<string>} */
    const janitorRegistered = new Set();

    // --- Primary macros (always registered) ---
    /** @type {Array<{name: string, pronounKey: keyof typeof valueGetters}>} */
    const primaryMacros = [
        { name: 'pronoun-subjective', pronounKey: 'subjective' },
        { name: 'pronoun-objective', pronounKey: 'objective' },
        { name: 'pronoun-pos-det', pronounKey: 'posDet' },
        { name: 'pronoun-pos-pro', pronounKey: 'posPro' },
        { name: 'pronoun-reflexive', pronounKey: 'reflexive' },
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
        wyvernAliases: {
            enable: () => enableAliasGroup(wyvernShorthandAliases, wyvernRegistered),
            disable: () => disableAliasGroup(wyvernRegistered),
            toggle: () => wyvernRegistered.size > 0 ? disableAliasGroup(wyvernRegistered) : enableAliasGroup(wyvernShorthandAliases, wyvernRegistered),
            set: (enabled) => setAliasGroup(wyvernRegistered, wyvernShorthandAliases, enabled),
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
        }),
    };
}

/**
 * Applies current settings to the macro manager (call on init and on toggle change).
 */
export function applyMacroSettings() {
    const m = getMacroManager();
    m.wyvernAliases.set(pronounsSettings.wyvernShorthands);
    m.janitorAliases.set(pronounsSettings.janitorShorthands);
}
