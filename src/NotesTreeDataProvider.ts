import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class NotesTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> 
    = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> 
    = this._onDidChangeTreeData.event;

    private notesDirectory: string;
    private dateFormat: string;

  constructor(config: vscode.WorkspaceConfiguration) {
    this.notesDirectory = config.get<string>('notesDirectory') || '.';
    this.dateFormat = config.get<string>('dateFormat') || 'YYYY-MM-DD';
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
    if (!element) {
        return this.getYearItems();
    }

    // If the element is a YearItem, return its months
    if (element instanceof YearItem) {
        return element.getMonthItems();
    }

    // If the element is a MonthItem, return its notes
    if (element instanceof MonthItem) {
        return element.getNoteItems();
    }

    // Otherwise, no children
    return [];
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  private getYearItems(): vscode.TreeItem[] {
    if (!fs.existsSync(this.notesDirectory)) {
      return [];
    }
    const files = fs.readdirSync(this.notesDirectory);

    let regexString: string = '';
    let datePartCount = 0;
    let datePartIndexMap: Record<string, number[]> = {};
    for (let i = 0; i < this.dateFormat.length; i++) {
        const char = this.dateFormat[i];
        switch(char){
          case 'D':
            if(!datePartIndexMap['D']){
                datePartIndexMap['D'] = [];
            }
            datePartIndexMap['D'].push(i);
            datePartCount++;
            break;

          case 'M':
            if(!datePartIndexMap['M']){
                datePartIndexMap['M'] = [];
            }
            datePartIndexMap['M'].push(i);
            datePartCount++;
            break;

          case 'Y':
            if(!datePartIndexMap['Y']){
                datePartIndexMap['Y'] = [];
            }
            datePartIndexMap['Y'].push(i);
            datePartCount++;
            break;

          default:
            if (datePartCount > 0){
                regexString += `\\d{${datePartCount}}`;
                datePartCount = 0;
            }

            regexString += char;
            break;
        }
    }

    if (datePartCount > 0){
        regexString += `\\d{${datePartCount}}`;
        datePartCount = 0;
    }

    const dateRegex = new RegExp(regexString);

    const filesByYear: Record<string, string[]> = {};
    for (const file of files) {
      const match = file.match(dateRegex);

      let year = 'NO-YEAR';

      if (match && datePartIndexMap['Y']){
        year = '';
        datePartIndexMap['Y'].forEach(yearIndex => {
            year += match[0][yearIndex];
        });

        console.log(year)
      }

      if (!filesByYear[year]) {
        filesByYear[year] = [];
      }

      filesByYear[year].push(file);
    }

    const yearItems = Object.keys(filesByYear).sort().map(year => {
        return new YearItem(year, filesByYear[year], this.notesDirectory, dateRegex, datePartIndexMap);
    });

    return yearItems;
  }
}

export class YearItem extends vscode.TreeItem {
    constructor(
      public readonly year: string,
      private filesForYear: string[],
      private notesDirectory: string,
      private dateRegex : RegExp,
      private datePartIndexMap : Record<string, number[]>
    ) {
      super(year, vscode.TreeItemCollapsibleState.Collapsed);

      this.iconPath = new vscode.ThemeIcon('calendar'); 
    }
  
    public getMonthItems(): MonthItem[] {
        const filesByMonth: Record<string, string[]> = {};
    
        for (const file of this.filesForYear) {
            let month = '00';
            const match = file.match(this.dateRegex);
            if (match && this.datePartIndexMap['M']){
                month = '';
                this.datePartIndexMap['M'].forEach(monthIndex => {
                    month += match[0][monthIndex];
                });
            }

            if (!filesByMonth[month]) {
                filesByMonth[month] = [];
            }

            filesByMonth[month].push(file);
        }
  
        // Build a MonthItem for each month
        return Object.keys(filesByMonth).sort().map(m => {
            return new MonthItem(this.year, m, filesByMonth[m], this.notesDirectory);
        });
    }
}

export class MonthItem extends vscode.TreeItem {
    constructor(
      public readonly year: string,
      public readonly month: string,
      private filesForMonth: string[],
      private notesDir: string
    ) {
        super(`${getMonthName(month)}`, vscode.TreeItemCollapsibleState.Collapsed);
        this.iconPath = new vscode.ThemeIcon('notebook'); 
    }
  
    public getNoteItems(): NoteItem[] {
        // Return a TreeItem for each file in this month
        return this.filesForMonth.sort().map(file => {
            const filePath = path.join(this.notesDir, file);
            return new NoteItem(file, filePath);
        });
    }
}

export class NoteItem extends vscode.TreeItem {
  constructor(public fileName: string, public filePath: string) {
    super(fileName, vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: 'quick-notes.openNoteFile',
      title: 'Open Note',
      arguments: [this.filePath]
    };

    this.iconPath = new vscode.ThemeIcon('file-text');
  }
}


// Utility: convert '02' => 'February', etc.
function getMonthName(month: string): string {
    const monthIndex = parseInt(month, 10);
    const names = [
      'NO-MONTH', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return names[monthIndex] ?? month;
  }