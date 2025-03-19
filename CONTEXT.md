# Using Local Bootstrap CSS Files

## Objective

This feature allows users to use Bootstrap CSS files locally instead of selecting a version from the internet. This ensures better offline usage and flexibility in choosing the Bootstrap version.

## Workflow

### 1. Menu Access via Status Bar

- The user clicks on the extension's status bar icon.
- A menu opens where the option **"Bootstrap From Local Files"** is selectable.

### 2. Selection of Bootstrap CSS File

- A new menu appears listing automatically detected Bootstrap CSS files.
- If Bootstrap is present in `node_modules`, `bootstrap.min.css` is also added to the selection.
- The user can either select one of the detected files or load their own file from their PC.

### 3. Saving the Selection

- The selected file is saved in `settings.json`.
- I want everything to be stored in a bootstrapIntelliSense object.
- Example configuration:
  ```json
  "bootstrapIntelliSense": {
    "enable": true,
    "bsVersion": "5.3.3",
    "useLocalFile": true,
    "cssFilePath": "C:/path/to/bootstrap.min.css"
  }
  ```

### 4. Updating the Display in the Main Menu

- The main menu shows:
  - A checkbox for "From Local Files for Offline Use".
  - The currently used Bootstrap version:
    - "Select Bootstrap version" (when an online version is used)
    - "From Local Files" (when a local file is used)

### 5. Extraction of the Bootstrap Version

- The version is automatically read from the `bootstrap.min.css` file.
- Example:
  ```css
  @charset "UTF-8";
  /*! * Bootstrap  v5.3.3 (https://getbootstrap.com/) */
  ```
- The status bar always shows the version from "select bootstrap version" and should display the extracted version.

### 6. Suggestions for Bootstrap Classes Based on Selection

- When "From Local Files" is active, only classes from the local file are suggested.
- When "Select Bootstrap version" is active, classes from the online version are suggested.
