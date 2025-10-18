; Inno Setup Script for FFUSION
; This script is used by the build-installer.js process.

; --- DYNAMIC DEFINITIONS ---
; These values are passed in by the build-installer.js script.
; The values here are fallbacks for manual compilation only.
#ifndef MyAppName
#define MyAppName "FFusion"
#endif
#ifndef MyAppVersion
#define MyAppVersion "1.6.0"
#endif
#ifndef MyAppPublisher
#define MyAppPublisher "Md Siam Mia"
#endif
#ifndef MyAppURL
#define MyAppURL "https://github.com/your-repo/ffusion"
#endif
#ifndef MyAppExeName
#define MyAppExeName "ffusion.exe"
#endif

; --- CORRECTED FALLBACK PATH ---
#ifndef SourceAppPath
#define SourceAppPath "release\ffusion-win32-x64"
#endif

#ifndef AppIcon
#define AppIcon "assets\icon.ico"
#endif

[Setup]
; --- CRITICAL FOR UPGRADES ---
AppId={{E6A4B318-9751-4B9F-848D-7F9C5E4A7D0A}}

AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=FFusion-Setup-v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
SetupIconFile={#AppIcon}
UninstallDisplayIcon={app}\{#MyAppExeName}
PrivilegesRequired=admin
CloseApplications=yes
RestartApplications=no
UninstallLogMode=append

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceAppPath}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  DeleteDataCheck: TNewCheckBox;

procedure InitializeUninstallProgressForm;
begin
  DeleteDataCheck := TNewCheckBox.Create(UninstallProgressForm);
  with DeleteDataCheck do
  begin
    Parent := UninstallProgressForm;
    Left := UninstallProgressForm.ProgressBar.Left;
    Top := UninstallProgressForm.ProgressBar.Top + UninstallProgressForm.ProgressBar.Height + 16;
    Width := UninstallProgressForm.ProgressBar.Width;
    Caption := 'Delete all user data (thumbnails, logs, etc.)';
    Checked := False;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataPath: String;
begin
  if (CurUninstallStep = usPostUninstall) and (DeleteDataCheck.Checked) then
  begin
    DataPath := ExpandConstant('{userappdata}\ffusion');
    if DirExists(DataPath) then
    begin
      Log(Format('User chose to delete user data. Deleting: %s', [DataPath]));
      DelTree(DataPath, True, True, True);
    end;
  end;
end;