const fs = require('fs');
const vscode = require('vscode');

const getBootstrapVersionFromIndexHtml = async () => {
  try {
    const htmlFiles = await vscode.workspace.findFiles('**/*.html');
    const bootstrapLinkRegex = /(?<!<!--.*)<link[^>]+href=["']((?!cdn)[^"']*bootstrap[^"']*\.css)["'](?!.*-->)/g;
    const bootstrapVersionRegex = /\d+\.\d+\.\d+/;

    for (const file of htmlFiles) {
      const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
      const bootstrapLinkMatches = [...fileContent.matchAll(bootstrapLinkRegex)];

      for (const match of bootstrapLinkMatches) {
        const versionMatch = match[1].match(bootstrapVersionRegex);

        if (versionMatch) {
          return versionMatch[0];
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

const getBootstrapVersionFromLocalCssFile = async () => {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const htmlFiles = await vscode.workspace.findFiles('**/*.html');
    const bootstrapLinkRegex = /(?<!<!--.*)<link[^>]+href=["']((?!jsdelivr)[^"']*\bbootstrap\b[^"']*)["'](?!.*-->)/g;
    const bootstrapVersionRegex = /Bootstrap\s+v(\d+\.\d+\.\d+)/g;
    let searchPatterns = ['**/node_modules/bootstrap/dist/css/bootstrap.css'];

    for (const file of htmlFiles) {
      const fileContent = await fs.promises.readFile(file.fsPath, 'utf8');
      const bootstrapLinkMatches = [...fileContent.matchAll(bootstrapLinkRegex)];

      for (const match of bootstrapLinkMatches) {
        const bootstrapFilePath = match[1];
        const fileUri = vscode.Uri.file(workspaceFolders[0].uri.path + bootstrapFilePath);
        searchPatterns.push(fileUri);
      }
    }
    for (const pattern of searchPatterns) {
      const bootstrapFiles = await vscode.workspace.findFiles(pattern);

      for (const file of bootstrapFiles) {
        const bootstrapFileContent = await fs.promises.readFile(file.fsPath, 'utf8');
        const versionMatch = bootstrapFileContent.match(bootstrapVersionRegex);
        if (versionMatch) {
          return versionMatch[0].split('v')[1];
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

const setStatusBarItem = async () => {
  try {
    let version = await getBootstrapVersionFromIndexHtml();

    if (!version) {
      version = await getBootstrapVersionFromLocalCssFile();
    }

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
    statusBarItem.text = version ? `$(bootstrap-icon) Bootstrap v${version}` : '';
    statusBarItem.tooltip = 'Your current Bootstrap version in this project';
    statusBarItem.show();
  } catch (error) {
    vscode.window.showWarningMessage(`Error setting status bar item: ${error}`);
  }
};

module.exports = {
  setStatusBarItem,
};
