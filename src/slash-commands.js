/**
 * Slash command registrations for the Pronouns extension.
 */

import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { SlashCommandNamedArgument, ARGUMENT_TYPE, SlashCommandArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue, enumTypes } from '../../../../slash-commands/SlashCommandEnumValue.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { commonEnumProviders } from '../../../../slash-commands/SlashCommandCommonEnumsProvider.js';
import { isTrueBoolean } from '../../../../utils.js';
import { openPronounReplacePopup, replacePronounsWithMacros } from './replacer.js';
import { pronounPresets, getCurrentPronounValues, applyPronounPreset, setCurrentPronounValue, pronounsSettings } from './pronouns.js';

const pronounKeyEnums = [
    new SlashCommandEnumValue('subjective', 'Subjective pronoun', enumTypes.enum, 'S'),
    new SlashCommandEnumValue('objective', 'Objective pronoun', enumTypes.enum, 'O'),
    new SlashCommandEnumValue('posDet', 'Possessive determiner', enumTypes.enum, 'PD'),
    new SlashCommandEnumValue('posPro', 'Possessive pronoun', enumTypes.enum, 'PP'),
    new SlashCommandEnumValue('reflexive', 'Reflexive pronoun', enumTypes.enum, 'R'),
];

/** @returns {SlashCommandEnumValue[]} */
function getPresetEnums() {
    return Object.keys(pronounPresets).map(k =>
        new SlashCommandEnumValue(k, `${pronounPresets[k].subjective}/${pronounPresets[k].objective}/...`, enumTypes.enum),
    );
}

/**
 * Registers all pronoun slash commands.
 */
export function registerSlashCommands() {
    // /pronouns-open-replacer [shorthands=true] [text]
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-open-replacer',
        returns: 'replaced text or empty string',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'shorthands',
                description: 'Default state for "Use shorthand macros" checkbox',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                enumList: commonEnumProviders.boolean('trueFalse')(),
                forceEnum: true,
                defaultValue: pronounsSettings.wyvernShorthands ? 'true' : 'false',
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Initial input text for the popup',
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
        callback: async (args, text = '') => {
            try {
                const useSh = typeof args.shorthands === 'string' ? isTrueBoolean(args.shorthands) : true;
                return await openPronounReplacePopup(String(text ?? ''), { defaultUseShorthands: useSh }) ?? '';
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));

    // /pronouns-replace [shorthands=true] [preset=...] [subjective=...] ... text
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-replace',
        returns: 'replaced text',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'shorthands',
                description: 'Whether WyvernChat shorthand macros should be used if available',
                typeList: [ARGUMENT_TYPE.BOOLEAN],
                enumList: commonEnumProviders.boolean('trueFalse')(),
                forceEnum: true,
                defaultValue: pronounsSettings.wyvernShorthands ? 'true' : 'false',
            }),
            SlashCommandNamedArgument.fromProps({
                name: 'preset',
                description: 'Pronoun preset to use',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: getPresetEnums(),
                forceEnum: true,
            }),
            SlashCommandNamedArgument.fromProps({ name: 'subjective', description: 'Subjective pronoun', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'objective', description: 'Objective pronoun', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'posDet', description: 'Possessive determiner', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'posPro', description: 'Possessive pronoun', typeList: [ARGUMENT_TYPE.STRING] }),
            SlashCommandNamedArgument.fromProps({ name: 'reflexive', description: 'Reflexive pronoun', typeList: [ARGUMENT_TYPE.STRING] }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Input text to convert',
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
        callback: (args, text = '') => {
            try {
                const useSh = typeof args.shorthands === 'string' ? isTrueBoolean(args.shorthands) : true;
                const presetKey = typeof args.preset === 'string' ? args.preset : null;
                let pronouns = presetKey && pronounPresets[presetKey] ? { ...pronounPresets[presetKey] } : { ...getCurrentPronounValues() };
                for (const k of ['subjective', 'objective', 'posDet', 'posPro', 'reflexive']) {
                    if (typeof args[k] === 'string') pronouns[k] = args[k];
                }
                return replacePronounsWithMacros(String(text ?? ''), { useWyvernShorthands: useSh, pronouns }) || '';
            } catch (error) {
                toastr.error(String(error?.message ?? error), 'Pronouns');
                return '';
            }
        },
    }));

    // /pronouns-set-preset presetKey
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-set-preset',
        returns: 'applied preset key',
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Pronoun preset key',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: getPresetEnums(),
                forceEnum: true,
                isRequired: true,
            }),
        ],
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

    // /pronouns-set key=... value
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'pronouns-set',
        returns: 'updated pronoun value',
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'key',
                description: 'Pronoun key to set',
                typeList: [ARGUMENT_TYPE.STRING],
                enumList: pronounKeyEnums,
                forceEnum: true,
                isRequired: true,
            }),
        ],
        unnamedArgumentList: [
            SlashCommandArgument.fromProps({
                description: 'Pronoun value',
                typeList: [ARGUMENT_TYPE.STRING],
            }),
        ],
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
