const vscode = require('vscode');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let analysisPanel = undefined;

function activate(context) {}

async function analyzeSelection(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (!selectedText.trim()) {
        vscode.window.showInformationMessage('No text selected.');
        return;
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing selection',
        cancellable: false
    }, async () => {
        try {
            let analysis = await analyzeText(selectedText);

            if (!analysis || analysis.length === 0) {
                vscode.window.showInformationMessage('No issues found in the selected text.');
                return;
            }

            const sortedAnalysis = analysis.sort((a, b) => a.lineNumber - b.lineNumber);
            showAnalysisWebview(sortedAnalysis, context, editor, selection);

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        }
    });
}

async function analyzeText(text) {
    const prompt = `Detect the language of the following code snippet. Then analyze following code for potential issues, edge cases, vulnerabilities, or improvements.
Number the lines starting from 1 in that particular language only, do not include any comments in the corrected code and only change the line which has incorrect code do not change any other lines. If a fix requires adding a NEW line (e.g., a missing header or semicolon), 
the "fix" field should include the original line plus the new line separated by space.Example: "original": "#include <stdio.h>","fix": "#include<stdio.h> #include <string.h>"

STRICT RULES FOR "FIX" GENERATION:
1. If the error includes VLA error then ignore it as its value will be determined at runtime and cannot be fixed by static code changes. Do not return any fix for VLA errors.
2. MULTI-LINE FIXES: If a fix requires adding new lines (like adding a missing bracket '}' or memory allocation), use the string literal "\\n" to denote a line break.
3. MISSING HEADERS: If a standard library function is used without its header (e.g., 'strcmp' without <string.h>), flag it as an error on Line 1. The fix should be: "#include <header.h>" + [original line 1 content].
4. FORMATTING: Return RAW JSON only. Do not use Markdown backticks. Do not add conversational text. Do not use \\n or line breaks in the "fix" field.

Response Format (JSON Array of Objects):
[
  {
    "lineNumber": number,
    "severity": "Error" | "Warning" | "Info",
    "finding": "Concise description of the specific error",
    "original": "The exact content of the problematic line",
    "fix": "The corrected code (use space for multiple lines)",
    "explanation": "Why this fix is necessary"
  }
]
If no critical issues are found, return [].

Code:
${text.split('\n').map((line, i) => `${i+1}: ${line}`).join('\n')}

Respond ONLY with valid JSON array of objects.`;

    const genAI = new GoogleGenerativeAI("AIzaSyB9D7rpSM7Iw2C-pHxahX0Z6gFDsPB2d0k");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;

        if (response.promptFeedback?.blockReason) {
            return [];
        }

        let jsonText = response.text().trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3, -3).trim();
        }

        return JSON.parse(jsonText);
    } catch (error) {
        return [];
    }
}

