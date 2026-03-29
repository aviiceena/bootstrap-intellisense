# Change Log

## v3.0.5 2026-03-29

- added support for Bootstrap v5.3.8
- changed default configuration to use v5.3.8
- packaged and replaced the .vsix (extension installer) file

## v3.0.4 2025-06-29

- Added: Support for Bootstrap 5.3.7
- added: Script to publish the extension to Open VSX.

## v3.0.3 2025-05-13

- Added: Dynamic loading of Bootstrap versions from `assets/bootstrap-versions.json` for the version selection menu.
- Fixed: Improved accuracy of hover provider for Bootstrap classes, correctly identifying classes within `class` or `className` attributes, especially when multiple classes are present.
- NEW: Added new Bootstrap versions `5.3.6`, `5.3.5` and `5.3.4` to the version selection menu.
- Minor bug fixes.

## v3.0.2 2025-03-20

- added two bootstrap versions 5.1.3 and 5.0.2
- removed sorting of classes with `Ctrl + S`

## v3.0.1 2025-03-19

- Fixed minor bugs

## v3.0.0 2025-03-19

- Added support for local Bootstrap CSS files
- CSS preview on hover.
- Integrated new Bootstrap versions
- Implemented class sorting with `Ctrl + S`
- Added support for custom languages for Bootstrap classes, with predefined language list option
- Improved performance by caching Bootstrap CSS classes
- Fixed various bugs and improved stability

## v2.1.1 2025-03-02

- Fixed minor bugs.

## v2.1.0 2025-03-02

- Added support for .gjs and .gts files.
- The extension now remembers the selected Bootstrap version and its enabled/disabled state.
- Fixed minor bugs.

## v2.0.2 2024-12-15

- Added .lava support

## v2.0.1 2024-11-16

- Fixed minor bugs

## v2.0.0 2024-11-16

- Added the option to manually select the Bootstrap version for your project.
- You can now enable or disable the extension anytime.
- Fixed some bugs.
- Supports Bootstrap versions 3 to 5.

## v1.6.0 2024-11-06

- 🐛 Fixed: Regex now ignores commented code blocks when matching <link> tags for Bootstrap CSS files.
- 📦 Added: Support for handling JAR files.
- 🆕 Added: Support for Webjars.

## v1.5.8 2024-10-18

- Added jinja-html support

## v1.5.7 2024-10-07

- 🐛 Fixed minor bugs.

## v1.5.6 2024-10-03

- 🐛 Fixed minor bugs.

## v1.5.5 2024-10-01

- 🐛 Fixed minor bugs.

## v1.5.4 2024-09-29

- 🐛 Fixed Duplicate CSS classes.

## v1.5.3 2024-07-12

- 🐛 Fixed minor bugs.

## v1.5.2 2024-07-11

- 🆕 Updated sponsor link

## v1.5.1 2024-07-11

- 🐛 Fixed minor bugs.

## v1.5.0 2024-07-11

- ✨ Added support for suggesting CSS classes from Local Bootstrap css Files as well.
- ♻️ Refactored code for improved maintainability and readability.
- 🐛 Fixed minor bugs.

## v1.4.2 2024-05-27

- 🐛 Fixed minor bugs.

## v1.4.1 2024-05-26

- 🐛 Fixed minor bugs.

## v1.4.0 2024-05-26

- ♻️ Refactored code for improved maintainability and readability.
- ✨ Enhance feature: Now able to view complete CSS for class names.
- 🐛 Fixed minor bugs.
- 🛠️ Updated README file

## v1.3.0 2024-05-26

- ✨ Added support for suggesting CSS classes from CDN links as well.
- 🐛 Fixed minor bugs.

## v1.2.1 2024-05-25

- 🛠️ Show a warning if Bootstrap is not included in node_modules.

## v1.2.0 2024-05-24

- 🔄 Improved retrieval of Bootstrap CSS classes from the project's node_modules.
- 🛠️ The extension now consistently uses the installed version of Bootstrap, eliminating the ability to switch versions.
- 🖌️ CSS classes are now accurately suggested within the class attribute.
- 🐛 Fixed minor bugs.
- 🚀 Development on the project resumes, albeit at a slow pace.

## v1.1.10 2023-12-08

- 🚧 This project is no longer actively maintained by the original developer.

## v1.1.9 2023-11-03

- 🆕 Added `asp`in the `languageSupport`

## v1.1.8 2023-09-23

- 🆕 Added `j2` and `jinja` in the `languageSupport`

## v1.1.7 2023-09-18

- 🆕 Added `edge` in the `languageSupport`

## v1.1.6 2023-08-24

- 🆕 Added `blade`, `razor`, `ejs`, `markdown`, `css`, `scss`, `sass`, `less`,`stylus`, `jade`, `pug`, `haml`, `slim` and `liquid` in the `languageSupport`

## v1.1.5 2023-08-22

- 🆕 Added `django-html` in the `languageSupport`

## v1.1.4 2023-08-11

- 🐛 Fixed bugs

## v1.1.3 2023-08-06

- 🆕 Added `erb` in the `languageSupport`

## v1.1.2 2023-07-09

- 🆕 Added `twig` in the `languageSupport`

## v1.1.1 2023-06-13

- 🐛 Fixed bugs

## v1.1.0 2023-06-13

- 🆕 Added icon to the Status Bar
- ⚒️ Refactoreded the Status Bar
- 🆕 Added a new command to chnage the Bootstrap version
- 🐛 Fixed bugs

## v1.0.3 2023-06-11

- Fixed Bugs

## v1.0.2 2023-06-11

- Fixed Bugs

## v1.0.1 2023-06-11

- Fixed Bugs

## v1.0.0 2023-06-11

- 🎉 Initial version
