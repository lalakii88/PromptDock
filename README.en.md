# PromptDock

A local prompt library designed around AI filmmaking workflows. Save reusable templates, fill variables, and copy the result without rewriting the original.

[中文说明](README.md) · [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/mgjljnlkanbhnalfjoclalgoaagdielc) · [Product case study](docs/CASE_STUDY.md)

![Workspace demo with sample data](docs/images/workspace-light.webp)

The screenshot shows the related web workspace rendered from its UI code, with demonstration content. Extension window and sidebar layouts differ. The source extension is **v1.4.1** and ships with one sample prompt.

## Features

- Create, edit, search, tag, favorite, organize, and copy prompts.
- Reuse `{{variable}}` templates with temporary inputs and a live preview.
- Open a standalone window, sidebar, or full workspace.
- Save selected webpage text through a user-triggered context-menu action.
- Pin the window where Document Picture-in-Picture is supported and allowed.
- Import/export JSON; switch between Chinese/English and light/dark themes.

## Run locally

Download the repository, open `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension/` directory. No build step or npm dependencies are required. Use JSON backups to move data between store-installed and unpacked extensions.

For the browser preview, open `extension/index.html`, or run `python -m http.server 8080` and visit `http://localhost:8080/extension/index.html`. Preview and extension storage are separate. Extension-only features are unavailable in the preview.

## Privacy and compatibility

No account, model API, cloud synchronization, analytics, or remote scripts. Permissions are limited to `storage`, `sidePanel`, and `contextMenus`. Extension pages block outbound connections through CSP. User-directed copying, exporting, and pasting to other services remain under the user's control. Read [the privacy notice](docs/PRIVACY.md).

Edge is the primary target. The manifest requires Chromium 116+, but sidebar and Picture-in-Picture support vary. Pinning needs a user gesture and a supporting browser; closing the source window closes its dependent PiP window. Export a backup before uninstalling or clearing storage.

## Development

Use Node.js 20+ and run `npm test`. All 66 existing automated tests passed on 2026-10-17. They include mocked browser APIs and do not establish compatibility with every browser. The open-source packaging preserves the extension's runtime source unchanged.

Run `python scripts/package.py` to create an extension ZIP in `dist/`.

## Credits and license

Product concept, requirements, visual/interaction design, and iteration: **梁伊轩 / lalakii88**. Implementation, debugging, and parts of the documentation were developed with AI assistance.

Repository code, icons, and included demo images use the [MIT License](LICENSE). User-imported prompts and external assets retain their respective owners' rights. Third-party names and trademarks do not imply endorsement.