function showAnalysisWebview(analysis, context, editor, selection) {
    if (analysisPanel) {
        analysisPanel.reveal(vscode.ViewColumn.Beside);
    } else {
        analysisPanel = vscode.window.createWebviewPanel(
            'scanEdgeAnalysis',
            'ScanEdge Analysis',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        analysisPanel.onDidDispose(() => {
            analysisPanel = undefined;
        });

        context.subscriptions.push(
            analysisPanel.webview.onDidReceiveMessage(async message => {
                if (message.command === 'applyFix') {
                    let { lineNumber, fix } = message;

                    if (fix.includes('#include') && fix.includes('\n')) {
                        const parts = fix.split('\n');
                        if (parts.length >= 2) {
                            fix = parts.join(' ');
                        }
                    }

                    const targetLineIndex = selection.start.line + lineNumber - 1;

                    let targetLine;
                    try {
                        targetLine = editor.document.lineAt(targetLineIndex);
                    } catch (err) {
                        vscode.window.showErrorMessage(`Cannot find target line ${lineNumber}`);
                        return;
                    }

                    const success = await editor.edit(editBuilder => {
                        editBuilder.replace(targetLine.range, fix);
                    });

                    if (success) {
                        analysisPanel.webview.postMessage({
                            command: 'fixSuccess',
                            lineNumber
                        });
                        vscode.window.showInformationMessage(`Fix applied to line ${lineNumber}`);
                    } else {
                        vscode.window.showErrorMessage('Failed to apply fix');
                    }
                }
            })
        );
    }

    analysisPanel.webview.html = getAnalysisWebviewContent(analysis);
}

function getAnalysisWebviewContent(analysis) {
    const filtered = analysis.filter(item => item.severity.toLowerCase() !== 'info');
    const totalErrors = filtered.length;

    const rows = filtered.map(item => {
        const fixAttr = escapeHtml(item.fix).replace(/"/g, '&quot;').replace(/\n/g, ' ');
        const fixDisplay = escapeHtml(item.fix).replace(/\n/g, '<br>');

        return `
        <tr data-line="${item.lineNumber}">
            <td>${item.lineNumber}</td>
            <td class="severity-cell ${item.severity.toLowerCase()}">${escapeHtml(item.severity)}</td>
            <td>${escapeHtml(item.finding)}</td>
            <td><code>${fixDisplay}</code></td>
            <td><button class="fix-btn" data-line="${item.lineNumber}" data-fix="${fixAttr}" onclick="handleFix(this)">Fix</button></td>
        </tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
        .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .stats-and-chart { display: flex; align-items: center; gap: 15px; }
        .stats-wrapper { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-weight: bold; text-align: right; }
        .errors-found-all { color: #f14c4c; }
        .errors-fixed-all { color: #4ec9b0; }
        .progress-ring { transform: rotate(-90deg); }
        .progress-ring__circle { transition: stroke-dashoffset 0.35s; transform-origin: 50% 50%; stroke-linecap: round; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid var(--vscode-editor-lineHighlightBorder); padding: 10px; text-align: left; }
        th { background: var(--vscode-titleBar-activeBackground); }
        .fixed-tick { color: #4ec9b0 !important; background: rgba(78, 201, 176, 0.1); text-align: center; font-weight: bold; }
        .fix-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; cursor: pointer; border-radius: 3px; }
        .fix-btn:disabled { background: #4ec9b0 !important; color: white; cursor: default; }
        code { background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header-container">
        <h2>ScanEdge Analysis Results</h2>
        <div class="stats-and-chart">
            <div class="stats-wrapper">
                <div class="errors-found-all">Errors Found: <span id="remaining-count">${totalErrors}</span>/${totalErrors}</div>
                <div class="errors-fixed-all">Errors Fixed: <span id="fixed-count">0</span>/${totalErrors}</div>
            </div>
            <svg class="progress-ring" width="60" height="60">
                <circle class="progress-ring__circle" stroke="#f14c4c" stroke-width="6" fill="transparent" r="26" cx="30" cy="30"/>
                <circle id="progress-bar" class="progress-ring__circle" stroke="#4ec9b0" stroke-width="6" stroke-dasharray="163.36" stroke-dashoffset="163.36" fill="transparent" r="26" cx="30" cy="30"/>
            </svg>
        </div>
    </div>
    <table>
        <thead>
            <tr><th>Line</th><th>Severity</th><th>Finding</th><th>Fixed Code</th><th>Action</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;">No issues found</td></tr>'}</tbody>
    </table>
    <script>
        const vscode = acquireVsCodeApi();
        const total = ${totalErrors};
        let fixed = 0;
        const circle = document.getElementById('progress-bar');
        const circumference = 2 * Math.PI * 26;
        function setProgress(currentFixed) {
            const percent = total > 0 ? currentFixed / total : 1;
            const offset = circumference - (percent * circumference);
            circle.style.strokeDashoffset = offset;
        }
        function handleFix(btn) {
            if (btn.disabled) return;
            btn.disabled = true;
            btn.textContent = 'Applying...';
            vscode.postMessage({
                command: 'applyFix',
                lineNumber: parseInt(btn.dataset.line),
                fix: btn.dataset.fix
            });
        }
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'fixSuccess') {
                const row = document.querySelector(\`tr[data-line="\${msg.lineNumber}"]\`);
                if (row) {
                    const btn = row.querySelector('.fix-btn');
                    if (!btn.classList.contains('already-counted')) {
                        fixed++;
                        document.getElementById('fixed-count').textContent = fixed;
                        document.getElementById('remaining-count').textContent = total - fixed;
                        btn.classList.add('already-counted');
                        setProgress(fixed);
                    }
                    const cell = row.querySelector('.severity-cell');
                    if (cell) { cell.className = 'severity-cell fixed-tick'; cell.innerHTML = '✓'; }
                    btn.textContent = 'Fixed';
                }
            }
        });
    </script>
</body>
</html>`;
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

module.exports = {
    activate,
    analyzeSelection
};