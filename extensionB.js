const vscode = require('vscode');
const { GoogleGenerativeAI } = require('@google/generative-ai');

let analysisPanel = undefined;

function activate(context) {}

async function analyzeEdgeCases(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText.trim()) return;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Analyzing selection with Gemini...',
        cancellable: false
    }, async () => {
        try {
            const analysis = await analyzeText(selectedText);
            showAnalysisWebview(analysis, context, editor, selection);
        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
        }
    });
}

async function analyzeText(text) {
    const genAI = new GoogleGenerativeAI("AIzaSyAb5iOJnqHADg3V7xhn-qbCZij4SaWNOR4");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Act as a Senior Software QA Engineer and Lead Developer. 
Analyze the provided code function for logic flaws, boundary conditions, and performance bottlenecks.

### TASK:
1. Identify every specific edge case (e.g., null/undefined, empty strings, extremely large numbers, negative values, specialized characters, etc.).
2. Predict the CURRENT output of the provided code for that case (the "Actual Output") both should be minimal do not over explain.
3. Determine what the output SHOULD be according to best practices/standard logic (the "Expected Output").
4. If "Actual" differs from "Expected", provide the corrected version of the entire function.

### CONSTRAINTS:
- Do not provide any conversational text, introductions, or explanations.
- If the code is already perfect, return an empty JSON array [].
- Output MUST be a strictly valid JSON array of objects.
- Do not use any comments or explainations in fixed code.
- ONLY UPDATE THE LINES WHICH ARE INCORRECT NOT WHOLE PROGRAM.
- strictly follow this constraints and do not overexplain at all.

### OUTPUT FORMAT (JSON ONLY):
[
  {
    "Sr. No.": "serial number of the edge case",
    "input": "Specific input value used for this case",
    "actualOutput": "The current (buggy) result",
    "expectedOutput": "The intended/correct result",
    "isBug": true/false,
    "fixedCode": "The full corrected code block (Only if isBug is true, otherwise empty string)"

  }
]Code: ${text}`;

    try {
        const result = await model.generateContent(prompt);
        let jsonText = result.response.text().trim();
        
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.slice(3, -3).trim();
        }
        
        return JSON.parse(jsonText);
    } catch (error) {
        throw new Error("Failed to parse Gemini response: " + error.message);
    }
}

function showAnalysisWebview(analysis, context, editor, selection) {
    if (analysisPanel) {
        analysisPanel.reveal(vscode.ViewColumn.Beside);
    } else {
        analysisPanel = vscode.window.createWebviewPanel('scanEdge', 'Analysis', vscode.ViewColumn.Beside, { 
            enableScripts: true,
            retainContextWhenHidden: true
        });
        
        analysisPanel.onDidDispose(() => {
            analysisPanel = undefined;
        });
    }
    analysisPanel.webview.html = getAnalysisWebviewContent(analysis);
}

function getAnalysisWebviewContent(analysis) {
    const rows = (analysis || []).map((item) => `
        <tr>
            <td>${escapeHtml(item["Sr. No."])}</td>
            <td><code>${escapeHtml(item.input)}</code></td>
            <td class="buggy">${escapeHtml(item.actualOutput)}</td>
            <td class="correct">${escapeHtml(item.expectedOutput)}</td>
            <td><pre><code>${escapeHtml(item.fixedCode || 'No fixes needed')}</code></pre></td>
        </tr>
    `).join('');

    return `
        <html>
        <head>
            <style>
                body { font-family: sans-serif; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; vertical-align: top; }
                th { background: var(--vscode-sideBar-background); }
                .buggy { color: #f48771; font-weight: bold; }
                .correct { color: #89d185; font-weight: bold; }
                pre { background: #ffffff00; color: #d4d4d4; padding: 5px; border-radius: 4px; font-size: 11px; margin: 0; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <h2>Edge Case Analysis</h2>
            ${rows.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Sr. No.</th>
                        <th>Input</th>
                        <th>Actual Output</th>
                        <th>Expected Output</th>
                        <th>Fixed Code</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>` : '<p>Either something is wrong or  the code appears perfect!</p>'}
        </body>
        </html>`;
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[m]));
}

module.exports = { 
    activate,
    analyzeEdgeCases
};