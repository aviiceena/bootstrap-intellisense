# Bootstrap IntelliSense

![Bootstrap IntelliSense extension banner](/assets/images/banner.png)

Bootstrap IntelliSense is a Visual Studio Code extension that enhances the development experience with Bootstrap. It offers CSS class autocompletion, hover previews, color previews, sorting classes, and the ability to choose from multiple versions of Bootstrap.

This extension is inspired by the popular Tailwind CSS IntelliSense extension.

## Installation

**[Install via the Visual Studio Code Marketplace →](https://marketplace.visualstudio.com/items?itemName=hossaini.bootstrap-intellisense)**

In order for the extension to activate you must have Bootstrap installed in your workspace.

## Activation

The extension will be activated automatically when it's installed.

## Features

### Smart Autocomplete

Intelligent suggestions for Bootstrap class names.
Enter a class name and the extension will suggest matching CSS classes, if not than try `ctrl + space` to trigger the autocomplete.

![Autocomplete suggestions for Bootstrap class names in VS Code](/assets/images/autocomplete.png)

### Color Previews

Bootstrap color utility classes show swatches in three places:

- **In the editor** — a small color box appears to the left of each color class as you type (toggle via the menu or `enableColorPreview`).
- **In autocomplete** — color classes show a swatch in the suggestion list, with the hex code in the details panel.
- **On hover** — hovering a color class shows the swatch and hex code above the CSS rule.

Semi-transparent classes such as `text-black-50` display the correct alpha (e.g. `#00000080`).

### Class Sorting

Sort Bootstrap classes in a consistent order: Layout → Spacing → Components → Utilities.

- Enable **Sort on Save** from the extension menu (or set `sortOnSave` in settings).
- Run **Bootstrap IntelliSense: Sort Classes in Current File** from the command palette to sort the current file on demand.

### Class Hover Preview

Just hover over a class name to see a preview of the CSS properties.

![Hover preview showing CSS properties for a Bootstrap class](/assets/images/css-hover-preview.png)

You can toggle hover and inline color previews independently from the extension menu.

### Broad Syntax Support

Class names are detected across many syntaxes, including `class`, `className`, `:class`, `v-bind:class`, `[ngClass]`, `[class]`, Svelte `class:` directives, and class helper functions such as `cn()`, `clsx()`, `classNames()`, `twMerge()` and `cva()`. Multi-line class attributes are supported as well.

### Choose your Bootstrap version

Select the Bootstrap version you are using in your project.

![Bootstrap version selection menu in the extension](/assets/images/bootsrap-version.png)

### Reload / Clear Class Cache

Use the **Reload / Clear Class Cache** command (from the menu or command palette) to clear the cached Bootstrap classes and reload them — handy after switching versions or updating a local CSS file.

### Add Custom Language Support

Add custom language support for Bootstrap classes.

![Custom language support configuration for Bootstrap IntelliSense](/assets/images/custom-language-support.png)

## Known Issues

If you encounter any errors or have suggestions for improvement, please feel free to [email me](mailto:Hossainih03@gmail.com). I appreciate your feedback and will do my best to address any issues you may have. Thank you in advance!

## Contributing

Contributions are welcome! If you would like to add new features or make improvements to the project, feel free to fork the repository and submit your changes via pull requests. Your contributions will be highly appreciated and will help make the project even better. Thank you in advance for your interest in contributing!

## Requirements

This extension requires VSCode version 1.67.1 or higher.

Enjoy!
