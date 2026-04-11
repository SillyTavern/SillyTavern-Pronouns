/**
 * Slash command registrations for the Pronouns extension.
 */

import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { SlashCommandNamedArgument, ARGUMENT_TYPE, SlashCommandArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue, enumTypes } from '../../../../slash-commands/SlashCommandEnumValue.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { commonEnumProviders } from '../../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { isTrueBoolean } from '../../../../utils.js';
import { t } from '../../../../../scripts/i18n.js';
import { openPronounReplacePopup, replacePronounsWithMacros } from './replacer.js';
import { pronounPresets, getCurrentPronounValues, applyPronounPreset, setCurrentPronounValue, pronounsSettings } from './pronouns.js';

const pronounKeyEnums = [
    new SlashCommandEnumValue('subjective', 'Subjective pronoun (e.g. she, he, they)', enumTypes.enum, 'S'),
    new SlashCommandEnumValue('objective', 'Objective pronoun (e.g. her, him, them)', enumTypes.enum, 'O'),
    new SlashCommandEnumValue('posDet', 'Possessive determiner (e.g. her, his, their)', enumTypes.enum, 'PD'),
    new SlashCommandEnumValue('posPro', 'Possessive pronoun (e.g. hers, his, theirs)', enumTypes.enum, 'PP'),
    new SlashCommandEnumValue('reflexive', 'Reflexive pronoun (e.g. herself, himself, themselves)', enumTypes.enum, 'R'),
];

/** @returns {SlashCommandEnumValue[]} */
function getPresetEnums() {
    return Object.keys(pronounPresets).map(k =>
        new SlashCommandEnumValue(k, `${pronounPresets[k].subjective}/${pronounPresets[k].objective}/...`, enumTypes.enum),
    );
}

/**
 * Resolves the effective `useShorthands` flag for slash commands.
 * - If explicitly set to true but shorthands are globally off: warns and returns null (caller should abort).
 * - If explicitly set to true/false and shorthands are on: respects the provided value.
 * - If not provided: defaults to the global shorthand setting.
 * @param {string|undefined} argValue - The raw string value of the shorthands argument
 * @returns {boolean|null} The resolved flag, or null if the call should be aborted
 */
function resolveShorthandsArg(argValue) {
    if (typeof argValue === 'string') {
        const requested = isTrueBoolean(argValue);
        if (requested && !pronounsSettings.shorthands) {
            toastr.warning(t`Shorthand macros are not enabled. Enable them in Extensions → Pronouns settings first.`, 'Pronouns');
            return null;
        }
        return requested;
    }
    return pronounsSettings.shorthands;
}

/**
 * Registers all pronoun slash commands.
 */
