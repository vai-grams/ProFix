ProFix 🛠️
ProFix is an advanced developer productivity extension for Visual Studio Code designed to automate the detection of logical vulnerabilities and syntax errors. By leveraging intelligent code analysis, ProFix empowers developers to write resilient, production-ready code while minimizing the debugging lifecycle.


1. Edge Case Scan
Stop bugs before they reach production. This feature performs a deep heuristic analysis of your selected function’s logic and workflow.
Predictive Analysis: Identifies specific input scenarios (edge cases) where your logic may fail or return unexpected results.
Contextual Intelligence: Provides a concise, high-level explanation of why a specific case causes a failure.
Remediation: Offers optimized code snippets to handle identified vulnerabilities.

2. Selection Scan & "Instant-Fix"
A precision tool for real-time error correction and code hardening.
Dynamic Error Detection: Scans selected blocks for syntax errors, logical bottlenecks, and anti-patterns.
One-Click Refactoring: Includes a dedicated "FIX" button that automatically patches the incorrect code directly in your active editor window.
Efficiency Driven: Eliminates the manual "Copy-Paste" loop, keeping you in the flow state.



🚀 Key Features
Intuitive Dashboard: A clean, responsive interface for error handling.

Efficient Workflow: Optimized logic to reduce effort by.

Real-time Updates: Stay informed with live notifications and status tracking.

Extensible Design: Modular codebase allowing for easy integration of third-party APIs.


🛠️ Tech Stack
Platform: VS Code Extension API

Language: JavaScript

Analysis Engine: Google Gemini
Model : Gemini 2.5 flash



📋 Prerequisites
Before you begin, ensure you have the following installed:
- Node.js


⚙️ Installation & Setup
Clone the Repository:

Bash
git clone https://github.com/vai-grams/ProFix.git
cd ProFix

Install Dependencies:

Bash
npm install node-fetch

API_KEY=your_gemini_key

Run the Application:

1.In VS code open ProFix folder.
2.Press F5 to launch "Extension Development Host".
3.Now open you code files here.
4.Select the code, you'll get "ProFix" option inside command pallet.
5.Under "ProFix" there are two submenus for running "Selection Scan" and "Edge Cases Scan" 
6.Click on whicever you want to use.


🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

📄 License
Distributed under the MIT License. See LICENSE for more information.

📧 Contact
Project Lead: - @vai_grams

Project Link: https://github.com/vai-grams/ProFix

Developed with ❤️ by the ProFix Team(Runtime Terrors@code.init(NITC)).
