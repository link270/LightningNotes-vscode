import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { NotesTreeDataProvider } from './NotesTreeDataProvider';

function getDefaultDocumentsFolder(): string {
  const home = os.homedir();
  return path.join(home, 'Documents'); 
}

async function getDefaultTemplate(context: vscode.ExtensionContext, templateFileName: string): Promise<string> {
  // Construct a URI for the template file that’s inside your extension
  const templateUri = vscode.Uri.joinPath(context.extensionUri, 'templates', templateFileName);
  // Convert URI to a local file path
  const templatePath = templateUri.fsPath;
  // Read the template file from disk
  return fs.readFileSync(templatePath, 'utf8');
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('quickNotes');
  const notesProvider = new NotesTreeDataProvider(config);
  const notesTreeView = vscode.window.createTreeView('quickNotesView', {treeDataProvider: notesProvider});
  /*
  // Setup command for creating and/or opening a new/existing note.
  */
  const openNoteDisposable = vscode.commands.registerCommand('quick-notes.openNote', async () => {
    try {
      // Read config from settings
      // const config = vscode.workspace.getConfiguration('quickNotes');
      let notesDir: string | undefined = config.get('notesDirectory');
      const templateFileName: string = config.get('templateFileName') || 'quick-notes-template.md';
      let defaultTemplate = await getDefaultTemplate(context, templateFileName);
      const fileNameFormat: string = config.get("fileNameFormat") || '{{TODAY}}_Lightning-Note';
      const dateFormat: string = config.get('dateFormat') || 'YYYY-MM-DD';
      const fileExtension: string = config.get('fileExtension') || '.md';

      if (!notesDir || !fs.existsSync(notesDir)) {
        const defaultDocsPath = getDefaultDocumentsFolder();
        const result = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select Daily Notes Root Folder',
          defaultUri: vscode.Uri.file(defaultDocsPath)
        });

        if (result && result.length > 0) {
          notesDir = result[0].fsPath;
          await config.update('notesDirectory', notesDir, true);
        } else {
          vscode.window.showErrorMessage('No folder selected. Quick Notes command canceled.');
          return;
        }
      }

      // Get todays date and split it into parts.
      const now = new Date();
      const year = now.getFullYear().toString();
      let month = (now.getMonth() + 1).toString();
      if (month.length < 2) month = '0' + month;
      let day = now.getDate().toString();
      if (day.length < 2) day = '0' + day;

      // Parse the configured date format and add the correct date values.
      // The way this is setup the MM, DD, and YYYY values could be set in any order in the Date format.
      // This is nice, but also means a format of MD-YYDYM-Y would technically be valid.
      let dayIndex = 0;
      let monthIndex = 0;
      let yearIndex = ((dateFormat.split('Y').length - 1) < 4) ? 2 : 0;
      let dateString = ``;
      for (const char of dateFormat){
        switch(char){
          case 'D':
            const curDayPart: string = day[dayIndex] ? day[dayIndex] : '';
            dateString += curDayPart;
            dayIndex++;
            break;
          case 'M':
            const curMonthPart: string = month[monthIndex] ? month[monthIndex] : '';
            dateString += curMonthPart;
            monthIndex++;
            break;
          case 'Y':
            const curYearPart: string = year[yearIndex] ? year[yearIndex] : '';
            dateString += curYearPart;
            yearIndex++;
            break;
          default:
            dateString += char;
            break;
        }
      }

      const todayFileName = `${fileNameFormat.replace('{{TODAY}}', dateString)}${fileExtension.includes('.') ? fileExtension : '.' + fileExtension}`;
      const todayFilePath = path.join(notesDir, todayFileName);

      // Check if the file already exists
      if (!fs.existsSync(todayFilePath)) {
        // If not, create it and write the default template
        vscode.window.showInformationMessage('Creating today’s note...');
        defaultTemplate = defaultTemplate.replace('{{TODAY}}', dateString)
        fs.writeFileSync(todayFilePath, defaultTemplate, { encoding: 'utf-8' });

        // Refresh activitybar notes list.
        if(notesProvider){
          notesProvider.refresh();
        }
      }
      else
      {
        vscode.window.showInformationMessage('Opening today’s note...');
      }

      // Open the existing or newly created file
      const document = await vscode.workspace.openTextDocument(todayFilePath);
      await vscode.window.showTextDocument(document);

    } catch (error) {
      vscode.window.showErrorMessage(`Could not open daily note: ${error}`);
    }
  });

  /*
  // Setup command for opening the settings menu for the// Register the command
  */
  const openSettingsDisposable = vscode.commands.registerCommand('quick-notes.openSettings', async () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'quickNotes');
  });

  /*
  // Setup Command for opening the raw template file.
  */

  const openTemplateDisposable = vscode.commands.registerCommand('quick-notes.openTemplateFile', async () => {
    try{
      const config = vscode.workspace.getConfiguration('quickNotes');
      const templateFileName: string = config.get('templateFileName') || 'quick-notes-template.md';
      const templateUri = vscode.Uri.joinPath(context.extensionUri, 'templates', templateFileName);
      // Convert URI to a local file path
      const templatePath = templateUri.fsPath;

      const document = await vscode.workspace.openTextDocument(templatePath);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Could not open quick notes template file: ${error}`);
    }
  });

  /*
  // Setup status bar icon.
  */
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, // or Right
    100 // priority: smaller = further left if alignment is the same
  );

  statusBarItem.text = '$(notebook) Lightning Note'; 
  // There are many built-in icons you can use, e.g. "$(notebook)", "$(pencil)", etc.
  // Full list: https://code.visualstudio.com/api/references/icons
  statusBarItem.tooltip = 'Open Today’s Lightning Note';
  statusBarItem.command = 'quick-notes.openNote'; // command ID you registered
  statusBarItem.show();

  /*
  // Activity bar tab commands
  */
  const openNoteActivityBarDisposable = vscode.commands.registerCommand('quick-notes.openNoteFile', (filePath: string) => {
    vscode.workspace.openTextDocument(filePath).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  })
  
  const refreshActivityBarDisposable = vscode.commands.registerCommand('quick-notes.refreshNotes', () => {
    notesProvider.refresh();
  })
  
  const alwaysRefresh: boolean = config.get('autoRefreshAlwaysOn') || true;
  if(alwaysRefresh){
    const fileExtension: string = config.get('fileExtension') || '.md';
    const notesDir: string = config.get('notesDirectory') || '.';
    // Setup file watcher to add new files to the tree when new files are added to the folder.
    const watcher = fs.watch(notesDir, (eventType, filename) => {
      // if filename ends with .md or .txt, etc., refresh
      if (filename.endsWith(fileExtension)) {
        notesProvider.refresh();
      }

      context.subscriptions.push({dispose: () => watcher.close()});
    });
  }

  const highlightNoteActivityBarDisposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (!editor?.document) {
      return;
    }

    const fsPath = editor.document.uri.fsPath;

    const noteItem = notesProvider.getNoteItemForFile(fsPath);
    if (noteItem) {
      // Reveal the note in the tree
      notesTreeView.reveal(noteItem, {
        select: true,
        focus: false,
        expand: true
      });
    }
  })


  context.subscriptions.push(openNoteDisposable);
  context.subscriptions.push(openSettingsDisposable);
  context.subscriptions.push(openTemplateDisposable);
  context.subscriptions.push(statusBarItem);
  context.subscriptions.push(openNoteActivityBarDisposable);
  context.subscriptions.push(refreshActivityBarDisposable);
  context.subscriptions.push(highlightNoteActivityBarDisposable);
};

export function deactivate() {
  // Cleanup if necessary
};

