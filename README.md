# SillyTavern Pronouns [Extension]

[![extension version](https://img.shields.io/badge/dynamic/json?color=blue&label=extension%20version&query=%24.version&url=https%3A%2F%2Fraw.githubusercontent.com%2FWolfsblvt%2FSillyTavern-Pronouns%2Fmain%2Fmanifest.json)](https://github.com/Wolfsblvt/SillyTavern-Pronouns/)
[![release version](https://img.shields.io/github/release/Wolfsblvt/SillyTavern-Pronouns?color=lightblue&label=release)](https://github.com/Wolfsblvt/SillyTavern-Pronouns/releases/latest)
[![required ST version](https://img.shields.io/badge/required%20ST%20version-1.13.5-darkred?logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAABRFBMVEVHcEyEGxubFhafFRWfFRWeFBSaFhaWFRWfFRWfFRWOFhaeFRWeFBSeFBSfFRWfFRWdFRWbFBSfFBSfFBSdFRWeExOfFBSfFRWdFBSfFRWfFRWfGxudFRWeFBSTFRWeFRWeFRWfFRWcFhaeFRWfFRWeFRWfFRWfFRWeFRWeFRWeFRWgFBSgFRWfFRWfFRWgFRX26ur4+Pj9+/ugFBT9/v6fFRWtOzueFRWeFRWgFRX///+fFRX6+/vXo6OfFBSrODj6/PzIenr28PD+/f2gFRX06ur17e3dr6+rMzPTlJS5VVW+ZGT9/v7y39/y6OioMTHx//+1Skrrz8+qMDD7+/v7/Pzq0tLkvb22UVHHe3v4+Pi3WFjIgoL4+PjNjIy5XFyuQEDmzMzZpKThubn8/Py+YWHz8/P8/Pz9//+gFRX////36+tJcu2kAAAAaXRSTlMAARDDqIkMB8qyAzqXUrnQGROErSmd1o41pL4iL2oFTFiTHYt5ccZ1PF1G6ONj2/z1gv1n32CkQz/t7ceYYH+KqdZT5fSoY+XbwLSH1u8elxi8+OmeqJ78nTmbXBds8WlWNc+EwcovuYtEjPKpAAACkklEQVQ4y3VTZXfbQBBcwYlZlmSRLdmWmRpwqGFOw1BmPvf/f+/JeU3ipr0Pp/d2VzszO7cAJfj/oXiAxK5xFEU9TkoSxa1pLejggcayrMVNp2lk26w2wEvg4iUry7IATUGVPG12tlfrYB2iWjmPFJjGAxiqwYT5dyEr3MVkoUWZhgTAF0K+JRQfkyrrvhYoYcTWGVEvT/EpF/PudIAKBRTU18LQYswcR1bNiRxv0JXzDjYRzWsiIcuzKgk0OzglkMDVMW4QDiteXu5VJ7dLMBoYMxPxLV0QUk9zRK6SAEIwX+FEL0hTgRGSW00mXXY6Ce8oaw5UETiWokhqN21z9D3RUDMKH0dXo/Ozs/PRwfqbV5UgnNKodtHmydxwOPf+Mr+HJy87rT8ie5kBoLhXw/HXm5uNzf2N4/Hcxu6B6wAYtZiGxgBryNOdi+Xl70ABqsKT8WsKqr7rpAwe1ABhLCDPjT9sj39cX/88QqTgqRm1Yx1ZZAAWhKlPDElZ9vP28szM+HI9L1ADUbSIg061QlTmc252Z+nTTxer27+e5QW82evmdt0bLItvt7a2vn1ZnhTsloAXF++8pznVsu3T4xlyxi/Wqefj/UyibNFSOZq0oGKdERR/JVzd3Ht3eDhC8dHeqhZVGEcRGD2mwHAxbkEJ2Y4CUCmiapHw8lg2IyZh7BrA2bhPZHCJ6OeUFD+HVZRFYnShj21ip5FEEy4VTS1JbUZQeV71b22KEuOBHZzYZ1mx3WRZ3/X/sU2SFRTbbfIHXYyK9YdPnF+cPMlYiO5jTT33UpKbeadspxPLcqwvTNmvz8tyY2mnR+bAYtxnmHoyjdhbYZguxspkHwKZNum/1pcioYW6MJm3Yf5v+02S+Q13BVQ4NCDLNAAAAABJRU5ErkJggg==)](https://github.com/SillyTavern/SillyTavern/releases/tag/1.13.5)

Pronoun management for SillyTavern personas. Set pronouns per persona and use them as macros anywhere in your prompts. Includes a dedicated editor in Persona Management, quick presets, a text replacer tool, and slash commands.

Inspired by and partially ported from SillyTavern PR [#4542](https://github.com/SillyTavern/SillyTavern/pull/4542).

> [!NOTE]
> This extension requires the **[Experimental Macro Engine](https://docs.sillytavern.app/usage/core-concepts/macros/#macros)** to be enabled.

## Installation

Install using SillyTavern's extension installer from the URL:

```txt
https://github.com/Wolfsblvt/SillyTavern-Pronouns
```

## Features

### Pronoun Editor

A dedicated pronoun editor appears directly under the persona description field in **Persona Management**.

- **Five pronoun fields** — Subjective, Objective, Possessive Determiner, Possessive Pronoun, Reflexive.
- **Quick preset buttons** — Fill all fields at once with `She/Her`, `He/Him`, `They/Them`, or `It/Its`.
- **Info icons** — Each field shows a tooltip listing all currently registered macros for that pronoun type.
- **Persistent** — Pronoun values are stored on the persona descriptor alongside the persona description, so they survive exports and backups.

### Macros

Pronouns are available as macros anywhere SillyTavern supports macro substitution.

**Primary macros** (always available):

| Macro | Pronoun type | Example values |
|---|---|---|
| `{{pronounSubjective}}` | Subjective | she / he / they |
| `{{pronounObjective}}` | Objective | her / him / them |
| `{{pronounPosDet}}` | Possessive determiner | her / his / their |
| `{{pronounPosPro}}` | Possessive pronoun | hers / his / theirs |
| `{{pronounReflexive}}` | Reflexive | herself / himself / themselves |
| `{{pronounVerbBe}}` | Verb-be agreement (English) | is / are |

**Shorthand aliases** (opt-in, see [Settings](#settings)):

English pronoun words as macros — makes prompts easier to read and write at authoring time.

| Macros | Pronoun type |
|---|---|
| `{{she}}` `{{he}}` `{{they}}` | Subjective |
| `{{her}}` `{{him}}` `{{them}}` | Objective |
| `{{her_}}` `{{his_}}` `{{their_}}` | Possessive determiner (trailing `_` avoids collision with `{{her}}`) |
| `{{hers}}` `{{his}}` `{{theirs}}` | Possessive pronoun |
| `{{herself}}` `{{himself}}` `{{themself}}` | Reflexive |

### Text Replacer

Accessible via **Extensions → Pronouns → Open pronoun replacer**.

Paste any prompt or character card text and the tool automatically swaps matching pronoun words with the correct macros for your active persona. Supports shorthand macros when enabled.

### Slash Commands

| Command | Description |
|---|---|
| `/pronouns-set key=<key> <value>` | Set a single pronoun field for the active persona. Keys: `subjective`, `objective`, `posDet`, `posPro`, `reflexive`. |
| `/pronouns-set-preset <preset>` | Apply a preset to the active persona. Presets: `she`, `he`, `they`, `it`. |
| `/pronouns-replace [shorthands] [preset=...] [subjective=...] ... <text>` | Replace pronoun words in text with macros. Uses active persona's pronouns by default. `shorthands` defaults to the global setting. |
| `/pronouns-open-replacer [shorthands] [text]` | Open the pronoun replacer popup. Optionally prefill with text; otherwise uses clipboard. |

### Settings

Access the extension settings under **Extensions → Pronouns** in the SillyTavern settings panel.

- **Enable shorthand macros** — Registers `{{she}}`, `{{him}}`, `{{their_}}`, etc. as additional aliases. Makes prompts easier to read and write. Disabled by default.

Platform compatibility toggles (only enable if you plan to use character cards from those platforms without manually updating the macros):

- **WyvernChat: capitalized variants** — Registers `{{pronounSubjectiveCap}}`, `{{pronounObjectiveCap}}`, etc. The lowercase variants and dot-notation are always available without this toggle.
- **JanitorAI: compatibility macros** — Registers `{{sub}}`, `{{obj}}`, `{{pos}}`, `{{poss_p}}`, `{{ref}}`.

### Platform Compatibility

This extension's primary macros (`{{pronounSubjective}}` etc.) use the same names as WyvernChat's pronoun placeholders, so most WyvernChat cards work out of the box without any toggle.

Additionally, WyvernChat's older dot-notation (`{{pronoun.subjective}}`, `{{pronoun.objective}}`, etc.) is automatically rewritten at runtime — no manual conversion needed.

For cards written specifically for JanitorAI (`{{sub}}`, `{{obj}}`, `{{pos}}`, `{{poss_p}}`, `{{ref}}`), enable the **JanitorAI compatibility macros** toggle in settings.

### Terminology

| Term | Description | Examples |
|---|---|---|
| Subjective | Used as sentence subject | she / he / they / it |
| Objective | Used as sentence object | her / him / them / it |
| Possessive determiner | Before a noun | her / his / their / its |
| Possessive pronoun | Stands alone | hers / his / theirs / its |
| Reflexive | Refers back to subject | herself / himself / themselves / itself |

For more information, see [pronouns.org](https://pronouns.org/) or [Wikipedia](https://en.wikipedia.org/wiki/English_personal_pronouns).

## Roadmap

- [x] Pronoun editor under Persona Management
- [x] Quick preset buttons (She/Her, He/Him, They/Them, It/Its)
- [x] Primary `{{pronounSubjective}}` / `{{pronounObjective}}` / etc. macros
- [x] `{{pronounVerbBe}}` macro ("is"/"are") for verb agreement
- [x] English shorthand macros (`{{she}}`, `{{him}}`, etc.) — opt-in toggle
- [x] WyvernChat compatibility: lowercase names always on, dot-notation rewritten via pre-processor, capitalized variants opt-in
- [x] JanitorAI compatibility macros (`{{sub}}`, `{{pos}}`, etc.) — opt-in toggle
- [x] Pronoun text replacer popup with shorthand support
- [x] Slash commands for pronoun management and direct text replacement
- [ ] Add support for character pronouns (in addition to persona pronouns)
- [ ] add rainbows

## License

AGPL-3.0

## Contribution

- Discord: `@Wolfsblvt`
- Issues and pull requests are welcome.
- Any features/fixes should be pushed to the `dev` branch.
