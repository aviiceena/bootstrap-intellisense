import * as vscode from 'vscode';

let isExtensionActive = false;
let bootstrapVersion: Number;

type StatusCallback = (isActive: boolean) => void;
const statusCallbacks: StatusCallback[] = [];

const subscribeToExtensionStatus = (callback: StatusCallback) => {
  statusCallbacks.push(callback);
};

const createStatusBarItem = (): vscode.StatusBarItem => {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = `${isExtensionActive ? '$(bootstrap-icon-enable)' : '$(bootstrap-icon-disable)'} Bootstrap IntelliSense`;
  item.tooltip = 'Click to show the main menu';
  item.command = 'bootstrap-intelliSense.showMainMenu';
  item.show();
  return item;
};

const showMainMenu = async (statusBarItem: vscode.StatusBarItem) => {
  const mainOptions: vscode.QuickPickItem[] = [
    {
      label: '$(versions) Select Bootstrap version',
    },
    {
      label: '$(sparkle) From local files for offline use',
      description: 'coming soon',
    },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    {
      label: `${
        isExtensionActive
          ? '$(bootstrap-icon-disable) Disable completion'
          : '$(bootstrap-icon-enable) Enable completion'
      }`,
    },
  ];

  const mainSelection = await vscode.window.showQuickPick(mainOptions, {
    title: 'Bootstrap IntelliSense Menu',
    placeHolder: 'Choose an option',
  });

  if (mainSelection) {
    switch (mainSelection.label) {
      case `${
        isExtensionActive
          ? '$(bootstrap-icon-disable) Disable completion'
          : '$(bootstrap-icon-enable) Enable completion'
      }`:
        toggleExtensionStatus(statusBarItem);
        break;
      case '$(versions) Select Bootstrap version':
        showBootstrapVersionMenu(statusBarItem);
        break;
    }
  }
};

const setExtensionActive = (statusBarItem: vscode.StatusBarItem) => {
  isExtensionActive = true;
  statusBarItem.text = `$(bootstrap-icon-enable) Bootstrap v${bootstrapVersion}`;
  statusCallbacks.forEach((callback) => callback(isExtensionActive));
};

const toggleExtensionStatus = (statusBarItem: vscode.StatusBarItem) => {
  isExtensionActive = !isExtensionActive;
  statusCallbacks.forEach((callback) => callback(isExtensionActive));

  const status = isExtensionActive ? 'enabled' : 'disabled';
  vscode.window.showInformationMessage(`Bootstrap IntelliSense is ${status}`);
  statusBarItem.text = isExtensionActive
    ? `$(bootstrap-icon-enable) ${bootstrapVersion ? `Bootstrap v${bootstrapVersion}` : 'Bootstrap IntelliSense'}`
    : `$(bootstrap-icon-disable) ${bootstrapVersion ? `Bootstrap v${bootstrapVersion}` : 'Bootstrap IntelliSense'}`;
};

const showBootstrapVersionMenu = async (statusBarItem: vscode.StatusBarItem) => {
  const bootstrapMajorOptions: vscode.QuickPickItem[] = [
    { label: '$(arrow-left) Back' },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    { label: '$(versions) Bootstrap 5' },
    { label: '$(versions) Bootstrap 4' },
    { label: '$(versions) Bootstrap 3' },
  ];

  const majorSelection = await vscode.window.showQuickPick(bootstrapMajorOptions, {
    title: 'Select Bootstrap version',
    placeHolder: 'Choose a version of Bootstrap',
  });

  if (majorSelection) {
    if (majorSelection.label === '$(arrow-left) Back') {
      vscode.commands.executeCommand('bootstrap-intellisense.showMainMenu');
    } else {
      switch (majorSelection.label) {
        case '$(versions) Bootstrap 5':
          showBootstrap5VersionMenu(statusBarItem);
          break;
        case '$(versions) Bootstrap 4':
          showBootstrap4VersionMenu(statusBarItem);
          break;
        case '$(versions) Bootstrap 3':
          showBootstrap3VersionMenu(statusBarItem);
          break;
      }
    }
  }
};

const showBootstrap5VersionMenu = async (statusBarItem: vscode.StatusBarItem) => {
  const version5Options: vscode.QuickPickItem[] = [
    { label: '$(arrow-left) Back' },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    { label: '$(add) Bootstrap 5.3' },
    { label: '$(add) Bootstrap 5.2' },
    { label: '$(add) Bootstrap 5.1' },
    { label: '$(add) Bootstrap 5.0' },
  ];

  const versionSelection = await vscode.window.showQuickPick(version5Options, {
    title: 'Select Bootstrap 5 version',
    placeHolder: 'Choose a version of Bootstrap 5',
  });

  if (versionSelection) {
    if (versionSelection.label === '$(arrow-left) Back') {
      showBootstrapVersionMenu(statusBarItem);
    } else {
      bootstrapVersion = Number(versionSelection.label.split(' ').pop());
      setExtensionActive(statusBarItem);
      vscode.window.showInformationMessage(`Bootstrap version set to v${bootstrapVersion}`);
    }
  }
};

const showBootstrap4VersionMenu = async (statusBarItem: vscode.StatusBarItem) => {
  const version4Options: vscode.QuickPickItem[] = [
    { label: '$(arrow-left) Back' },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    { label: '$(add) Bootstrap 4.6' },
    { label: '$(add) Bootstrap 4.5' },
    { label: '$(add) Bootstrap 4.4' },
    { label: '$(add) Bootstrap 4.3' },
    { label: '$(add) Bootstrap 4.2' },
    { label: '$(add) Bootstrap 4.1' },
    { label: '$(add) Bootstrap 4.0' },
  ];

  const versionSelection = await vscode.window.showQuickPick(version4Options, {
    title: 'Select Bootstrap 4 version',
    placeHolder: 'Choose a version of Bootstrap 4',
  });

  if (versionSelection) {
    if (versionSelection.label === '$(arrow-left) Back') {
      showBootstrapVersionMenu(statusBarItem);
    } else {
      bootstrapVersion = Number(versionSelection.label.split(' ').pop());
      setExtensionActive(statusBarItem);
      vscode.window.showInformationMessage(`Bootstrap version set to v${bootstrapVersion}`);
    }
  }
};

const showBootstrap3VersionMenu = async (statusBarItem: vscode.StatusBarItem) => {
  const version3Options: vscode.QuickPickItem[] = [
    { label: '$(arrow-left) Back' },
    {
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
    },
    { label: '$(add) Bootstrap 3.4' },
    { label: '$(add) Bootstrap 3.3' },
  ];

  const versionSelection = await vscode.window.showQuickPick(version3Options, {
    title: 'Select Bootstrap 3 version',
    placeHolder: 'Choose a version of Bootstrap 3',
  });

  if (versionSelection) {
    if (versionSelection.label === '$(arrow-left) Back') {
      showBootstrapVersionMenu(statusBarItem);
    } else {
      bootstrapVersion = Number(versionSelection.label.split(' ').pop());
      setExtensionActive(statusBarItem);
      vscode.window.showInformationMessage(`Bootstrap version set to v${bootstrapVersion}`);
    }
  }
};

export {
  createStatusBarItem,
  showMainMenu,
  toggleExtensionStatus,
  subscribeToExtensionStatus,
  bootstrapVersion,
  isExtensionActive,
};
