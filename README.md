# Lorenzi's KMP Editor (Fork for Linux)

Edits Mario Kart Wii's KMP files (a course's functional data) in a visual, intuitive way!

Grab a pre-built executable from the [Releases section](https://github.com/PostScriptReal/kmp-editor/releases)!

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

## Changes made in this fork

* Linux targets are now properly supported
	- As part of this change, Alt-click and Alt-drag controls now use Shift due to it causing issues with Linux.
* Dist command has been separated into the commands ```dist-win``` and ```dist-unix``` so Windows executables can be easily made on non-Windows machines and Linux (and MacOS) executables can also be compiled.

## Running from source

Clone or download the repository, then use [Node.js](https://nodejs.org) to run.

Navigate to the repository's root folder, and do:

```
npm install
npm start
```

![Screenshot](/doc/screenshot1.png)
## Building Executables
To make your own executable, clone/download the repo and make sure you have [Node.js](https://nodejs.org) installed. If you haven't already done so, run the npm install command:
```
npm install
```
If you want to build a Windows .exe file, run this command in Command Prompt:

```
npm run dist-win
```
Otherwise if you want to build a Linux AppImage (Snaps can be built if you use Electron 2) run this command in the terminal:
```
npm run dist-unix
```
This command is for all non-Windows targets, if you are on Linux, it will build the executable mentioned above, however if you are on MacOS it (may) build a MacOS executable. 

**PLEASE NOTE THAT MACOS IS NOT SUPPORTED AND WILL NOT WORK CORRECTLY AS DESCRIBED IN THIS [ISSUE](https://github.com/hlorenzi/kmp-editor/issues/23)**
