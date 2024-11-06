const fs = require('fs');
const vscode = require('vscode');
const axios = require('axios');

const extractCssClasses = (css) => {
  try {
    const classRegex = /\.([a-zA-Z0-9\-_]+)([^{]*?)\s*{([^}]*)}/gs;
    const classes = [];
    const uniqueClasses = new Set();
    let match;

    while ((match = classRegex.exec(css))) {
      const className = match[1];
      let classProperties = match[0];

      classProperties = classProperties
        .replace(/\s*{\s*/, ' {\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/\s*}\s*$/, '\n}');

      if (!uniqueClasses.has(className)) {
        uniqueClasses.add(className);
        classes.push({
          className: className,
          classProperties: classProperties,
        });
      }
    }

    return classes;
  } catch (error) {
    console.error(`Error extracting CSS classes: ${error}`);
    return [];
  }
};

const getBootstrapCdnLink = async () => {
  try {
    const htmlFiles = await vscode.workspace.findFiles('**/*.html');
    const cdnRegex =
      /(?<!<!--.*)<link[^>]+href=["'](@{[^}]*}|(?!cdn|\.\/|\.\.\/)[^"']*bootstrap[^"']*\.css)["'](?!.*-->)/;

    for (const file of htmlFiles) {
      const content = await fs.promises.readFile(file.fsPath, 'utf8');
      const match = content.match(cdnRegex);

      if (match) {
        return match[1].includes('@{') ? match[1].split('{')[1].split('}')[0] : match[1];
      }
    }

    return null;
  } catch (error) {
    vscode.window.showInformationMessage(`Error finding Bootstrap CDN link: ${error}`);
    return null;
  }
};

const getCssFromCdn = async (url) => {
  try {
    let bootstrapVersion = null;
    const versionRegex = /(?:bootstrap[\/@]?)(\d+\.\d+\.\d+)/;
    const matches = url.match(versionRegex);

    if (matches && matches[1]) {
      bootstrapVersion = matches[1];
    }

    const response = await axios.get(
      `https://cdn.jsdelivr.net/npm/bootstrap@${bootstrapVersion}/dist/css/bootstrap.css`,
    );
    return response.data;
  } catch (error) {
    vscode.window.showInformationMessage(`Error fetching Bootstrap CSS from CDN: ${error}`);
    return null;
  }
};

const getCssFromLocalFiles = async () => {
  const htmlFiles = await vscode.workspace.findFiles('**/*.html');
  const bootstrapLinkRegex =
    /(?<!<!--.*)<link[^>]+href=["']((?!.*jsdelivr|.*webjars)[^"']*bootstrap[^"']*)["'](?!.*-->)/g;
  let searchPatterns = ['**/node_modules/bootstrap/dist/css/bootstrap.css'];

  for (const file of htmlFiles) {
    const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
    const bootstrapLinkMatches = [...fileContent.matchAll(bootstrapLinkRegex)];

    for (const match of bootstrapLinkMatches) {
      let bootstrapFilePath = match[1];

      bootstrapFilePath = bootstrapFilePath.includes('static') ? bootstrapFilePath.split("'")[1] : bootstrapFilePath;

      const normalizedPath = bootstrapFilePath.replace(/^\.\/|^\/|^\..\//, '');

      if (normalizedPath !== bootstrapFilePath) {
        searchPatterns.push(normalizedPath);
      }

      searchPatterns.push(bootstrapFilePath);
    }
  }

  try {
    let cssFound = false;

    for (const pattern of searchPatterns) {
      const bootstrapFiles = await vscode.workspace.findFiles(pattern);

      for (const file of bootstrapFiles) {
        const bootstrapPath = file.fsPath;

        if (fs.existsSync(bootstrapPath)) {
          const css = await fs.promises.readFile(bootstrapPath, 'utf8');
          cssFound = true;
          return css;
        } else {
          vscode.window.showInformationMessage(`Bootstrap file not found: ${bootstrapPath}`);
        }
      }
    }

    if (!cssFound) {
      vscode.window.showInformationMessage(`No Bootstrap CSS file was found in the specified paths.`);
    }
  } catch (error) {
    console.log('Error finding Bootstrap file in local files:', error);
    vscode.window.showInformationMessage(`Error finding Bootstrap file in local files: ${error}`);
  }
};

const getClasses = async () => {
  try {
    const bootstrapCdnLink = await getBootstrapCdnLink();

    const css = bootstrapCdnLink ? await getCssFromCdn(bootstrapCdnLink) : await getCssFromLocalFiles();

    if (css) {
      return extractCssClasses(css);
    } else {
      vscode.window.showInformationMessage(`No Bootstrap CSS found to extract classes from.`);
      return [];
    }
  } catch (error) {
    vscode.window.showInformationMessage(`Error getting Bootstrap classes: ${error}`);
    return [];
  }
};

module.exports = {
  getClasses,
};
