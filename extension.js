const vscode = require('vscode');
const logicA = require('./extensionA');
const logicB = require('./extensionB');

function activate(context) {
    let cmdA = vscode.commands.registerCommand('profix.analyzeSelection', async function () {
        await logicA.analyzeSelection(context);
    });

    let cmdB = vscode.commands.registerCommand('profix.analyzeEdgeCases', async function () {
        await logicB.analyzeEdgeCases(context);
    });

    context.subscriptions.push(cmdA, cmdB);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};