/**
 * Pronoun replacer: converts direct pronoun words in text into macros.
 * Also provides the replacer popup UI.
 */

import { t } from '../../../../../scripts/i18n.js';
import { Popup, POPUP_TYPE, POPUP_RESULT } from '../../../../../scripts/popup.js';
import { escapeHtml } from '../../../../utils.js';
import { getCurrentPronounValues, pronounsSettings, wyvernShorthandAliases } from './pronouns.js';

/** @typedef {{ subjective: string, objective: string, posDet: string, posPro: string, reflexive: string }} Pronouns */

/**
 * Escapes a string for safe use inside a RegExp pattern.
 * @param {string} str
 * @returns {string}
 */
function escapeForRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks whether all pronoun fields are empty.
 * @param {Pronouns} p
 * @returns {boolean}
 */
function arePronounsEmpty(p) {
    if (!p) return true;
    return [p.subjective, p.objective, p.posDet, p.posPro, p.reflexive]
        .every(v => !v || String(v).trim() === '');
}

/**
 * Returns the primary macro name for a given pronoun key.
 * @param {'subjective'|'objective'|'posDet'|'posPro'|'reflexive'} key
 * @returns {string}
 */
function getPrimaryMacroName(key) {
    const map = {
        subjective: 'pronoun-subjective',
        objective: 'pronoun-objective',
        posDet: 'pronoun-pos-det',
        posPro: 'pronoun-pos-pro',
        reflexive: 'pronoun-reflexive',
    };
    return map[key] ?? `pronoun-${key}`;
}

/**
 * Selects a WyvernChat shorthand alias name that matches the current pronoun value.
 * Falls back to null if no matching alias is available.
 * @param {'subjective'|'objective'|'posDet'|'posPro'|'reflexive'} pronounKey
 * @param {string} value
 * @returns {string|null}
 */
function pickMatchingWyvernAlias(pronounKey, value) {
    const aliases = wyvernShorthandAliases.find(a => a.pronounKey === pronounKey)?.names ?? [];
    const lower = String(value || '').toLowerCase();
    return aliases.find(name => name.toLowerCase().startsWith(lower)) ?? null;
}

/**
 * Converts direct pronoun words in the provided text into macros.
 * Uses WyvernChat shorthand macros if globally enabled and a matching alias exists.
 *
 * Ambiguities are resolved by precedence: reflexive > possessive pronoun > objective > possessive determiner > subjective.
 *
 * @param {string} text - Input text to convert
 * @param {Object} [options={}]
 * @param {boolean} [options.useWyvernShorthands=false] - Whether to prefer WyvernChat shorthand macro names
 * @param {Pronouns} [options.pronouns=null] - Override pronouns (defaults to current persona)
 * @returns {string}
 */
export function replacePronounsWithMacros(text, { useWyvernShorthands = false, pronouns: pronounsOverride = null } = {}) {
    if (!text) return '';

    const pronouns = pronounsOverride ?? getCurrentPronounValues();
    if (arePronounsEmpty(pronouns)) {
        const msg = pronounsOverride
            ? t`No pronoun values provided. Cannot replace.`
            : t`No persona pronouns are set. Set pronouns in Persona Management to enable replacement.`;
        toastr.warning(msg);
        return text;
    }

    /** @type {Array<'subjective'|'objective'|'posDet'|'posPro'|'reflexive'>} */
    const precedence = ['reflexive', 'posPro', 'objective', 'posDet', 'subjective'];

    /** @type {Map<string, string>} */
    const lowerWordToMacro = new Map();

    /**
     * @param {'subjective'|'objective'|'posDet'|'posPro'|'reflexive'} key
     * @param {string} value
     */
    function register(key, value) {
        const v = String(value || '').trim();
        if (!v) return;
        const lower = v.toLowerCase();
        if (lowerWordToMacro.has(lower)) return; // keep first by precedence

        let macroName = null;
        if (useWyvernShorthands && pronounsSettings.wyvernShorthands) {
            const alias = pickMatchingWyvernAlias(key, v);
            if (alias) macroName = alias;
        }
        if (!macroName) macroName = getPrimaryMacroName(key);
        lowerWordToMacro.set(lower, `{{${macroName}}}`);
    }

    for (const key of precedence) {
        register(key, pronouns[key]);
    }

    if (lowerWordToMacro.size === 0) return text;

    const alternation = Array.from(lowerWordToMacro.keys()).map(escapeForRegex).join('|');
    if (!alternation) return text;
    const re = new RegExp(`\\b(${alternation})\\b`, 'gi');
    return text.replace(re, (m) => lowerWordToMacro.get(m.toLowerCase()) || m);
}

/**
 * Reads the current clipboard text safely.
 * @returns {Promise<string|null>}
 */
async function tryReadClipboardText() {
    try {
        if (navigator?.clipboard?.readText) {
            const txt = await navigator.clipboard.readText();
            return typeof txt === 'string' && txt.length > 0 ? txt : null;
        }
    } catch { /* ignore */ }
    return null;
}

/**
 * Copies text to the clipboard.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* ignore */ }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch {
        return false;
    }
}

/**
 * Opens the pronoun replacer popup.
 * Prefills from clipboard if no initial text is provided.
 *
 * @param {string|null} [initialText=null] - Optional text to prefill
 * @param {Object} [options={}]
 * @param {boolean} [options.defaultUseShorthands=true]
 * @returns {Promise<string>}
 */
