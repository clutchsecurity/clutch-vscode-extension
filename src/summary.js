const { FindingsSummary } = require('./util');

function GetSecretsSummaryHtml() {
    const rows = Array.from(FindingsSummary).map(secret => `
        <tr>
            <td>${secret.file}</td>
            <td>${secret.line + 1}</td>
            <td>${secret.secret}</td>
            <td>${secret.ruleID}</td>
        </tr>
    `).join('');

    return `
        <html>
            <head>
                <style>
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Secrets Found</h1>
                <table>
                    <tr>
                        <th>File</th>
                        <th>Line</th>
                        <th>Secret</th>
                        <th>Rule ID</th>
                    </tr>
                    ${rows}
                </table>
            </body>
        </html>
    `;
}

module.exports = {
    GetSecretsSummaryHtml
}
