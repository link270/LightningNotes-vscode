# LightningNotes-vscode
An extension for VS Code that makes it easy to quickly create and open a notes file for each day.

The following settings can all be configured:
- Date Format: Change the format in which the current date is displayed. (I.E. MM-DD-YYYY)
- File Extension: File extension for your lightning notes (e.g., .md, .txt, etc.).
- File Name Format: Format of the note file name. For example can be used to add a prefix or suffix to the notes file names.
- Notes Directory: The root directory the notes will be saved to.
- Template File Name: The filename for the template file that will be used as a base when making a new note file. Template file must be inside of the extensions templates folder.

**Use the Lightning Notes: Open Settings command to quickly access these settings.**

The default markdown template file ('lightning-notes-template.md') can be freely edited. This template is used when a new note is made. Any instance of {{TODAY}} in the template folder will be replaced by the current date formatted according to the date formate setting.