const vscode = require('vscode');
const DiagnosticCollection = vscode.languages.createDiagnosticCollection('gitleaks-scan');
const DiagnosticsMap = new Map(); // Map to store diagnostics per file

function ClearDiagnostics() {
    DiagnosticCollection.clear();
    DiagnosticCollection.dispose();
}

module.exports = {
    DiagnosticCollection,
    DiagnosticsMap,
    ClearDiagnostics
};
