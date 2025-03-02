import * as vscode from 'vscode';

let isExtensionActive: boolean = false;
let bootstrapVersion: string = '0';

type StatusCallback = (isActive: boolean) => void;
const statusCallbacks: StatusCallback[] = [];

const loadSettings = () => {
  try {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();
    const bootstrapConfig: { enable: boolean; bsVersion: string } | undefined = config.get('bootstrapIntelliSense');

    if (bootstrapConfig) {
      isExtensionActive = bootstrapConfig.enable || false;
      bootstrapVersion = bootstrapConfig.bsVersion || '0';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

const saveSettings = async () => {
  try {
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration();

    let bootstrapSettings: { enable: boolean; bsVersion: string } = config.get('bootstrapIntelliSense', {
      enable: false,
      bsVersion: '0',
    });

    if (bootstrapSettings.enable === true && bootstrapSettings.bsVersion === '0') {
      bootstrapSettings.bsVersion = '5.3.0';
      bootstrapVersion = '5.3.0';
    }

    bootstrapSettings = { enable: isExtensionActive, bsVersion: bootstrapVersion };

    await config.update('bootstrapIntelliSense', bootstrapSettings, vscode.ConfigurationTarget.Global);
  } catch (error) {
    console.error('Error saving settings:', error);
    vscode.window.showErrorMessage('Failed to save Bootstrap IntelliSense settings');
  }
};

const subscribeToExtensionStatus = (callback: StatusCallback) => {
  statusCallbacks.push(callback);
};

const createStatusBarItem = (): vscode.StatusBarItem => {
  loadSettings();

  const item: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  item.text = `${isExtensionActive ? '$(bootstrap-icon-enable)' : '$(bootstrap-icon-disable)'} ${
    bootstrapVersion !== '0' ? `Bootstrap v${bootstrapVersion}` : 'Bootstrap IntelliSense'
  }`;
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

  const mainSelection: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(mainOptions, {
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
        await toggleExtensionStatus(statusBarItem);
        break;
      case '$(versions) Select Bootstrap version':
        await showBootstrapVersionMenu(statusBarItem);
        break;
    }
  }
};

const setExtensionActive = async (statusBarItem: vscode.StatusBarItem) => {
  isExtensionActive = true;
  statusBarItem.text = `$(bootstrap-icon-enable) Bootstrap v${bootstrapVersion}`;
  statusCallbacks.forEach((callback) => callback(isExtensionActive));

  await saveSettings();
};

const toggleExtensionStatus = async (statusBarItem: vscode.StatusBarItem) => {
  isExtensionActive = !isExtensionActive;
  await saveSettings();
  statusCallbacks.forEach((callback) => callback(isExtensionActive));

  const status: string = isExtensionActive ? 'enabled' : 'disabled';
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
      showMainMenu(statusBarItem);
    } else {
      switch (majorSelection.label) {
        case '$(versions) Bootstrap 5':
          await showBootstrap5VersionMenu(statusBarItem);
          break;
        case '$(versions) Bootstrap 4':
          await showBootstrap4VersionMenu(statusBarItem);
          break;
        case '$(versions) Bootstrap 3':
          await showBootstrap3VersionMenu(statusBarItem);
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
      await showBootstrapVersionMenu(statusBarItem);
    } else {
      const versionNumber: string | undefined = versionSelection.label.split(' ').pop();
      bootstrapVersion = versionNumber + '.0';
      await setExtensionActive(statusBarItem);
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
      await showBootstrapVersionMenu(statusBarItem);
    } else {
      const versionNumber: string | undefined = versionSelection.label.split(' ').pop();
      bootstrapVersion = versionNumber + '.0';
      await setExtensionActive(statusBarItem);
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
      await showBootstrapVersionMenu(statusBarItem);
    } else {
      const versionNumber: string | undefined = versionSelection.label.split(' ').pop();
      bootstrapVersion = versionNumber + '.0';
      await setExtensionActive(statusBarItem);
      vscode.window.showInformationMessage(`Bootstrap version set to v${bootstrapVersion}`);
    }
  }
};

export { createStatusBarItem, showMainMenu, subscribeToExtensionStatus, bootstrapVersion, isExtensionActive };
