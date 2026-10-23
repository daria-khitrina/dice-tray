# Dice Tray

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A 3D dice roller for tabletop games — d4, d6, d8, d10, d12, d20, d100 — rendered with [Three.js](https://threejs.org/). No build step, no dependencies to install: just `index.html`, `style.css` and a few scripts in `js/`. No file in the repo may exceed 500 lines (`scripts/check-line-limit.sh`, enforced in CI).

<p align="center">
  <img src="docs/demo.gif" alt="Dice Tray demo: spinning the dice ring and rolling a d20" width="280">
</p>

**Live demo: [dice.dariakhitrina.com](https://dice.dariakhitrina.com)**

## Features

- Seven dice (d4, d6, d8, d10, d12, d20, d100) on a tilted 3D ring
- Animated rolls triggered by a flick gesture
- Choose which dice appear (long-press or gear button)
- Touch, mouse and keyboard support; respects reduced-motion
- Works on phones and desktops

## Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Pick a die | Swipe left / right | `←` / `→` |
| Roll | Swipe up / down | `↑` / `↓` / `Space` |
| Choose visible dice | Long-press or gear button | — (`Esc` to exit) |

## Running locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Three.js (r128) and the Lexend font are loaded from CDNs, so an internet connection is needed.

## Contributions

This is a personal project and I'm not accepting issues or pull requests. You're welcome to fork or copy it and do whatever you like with it, under the MIT license.

## License

[MIT](LICENSE) © 2026 Daria Khitrina

## Credits

Dice rendering approach inspired by [ChefJulio/react-3d-dice](https://github.com/ChefJulio/react-3d-dice).