export async function openPronounReplacePopup(initialText = null, { defaultUseShorthands = true } = {}) {
    const showShorthandToggle = pronounsSettings.wyvernShorthands;

    const pronouns = getCurrentPronounValues();
    if (arePronounsEmpty(pronouns)) {
        toastr.warning(t`No persona pronouns are set. Set pronouns in Persona Management to enable the replacer.`);
        return '';
    }

    /** @type {Popup|null} */
    let popup = null;

    /** @returns {HTMLInputElement|null} */
    function getShorthandsCheckbox() {
        const el = popup?.dlg?.querySelector('#pronouns_replace_use_shorthands');
        return el instanceof HTMLInputElement ? el : null;
    }

    /**
     * @param {'subjective'|'objective'|'posDet'|'posPro'|'reflexive'} key
     * @param {string} label
     * @param {string} value
     * @param {boolean} useShorthands
     * @returns {string}
     */
    function buildRow(key, label, value, useShorthands) {
        const alias = pickMatchingWyvernAlias(key, value);
        const macroName = alias && useShorthands ? alias : getPrimaryMacroName(key);
        return `<tr><td>${label}</td><td>${escapeHtml(value)}</td><td>→</td><td>${escapeHtml(`{{${macroName}}}`)}</td></tr>`;
    }

    /** @returns {string} */
    function buildTable() {
        /** @type {Array<{key:'subjective'|'objective'|'posDet'|'posPro'|'reflexive', label:string}>} */
        const order = [
            { key: 'subjective', label: t`Subjective` },
            { key: 'objective', label: t`Objective` },
            { key: 'posDet', label: t`Possessive determiner` },
            { key: 'posPro', label: t`Possessive pronoun` },
            { key: 'reflexive', label: t`Reflexive` },
        ];
        const useShorthands = showShorthandToggle && (getShorthandsCheckbox()?.checked ?? defaultUseShorthands);
        return order
            .map(({ key, label }) => {
                const value = String(pronouns[key] ?? '').trim();
                if (!value) return null;
                return buildRow(key, label, value, useShorthands);
            })
            .filter(Boolean)
            .join('');
    }

    const content = `
        <h3>${t`Pronoun Replacer`}</h3>
        <p>${t`This tool converts direct pronoun words into macros for your current persona.`}</p>
        <p>${t`It supports WyvernChat shorthand macros if enabled.`}</p>
        <table class="pronoun-replacer-table">
            <thead>
                <tr><th>${t`Pronoun`}</th><th>${t`Value`}</th><th></th><th>${t`Macro`}</th></tr>
            </thead>
            <tbody>
                ${buildTable()}
            </tbody>
        </table>
    `;

    popup = new Popup(content, POPUP_TYPE.INPUT, String(initialText ?? ''), {
        okButton: t`Convert & Copy`,
        cancelButton: t`Close`,
        rows: 8,
        customInputs: showShorthandToggle ? [{
            id: 'pronouns_replace_use_shorthands',
            label: t`Use WyvernChat shorthand macros (e.g. {{she}}, {{him}})`,
            tooltip: t`If enabled, uses WyvernChat shorthand macro names where available. Falls back to full macros otherwise.`,
            defaultState: Boolean(defaultUseShorthands),
        }] : null,
        customButtons: [
            {
                text: t`Paste`,
                classes: ['secondary'],
                action: async () => {
                    const pasted = await tryReadClipboardText();
                    if (pasted) popup.mainInput.value = pasted;
                },
            },
            {
                text: t`Convert`,
                classes: ['secondary'],
                action: async () => {
                    const checkbox = getShorthandsCheckbox();
                    const useSh = checkbox ? checkbox.checked : true;
                    const converted = replacePronounsWithMacros(String(popup.mainInput.value ?? ''), { useWyvernShorthands: useSh });
                    popup.mainInput.value = converted;
                    toastr.success(t`Converted`);
                },
            },
            {
                text: t`Copy`,
                classes: ['menu_button_primary'],
                action: async () => {
                    const ok = await copyToClipboard(popup.mainInput.value ?? '');
                    if (ok) toastr.success(t`Copied to clipboard`);
                },
            },
        ],
        onOpen: async (p) => {
            if (!p.mainInput.value) {
                const clip = await tryReadClipboardText();
                if (clip) p.mainInput.value = clip;
            }
        },
        onClosing: async (p) => {
            if (p.result >= POPUP_RESULT.AFFIRMATIVE) {
                const useSh = Boolean(p.inputResults?.get('pronouns_replace_use_shorthands') ?? true);
                const converted = replacePronounsWithMacros(String(p.value ?? ''), { useWyvernShorthands: useSh });
                const ok = await copyToClipboard(converted);
                if (ok) toastr.success(t`Converted and copied`);
                p.value = converted;
                return true;
            }
            return true;
        },
    });

    // Rebuild the mapping table whenever the shorthand toggle changes
    const checkbox = getShorthandsCheckbox();
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            const tbody = popup.dlg.querySelector('.pronoun-replacer-table tbody');
            if (tbody) tbody.innerHTML = buildTable();
        });
    }

    const result = await popup.show();
    return typeof result === 'string' ? result : '';
}
