# hlorenzi's KMP Editor

Edits Mario Kart Wii's KMP files (a course's functional data) in a visual, intuitive way!

Currently edits the following sections:
- Starting points (`KTPT`)
- Enemy paths (`ENPT` and `ENPH`)
- Item paths (`ITPT` and `ITPH`)
- Checkpoints (`CKPT` and `CKPH`)
- Respawn points (`JGPT`)
- Objects (`GOBJ`)
- Routes (`POTI`) (basic support)

The tool will keep other sections intact when saving.

:warning: This is an early release, so use at your own risk! Remember to always backup your files
beforehand. Also, KMP format restrictions are only currently checked at save time, so save often
if you're not sure about going over a limit.

## Running the tool

Clone or download the repository, then use [Node.js](https://nodejs.org) to run.

Navigate to the repository's root folder, and do:

```
npm install
npm start
```

![Screenshot](/doc/screenshot1.png)