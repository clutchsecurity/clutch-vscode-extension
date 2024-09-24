const vscode = require('vscode');
const { RunGitleaksScan, FindingsSummary } = require('./util');
const { GetSecretsSummaryHtml } = require('./summary');

let workspaceFolder;
let summaryPanel = null;
let statusBarItem;

// Update the gitleaks secrets count in bottom bar
function updateStatusBar() {
    statusBarItem.text = `Secrets Scan Results: ${FindingsSummary.size}`;
}

/* 
    Register commands to the extension
    Available commands
        - gitleaks-scan.scanForSecrets
        - gitleaks-scan.showSummary
*/
function RegisterCommands(context) {
    // Initializes the status bar
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `Results: ${FindingsSummary.size}`;
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Gets the workspace folder from the configuration
    const config = vscode.workspace.getConfiguration('gitleaksScan');
    workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage("No folder is open in the workspace.");
        return;
    }

    const scanCommand = vscode.commands.registerCommand('gitleaks-scan.scanForSecrets', async () => {
        vscode.window.showInformationMessage(`Scanning ${workspaceFolder} for secrets for scanForSecrets module`);
        await RunGitleaksScan(workspaceFolder, true);
        updateStatusBar();
    });

    context.subscriptions.push(vscode.commands.registerCommand('gitleaks-scan.showSummary', async () => {
        try {
            vscode.window.showInformationMessage(`Scanning ${workspaceFolder} for secrets and preparing summary`);
            await RunGitleaksScan(workspaceFolder, true);
            UpdateSummary(context.subscriptions)
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating secrets summary: ${error.message}`);
        }
    }));

    context.subscriptions.push(scanCommand);
    // context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(() => handleDocumentChange(workspaceFolder)));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async () => handleDocumentSave(workspaceFolder)));
}

function UpdateSummary(subscriptions) {
    if (summaryPanel) {
        // If the panel is already open, update its content
        summaryPanel.webview.html = GetSecretsSummaryHtml();
        summaryPanel.reveal(vscode.ViewColumn.One);
    } else {
        // Create the panel
        summaryPanel = vscode.window.createWebviewPanel(
            'secretsSummary',
            'Secrets Summary',
            vscode.ViewColumn.One,
            {}
        );
        summaryPanel.webview.html = GetSecretsSummaryHtml();
        summaryPanel.onDidDispose(() => {
            summaryPanel = null;
        }, null, subscriptions);

        // Refresh content when the panel gets focus
        summaryPanel.onDidChangeViewState(e => {
            if (summaryPanel.visible) {
                refreshsummaryPanel();
            }
        });
        
        // // Future fix. Summary page not detecting this change to refresh the panel and data.
        // // For some reason, this isn't working. Debug later.
        // vscode.workspace.onDidDeleteFiles(e => {
        //     console.error('running on delete thing');
        //     RunGitleaksScan(workspaceFolder, true);
        //     refreshsummaryPanel();
        // });
    }
}

/// Refresh summary page with updated results
function refreshsummaryPanel() {
    summaryPanel.webview.html = GetSecretsSummaryHtml();
}

// handleDocumentChange might be an overhead, so not using this function
function handleDocumentChange(workspaceFolder) {
    console.log(`Change detected in the workspace: ${workspaceFolder}`);
    RunGitleaksScan(workspaceFolder, true);
}

// Run the scan, update the status bar when any document is saved in the workspace
async function handleDocumentSave(workspaceFolder) {
    console.log(`Document saved in workspace: ${workspaceFolder}`);
    await RunGitleaksScan(workspaceFolder, true);
    updateStatusBar();
}

module.exports = {
    RegisterCommands,
    UpdateSummary
};
