# Fintech Digital Banking System
What started as a simple data structures console project has evolved into a full-stack digital banking simulation. It features an interactive web-based frontend powered by a robust C++ algorithmic backend. The application leverages core C++ utilities—like `unordered_map` for O(1) lookups, vectors for binary-search indexing, and custom linked lists for transaction history—to power a comprehensive suite of functionalities ranging from basic account management to complex financial operations like loans, UPI integration, and statement generation.

---

## 🚀 Key Features

*   **Secure Authentication & Account Opening**: Sign up and generate unique account numbers, set secure passwords, set UPI IDs, and configure PINs.
*   **Dynamic Financial Dashboard**: View real-time balances, active loans, investments, and recent transaction history.
*   **Funds Transfer**: Send money securely to other simulated accounts via Netbanking or UPI transfer methods.
*   **Bill Payments**: Pay bills using Netbanking, Debit Card, or UPI with dynamic field verification.
*   **Interactive Loan Portal**: Built-in loan calculator with dynamic EMI, interest, and maturity timeline projection.
*   **Investment Desk**: Open Fixed Deposits with projected maturity payouts and support for early liquidation/withdrawal.
*   **Debit Card Management**: Set spending limits (online/ATM), view card details (CVV/Expiry), block cards, or issue new ones.
*   **Professional Statements**: Instantly download professional PDF statements generated on-the-fly using `ReportLab`.
*   **Analytics Charts**: Visual representations of daily deposits, withdrawals, and spending trends.

---

## 🛠️ Architecture & Technology Stack

The project leverages a unique multi-language architecture:

1.  **Frontend (Web UI)**:
    *   **HTML5 / Vanilla CSS / Tailwind CSS**: Responsive, dark-themed dashboard.
    *   **Vanilla Javascript**: Real-time DOM data binding, state management (`sessionStorage`), slider calculators, and modal dialogue systems.
2.  **Middleware (Server/API)**:
    *   **Python Flask**: Exposes RESTful API endpoints for the web frontend and orchestrates backend logic.
    *   **BeautifulSoup4**: Injects custom code components dynamically.
3.  **Backend Core**:
    *   **C++ Core Engine**: High-performance banking business logic (`account.cpp`, `fd.cpp`, `loan.cpp`, `upi.cpp`, etc.).
    *   **Interprocess Communication (IPC)**: Flask communicates with the compiled C++ executable via process pipes (`stdin`, `stdout`).
    *   **Local Storage**: State is persisted across sessions inside JSON data files (`bank_data.json`, `user_profiles.json`).

---

## 📁 Repository Structure

```text
├── ui_code/                 # Frontend Web UI Assets
│   ├── code.html            # Sign-in and Create Account page
│   ├── code(1).html         # Core Dashboard and Transaction List
│   ├── code(2).html         # Account details & Profile Settings
│   ├── code(3).html         # UPI payment & Transfer Desk
│   ├── code(4).html         # Loan Management & Calculator
│   ├── code(5).html         # Fixed Deposit & Investment panel
│   ├── code(6).html         # Billing & Analytics services
│   ├── code(7).html         # Debit Card hub
│   └── app.js               # Frontend controller, calculators, and API binds
├── flask_app.py             # Flask Web Server & IPC Controller
├── requirements.txt         # Python dependencies
├── run_html_ui.bat          # Startup script for Windows environment
├── bank.h                   # C++ Backend Header Declarations
├── main.cpp                 # C++ Core Entry Point
├── account.cpp              # C++ Account business logic
├── cheque.cpp               # C++ Cheque Book management
├── credit.cpp               # C++ Credit/Deposit operations
├── debit.cpp                # C++ Withdrawal/Debit operations
├── fd.cpp                   # C++ Fixed Deposit logic
├── loan.cpp                 # C++ Loan processing
├── upi.cpp                  # C++ UPI engine
├── globals.cpp              # C++ Shared Globals
├── utils.cpp                # C++ Utilities and file storage management
└── CMakeLists.txt           # Build instructions for C++ source compilation
```

---

## 📦 Prerequisites

Ensure you have the following installed on your local development machine:

*   **Python 3.8+** (Added to your system's `PATH`)
*   **g++ Compiler** (MSYS2 / MinGW-w64 for Windows)

---

## ⚙️ How to Run the Project

### Windows (Quick Start)
Simply double-click the startup script in the project root:
```cmd
run_html_ui.bat
```
This script will automatically verify your compiler environments, install the required python dependencies, compile the C++ source files into a `bank_system.exe` binary if not already compiled, and boot the Flask dev server.

### Manual Setup
1.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Compile C++ Backend Core**:
    On Windows:
    ```bash
    g++ main.cpp account.cpp credit.cpp debit.cpp fd.cpp loan.cpp report.cpp upi.cpp utils.cpp cheque.cpp globals.cpp -o bank_system.exe
    ```
    On Linux/macOS:
    ```bash
    g++ main.cpp account.cpp credit.cpp debit.cpp fd.cpp loan.cpp report.cpp upi.cpp utils.cpp cheque.cpp globals.cpp -o bank_system
    ```

3.  **Start Python Web Server**:
    ```bash
    python flask_app.py
    ```

4.  **Access Web UI**:
    Open your browser and navigate to:
    ```text
    http://127.0.0.1:5000/
    ```

---

## ⚠️ Development Notice
This application is created **for project and development purposes only**. It should not be used with real-world banking credentials or actual monetary deposits. An overlay reminder alerts users about development constraints upon loading.
