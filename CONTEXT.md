# Lokale Bootstrap-CSS-Dateien verwenden

## Ziel

Das Feature ermöglicht es Benutzern, Bootstrap-CSS-Dateien lokal zu verwenden, anstatt eine Version aus dem Internet auszuwählen. Dadurch wird eine bessere Offline-Nutzung und Flexibilität bei der Wahl der Bootstrap-Version gewährleistet.

## Workflow

### 1. Menüaufruf über die Statusleiste

- Der Benutzer klickt auf das Statusleisten-Icon der Erweiterung.
- Ein Menü wird geöffnet, in dem die Option **"Bootstrap From Local Files"** auswählbar ist.

### 2. Auswahl der Bootstrap-CSS-Datei

- Ein neues Menü erscheint, das automatisch erkannte Bootstrap-CSS-Dateien auflistet.
- Falls Bootstrap in `node_modules` vorhanden ist, wird `bootstrap.min.css` ebenfalls zur Auswahl hinzugefügt.
- Der Benutzer kann entweder eine der erkannten Dateien auswählen oder eine eigene Datei vom PC laden.

### 3. Speicherung der Auswahl

- Die gewählte Datei wird in `settings.json` gespeichert.
- ich will dass alles ine einem bootstrapIntelliSense Onjekt gespeichert wird.
- Beispielhafte Konfiguration:
  ```json
  "bootstrapIntelliSense": {
    "enable": true,
    "bsVersion": "5.3.3",
    "useLocalFile": true,
    "cssFilePath": "C:/path/to/bootstrap.min.css"
  }
  ```

### 4. Aktualisierung der Anzeige im Hauptmenü

- Das Hauptmenü zeigt:
  - Eine Checkbox für "From Local Files for Offline Use".
  - Die aktuell verwendete Bootstrap-Version:
    - "Select Bootstrap version" (wenn eine Online-Version genutzt wird)
    - "From Local Files" (wenn eine lokale Datei verwendet wird)

### 5. Extrahierung der Bootstrap-Version

- Die Version wird automatisch aus der `bootstrap.min.css` Datei ausgelesen.
- Beispiel:
  ```css
  @charset "UTF-8";
  /*! * Bootstrap  v5.3.3 (https://getbootstrap.com/) */
  ```
- In der Statubar wird immer die verison von "select bootstrap version" angezeigt. und es soll die extrahierte version angezeigt werden.

### 6. Vorschläge für Bootstrap-Klassen basierend auf der Auswahl

- Wenn "From Local Files" aktiv ist, werden nur Klassen aus der lokalen Datei vorgeschlagen.
- Wenn "Select Bootstrap version" aktiv ist, werden Klassen aus der Online-Version vorgeschlagen.
