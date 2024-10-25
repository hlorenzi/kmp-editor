# Lorenzi's KMP Editor

Edits Mario Kart Wii's KMP files (a course's functional data) in a visual, intuitive way!

Grab a pre-built executable from the [Releases section](https://github.com/hlorenzi/kmp-editor/releases)!

Currently edits the following sections:
- Starting points (`KTPT`)
- Enemy paths (`ENPT` and `ENPH`)
- Item paths (`ITPT` and `ITPH`)
- Checkpoints (`CKPT` and `CKPH`)
- Respawn points (`JGPT`)
- Objects (`GOBJ`)
- Routes (`POTI`)
- Area (`AREA`)
- Cannon Points (`CNPT`)
- Battle Finish Points (`MSPT`)
- Track Information (`STGI`)

The tool will keep other sections intact when saving.

:warning: This is an early release, so use at your own risk! Remember to always backup your files
beforehand.

![Screenshot](/doc/screenshot1.png)

## Running from source / Dev environment

Clone or download the repository, then use [Node.js](https://nodejs.org) to run.

Navigate to the repository's root folder, and do:

```
npm install
npm start
```

### Building
To build, just run
```
npm run dist
```
It will create a dist folder where inside is the updated `.exe` of electron.
