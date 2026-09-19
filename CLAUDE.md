# CLAUDE.md

A Homey Pro app, **Uponor Smatrix X-265** (`com.tobiasfagerskog.uponor-smatrix_x-265`), written in Python (SDK 3, `runtime: python`). It reads room temperature and humidity from an Uponor Smatrix Pulse R-208 gateway over its local JNAP HTTP interface. The app lives in `uponor-smatrix_x-265/`. Its `README.md` describes the protocol, the project layout and the development notes, so read it before changing code.

## Commands

Run these from `uponor-smatrix_x-265/`. Docker must be running, because the CLI builds Python apps in Athom's images.

```sh
homey app run                        # dev mode on the Homey, logs in the terminal
homey app install                    # install permanently
homey app validate --level verified  # must pass before every commit that changes the manifest or assets
homey app publish                    # interactive; the user runs it, not Claude
```

There are no automated tests. Check changes with `homey app validate --level verified`, then on a real Homey with `homey app run`. To see the gateway's raw data, use the `curl` command in `README.md`.

## Rules

- **Edit `.homeycompose/app.json` and `drivers/*/driver.compose.json`, never `app.json`.** The CLI regenerates `app.json` on every build or validation. Commit the regenerated `app.json` along with the compose files.
- **Never change the app id.** It is permanent once published.
- **Use relative imports** (`from ...lib.uponor import ...`). The runner loads the app as a package called `app`.
- **Standard library only.** `pythonPackages` stays empty, and blocking I/O runs through `asyncio.to_thread`.
- **Keep `platforms` on the driver and `support` in the app manifest.** Verified-level validation requires both.
- **Settings pages must load `/homey.js` themselves** (`<script src="/homey.js" data-origin="settings"></script>`).

## Releasing a new version

1. Bump `version` in `.homeycompose/app.json` (semver; the first release is 0.1.0).
2. Add a matching entry to `.homeychangelog.json` with a short, user-facing English line.
3. Run `homey app validate --level verified`.
4. The user runs `homey app publish` and submits the build in the Homey developer dashboard.

## App Store guidelines to keep

- **`README.txt`** is the store's long description. It must be plain text, one or two paragraphs, with no URLs, feature lists or changelog. `README.md` is for GitHub only.
- **Description** is a one-line tagline. It must not start with "Adds support for" and must not repeat the app name.
- **Name** has at most 4 words and must not include "Homey".
- **App images** are 250×175, 500×350 and 1000×700 lifestyle or brand photos, not logos. **Driver images** are 75, 500 and 1000 px squares showing the real device on white. Both come from uponor.com and are Uponor's property.
- **Icons** are SVGs on a 960×960 canvas, drawn in lines with a transparent background. The driver icon must differ from the app icon.
- **New flow cards** need short titles without "When", "And" or "Then", without parentheses and without device names. Use `titleFormatted` for arguments.
- **Translations** are all or nothing. If you translate one string, translate the description, the readme, flow cards, settings and capabilities too. English is required.

## Hardware scope

The app has only been tested with an X-265 controller and an R-208 module. Rooms are `C<controller>_T<thermostat>` variables in the JNAP reply. Temperatures come in tenths of °F and are converted in `lib/uponor.py`.

## Git

Work on a branch and merge to `main` through a pull request. The `gh` CLI isn't installed on this machine, so give the user a compare link to open the PR.
