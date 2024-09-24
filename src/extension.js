const vscode = require('vscode');
const { RegisterCommands } = require('./commands');
const { DiagnosticCollection, ClearDiagnostics } = require('./diagnostics');

// Activate extension
function activate(context) {
    console.log('clutch-security "gitleaks-scan" extension is now active!');
    context.subscriptions.push(DiagnosticCollection);
    RegisterCommands(context);
}

// De-activate extension
function deactivate() {
    ClearDiagnostics();
}

module.exports = {
    activate,
    deactivate
};
