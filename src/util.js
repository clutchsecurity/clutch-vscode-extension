const vscode = require('vscode');
const { exec } = require('child_process');
const { DiagnosticCollection, DiagnosticsMap } = require('./diagnostics');
const path = require('path');

let FindingsSummary = new Set();

function getExecutablePrefix() {
    let platform = process.platform;
    let arch = process.arch;

    // Normalize platform and architecture names to match the naming convention of the executables
    if (platform === 'darwin') {
        platform = 'darwin';
    } else if (platform === 'linux') {
        platform = 'linux';
    } else if (platform === 'win32') {
        platform = 'windows';
    }

    // Normalize architecture, if necessary
    if (arch === 'x32' || arch === 'ia32') {
        arch = 'x32';
    } else if (arch === 'x64') {
        arch = 'x64';
    } else if (arch.includes('arm')) {
        if (arch === 'arm64') {
            arch = 'arm64';
        } else {
            arch = `armv${arch.slice(-1)}`; // Extracts '6' or '7' from 'armv6' or 'armv7'
        }
    }

    // Construct the executable filename
    const executableName = `gitleaks_8.19.2_${platform}_${arch}`;
    const executableExtension = platform === 'windows' ? '.exe' : '';

    return executableName + executableExtension;
}

// Run gitleaks scan on all files in the workspace
function RunGitleaksScan(workspacePath, isWorkspaceScan = false) {
    return new Promise((resolve, reject) => {
        if (!workspacePath) {
            console.error('No workspace path provided for Gitleaks scan.');
            return;
        }

        const executablePrefix = getExecutablePrefix();
        const executablePath = path.join(`${__dirname}/../executables`, executablePrefix);

        const command = `${executablePath} detect --log-level error --source ${workspacePath} --no-color --no-banner -v --no-git`;

        exec(command, (err, stdout, stderr) => {
            if (stderr) {
                const errorMessage = `Failed to run the query: ${stderr}`;
                vscode.window.showErrorMessage(errorMessage);
                console.error(errorMessage);
                reject(new Error(stderr || err.message));
                return;
            }

            if (stdout) {
                parseAndHighlightFindings(stdout, isWorkspaceScan);
                resolve(stdout);
            } else {
                vscode.window.showInformationMessage(`No secrets found in ${workspacePath}`);
                FindingsSummary = new Set();
                if (isWorkspaceScan) {
                    DiagnosticCollection.clear();
                }
                resolve(stdout);
            }
        });
    });
}

// Function to parse gitleaks output and highlight findings in VS Code
function parseAndHighlightFindings(output, isWorkspaceScan) {
    const findings = output.split(/\n\n/g).filter(f => f.includes('Finding:'));  // Split findings by empty lines
    DiagnosticCollection.clear();  // Clear previous diagnostics
    DiagnosticsMap.clear(); // Clear the diagnostics map

    if (isWorkspaceScan) {
        DiagnosticCollection.clear(); // Clear previous workspace diagnostics before setting new ones
        FindingsSummary.clear();
    }

    const fileMap = new Map();

    findings.forEach(finding => {
        const secretMatch = finding.match(/Secret:\s+(.*)/);
        const fileMatch = finding.match(/File:\s+(.*)/);
        const lineMatch = finding.match(/Line:\s+(\d+)/);  // Ensure line numbers are parsed correctly
        const ruleIDMatch = finding.match(/RuleID:\s+(.*)/);  // Ensure line numbers are parsed correctly

        if (secretMatch && fileMatch && lineMatch) {
            const secret = secretMatch[1];
            const file = fileMatch[1];
            const line = parseInt(lineMatch[1], 10) - 1;  // Line numbers in VS Code start from 0
            const fileUri = file;
            const ruleID = ruleIDMatch[1];

            FindingsSummary.add({
                file: fileUri,
                line: line,
                secret: secret,
                ruleID: ruleID
            });

            // Accumulate diagnostics per file in the map
            let diagnostics = DiagnosticsMap.get(fileUri) || [];
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, 150000000)), // For now highlighting whole line because there's no way to determine exact column position with gitleaks. It's possible with vscode extension but it can get resource intensive. Raise a PR to gitleaks later.
                `Potential ${ruleID} type secret detected: ${secret}`,
                vscode.DiagnosticSeverity.Error
            );
            diagnostics.push(diagnostic);
            DiagnosticsMap.set(fileUri, diagnostics);  // Store all diagnostics for the file
        }
    });

    DiagnosticsMap.forEach((diagnostics, fileUri) => {
        if (!fileMap.has(fileUri)) {
            fileMap.set(fileUri, []); // Initialize an empty array if not present
        }

        fileMap.set(fileUri, diagnostics); // Update the map with the new array
    });

    fileMap.forEach((diagnostics, fileUri) => {
        DiagnosticCollection.set(vscode.Uri.file(fileUri), diagnostics);
    })

    // Finally, highlight the secrets for each file
    DiagnosticsMap.forEach((diagnostics, fileUri) => {
        highlightSecretsInFile(fileUri, diagnostics);
    });
    
}

function highlightSecretsInFile(fileUri, diagnostics) {
    // Open the text document in the background without showing it
    vscode.workspace.openTextDocument(fileUri).then((doc) => {
        // Find if this document is currently open in any editor
        const editor = vscode.window.visibleTextEditors.find(ed => ed.document.uri.toString() === fileUri.toString());

        if (editor) {
            // Prepare decorations for all diagnostics
            const decorations = [];  // Collect all ranges for secrets to highlight
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 0, 0, 0.3)',
                border: '1px solid red'
            });

            diagnostics.forEach(diagnostic => {
                decorations.push({ range: diagnostic.range });
            });

            // Apply all decorations at once
            editor.setDecorations(decorationType, decorations);
        } else {
            // If the document is not currently open in any editor, do nothing
            // or handle this case differently depending on your needs
            console.log("Document not currently viewed, skipping decorations.");
        }
    });
}


module.exports = {
    RunGitleaksScan,
    FindingsSummary
};