export function registerSlashCommands() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-open-replacer',
        returns: 'The converted text after the user confirms, or an empty string if cancelled or no pronouns are set.',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'shorthands',
                description: 'Default state for the "Use shorthand macros" checkbox in the popup. If omitted, defaults to enabled when shorthand macros are globally on.',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                enumList: commonEnumProviders.boolean('trueFalse')(),
                forceEnum: true,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Initial text to prefill in the replacer popup. If omitted, the current clipboard content is used.',
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
        helpString: `
            <div>
                Opens the pronoun replacer popup for the active persona.
                The tool scans the text for pronoun words matching the current persona's pronouns
                and offers to replace them with the appropriate macros (e.g. <code>{{pronounSubjective}}</code>).
            </div>
            <div>
                The popup shows a preview table of which words will map to which macros.
                Use the <strong>Convert</strong> button to apply the replacement inline,
                <strong>Convert &amp; Copy</strong> to confirm and copy the result, or <strong>Copy</strong> to just copy.
            </div>
            <div>
                <strong>Shorthand macros</strong> must be enabled in settings for the checkbox to be active.
                When enabled, macros like <code>{{she}}</code> or <code>{{him}}</code> are used instead of the full form.
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code>/pronouns-open-replacer shorthands=true She smiled and reached for her bag.</code></pre>
                        Opens the replacer popup prefilled with the given text and the shorthand checkbox checked.
                    </li>
                </ul>
            </div>
        `,
        callback: async (args, text = '') => {
            try {
                const useSh = resolveShorthandsArg(typeof args.shorthands === 'string' ? args.shorthands : undefined);
                return await openPronounReplacePopup(String(text ?? ''), { defaultUseShorthands: useSh ?? false }) ?? '';
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-replace',
        returns: 'The input text with all matching pronoun words replaced by their macro equivalents.',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'shorthands',
                description: 'Whether to use shorthand macro names (e.g. <code>{{she}}</code> instead of <code>{{pronounSubjective}}</code>). If omitted, defaults to enabled when shorthand macros are globally on. Providing <code>true</code> while shorthands are globally off shows a warning and exits.',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                enumList: commonEnumProviders.boolean('trueFalse')(),
                forceEnum: true,
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'preset',
                description: 'Use a built-in pronoun preset instead of the active persona\'s pronouns. Individual pronoun arguments still override preset values.',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: getPresetEnums(),
                forceEnum: true,
            }),
            SlashCommandNamedArgument.fromProps({ name: 'subjective', description: 'Override the subjective pronoun (e.g. she, he, they)', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'objective', description: 'Override the objective pronoun (e.g. her, him, them)', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'posDet', description: 'Override the possessive determiner (e.g. her, his, their)', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'posPro', description: 'Override the possessive pronoun (e.g. hers, his, theirs)', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'reflexive', description: 'Override the reflexive pronoun (e.g. herself, himself, themselves)', typeList: [ARGUMENT_TYPE.STRING] }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'The text to scan and replace pronoun words in.',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Replaces pronoun words in the provided text with their corresponding macros,
                using the active persona's pronouns by default.
            </div>
            <div>
                Word matching is case-insensitive and whole-word only. Ambiguities are resolved by precedence:
                reflexive &gt; possessive pronoun &gt; objective &gt; possessive determiner &gt; subjective.
            </div>
            <div>
                Use <code>preset</code> to replace against a fixed set of pronouns instead of the active persona,
                and individual pronoun arguments to override specific fields on top of that.
            </div>
            <div>
                <strong>Examples:</strong>
                <ul>
                    <li>
                        <pre><code>/pronouns-replace She reached for her bag.</code></pre>
                        Replaces using the active persona's pronouns.
                    </li>
                    <li>
                        <pre><code>/pronouns-replace preset=they shorthands=true They looked at their hands.</code></pre>
                        Replaces using the they/them preset, outputting shorthand macros like <code>{{they}}</code>.
                    </li>
                    <li>
                        <pre><code>/pronouns-replace subjective=xe objective=xem She reached for her bag.</code></pre>
                        Uses the active persona's pronouns but overrides subjective and objective.
                    </li>
                </ul>
            </div>
        `,
        callback: (args, text = '') => {
            try {
                const useSh = resolveShorthandsArg(typeof args.shorthands === 'string' ? args.shorthands : undefined);
                if (useSh === null) return '';
                const presetKey = typeof args.preset === 'string' ? args.preset : null;
                let pronouns = presetKey && pronounPresets[presetKey] ? { ...pronounPresets[presetKey] } : { ...getCurrentPronounValues() };
                for (const k of ['subjective', 'objective', 'posDet', 'posPro', 'reflexive']) {
                    if (typeof args[k] === 'string') pronouns[k] = args[k];
                }
                return replacePronounsWithMacros(String(text ?? ''), { useShorthands: useSh, pronouns }) || '';
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-set-preset',
        returns: 'The applied preset key, or an empty string if the preset was not found.',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Preset key to apply.',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: getPresetEnums(),
                forceEnum: true,
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Applies a built-in pronoun preset to the active persona, filling all five pronoun fields at once.
            </div>
            <div>
                Available presets: <code>she</code> (She/Her), <code>he</code> (He/Him),
                <code>they</code> (They/Them), <code>it</code> (It/Its).
            </div>
            <div>
                <strong>Example:</strong>
                <ul>
                    <li>
                        <pre><code>/pronouns-set-preset they</code></pre>
                        Sets all pronoun fields for the active persona to the They/Them preset.
                    </li>
                </ul>
            </div>
        `,
        callback: (_, presetName) => {
            try {
                const key = String(presetName ?? '').trim();
                if (!key || !pronounPresets[key]) return '';
                applyPronounPreset(key);
                return key;
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-set',
        returns: 'The updated pronoun value, or an empty string if the key was invalid.',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'key',
                description: 'Which pronoun field to set.',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: pronounKeyEnums,
                forceEnum: true,
                isRequired: true,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'The pronoun value to set. Pass an empty string to clear the field.',
                typeList: [ARGUMENT_TYPE.STRING],
                isRequired: true,
            }),
        ],
        helpString: `
            <div>
                Sets a single pronoun field for the active persona.
                Changes are saved immediately and macros will reflect the new value right away.
            </div>
            <div>
                <strong>Examples:</strong>
                <ul>
                    <li>
                        <pre><code>/pronouns-set key=subjective xe</code></pre>
                        Sets the subjective pronoun to "xe".
                    </li>
                    <li>
                        <pre><code>/pronouns-set key=reflexive themself</code></pre>
                        Sets the reflexive pronoun to "themself".
                    </li>
                </ul>
            </div>
        `,
        callback: (args, value) => {
            try {
                const key = String(args.key ?? '').trim();
                const val = String(value ?? '');
                if (!key) return '';
                return setCurrentPronounValue(key, val) ?? '';
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));
}
