# Fintech Digital Banking System

What started as a simple data structures console project has evolved into a full-stack digital banking simulation. It features an interactive web-based frontend powered by a robust C++ algorithmic backend. The application leverages core C++ utilities—like `unordered_map` for O(1) lookups, vectors for binary-search indexing, and custom linked lists for transaction history—to power a comprehensive suite of functionalities ranging from basic account management to complex financial operations like loans, UPI integration, and statement generation.

## 🌟 Key Features

- **Account Management**: Create and manage bank accounts, view real-time balances, and manage user profiles.
- **Transactions & Transfers**: Perform intra-bank transfers, deposit/withdraw funds, and execute bill payments.
- **UPI Integration**: Link and manage UPI IDs for instant, seamless transactions.
- **Card Management**: Issue, view, and securely block debit/credit cards along with CVV and expiry details.
- **Financial Services**: Access fixed deposits (FD), loan applications, and general investment tools.
- **Detailed Statements**: Automatically generate and download detailed PDF transaction statements with professional formatting using ReportLab.
- **Modern Web UI**: A sleek, responsive dashboard built with standard web technologies (HTML/CSS/JS) serving real-time data dynamically.

## 🏗️ Technical Architecture

This project adopts a hybrid architecture to balance performance and ease of web delivery:
- **Core Engine (Backend)**: Written in **C++** (`main.cpp`, `account.cpp`, etc.). The engine handles persistent data processing, complex banking business logic, and ensures high-performance operations.
- **Web Server (Middleware)**: Written in **Python (Flask)**. Acts as an API gateway. It dynamically compiles and executes the C++ backend process, communicating securely over `stdin`/`stdout` streams, while concurrently serving static frontend web files. 
- **Frontend (UI)**: Plain HTML, CSS, and vanilla JS. Provides a modern user experience without heavy client-side frameworks.

## 🛠️ Prerequisites

To run this project on your local machine, ensure you have the following installed:

1. **Python 3.8+**
   - Download from [python.org](https://www.python.org/downloads/).
   - **Important for Windows:** During installation, make sure to check the box that says **"Add Python to PATH"**.
   - Verify installation by opening a terminal/command prompt and typing: `python --version`

2. **C++ Compiler (g++)**
   - The C++ backend requires `g++` to compile the `.cpp` files on startup.
   - **For Windows:** We recommend installing MinGW-w64 via [MSYS2](https://www.msys2.org/). 
     - Download and install MSYS2.
     - Open the MSYS2 UCRT64 terminal and run: `pacman -S mingw-w64-ucrt-x86_64-gcc`
     - Add the MinGW `bin` folder (usually `C:\msys64\ucrt64\bin`) to your Windows Environment Variables `System PATH`.
   - **For Linux (Ubuntu/Debian):** Run `sudo apt update && sudo apt install build-essential`
   - **For macOS:** Run `xcode-select --install`
   - Verify installation by opening a terminal/command prompt and typing: `g++ --version`

## 🚀 Installation & Setup

Follow these step-by-step instructions to get the application running:

1. **Download the project**
   - You can either clone this repository using Git:
     ```bash
     git clone <repository-url>
     ```
   - Or, simply download the project as a `.zip` file from your source and extract it to a folder.

2. **Open the project folder in your terminal**
   - Open Command Prompt (Windows), PowerShell, or your IDE's terminal (like VS Code).
   - Navigate to the folder you extracted:
     ```bash
     cd "path\to\bank_system"
     ```

3. **Set up a Virtual Environment (Recommended but optional)**
   - It's a good practice to create a virtual environment to keep dependencies isolated.
   - Run the following command to create a virtual environment named `venv`:
     ```bash
     python -m venv venv
     ```
   - Activate the virtual environment:
     - **Windows Command Prompt:** `venv\Scripts\activate.bat`
     - **Windows PowerShell:** `.\venv\Scripts\Activate.ps1`
     - **Mac/Linux:** `source venv/bin/activate`

4. **Install Required Python Packages**
   - Run the following command to install Flask, BeautifulSoup4, and ReportLab from the `requirements.txt` file:
     ```bash
     pip install -r requirements.txt
     ```
   - *Wait for the installation to complete successfully.*

## 🏃‍♂️ Running the Application

### Method 1: Easy Start (Windows - Recommended)
Simply double-click the `run_html_ui.bat` file in the project folder. This smart startup script will automatically:
1. Check if Python and `g++` are properly installed on your system.
2. Automatically install all required dependencies from `requirements.txt`.
3. Boot up the server and provide you with the localhost URL.

### Method 2: Command Line
Open your terminal in the project directory and run:
```bash
python flask_app.py
```

### Accessing the Web UI
Once the server is running, open your web browser and navigate to:
**[http://127.0.0.1:5000](http://127.0.0.1:5000)**

*(Note: During the very first startup, the Python script will invoke `g++` to compile the C++ files into `bank_system.exe`. This may take a few seconds.)*

## 📁 Project Structure

```text
├── 📄 flask_app.py        # Python Flask server configuring APIs & UI serving
├── 📄 requirements.txt    # Python library dependencies
├── 📄 run_html_ui.bat     # Windows batch script for quick start
├── 📂 ui_code             # Directory containing frontend HTML/CSS/JS resources
│
├── 📄 main.cpp            # C++ Core Entry point
├── 📄 account.cpp         # C++ Account operations logic
├── 📄 credit.cpp          # C++ Credit card management logic
├── 📄 debit.cpp           # C++ Debit management logic
├── 📄 fd.cpp              # C++ Fixed deposit module
├── 📄 loan.cpp            # C++ Loan processing module
├── 📄 upi.cpp             # C++ UPI processing module
├── ...                    # Other C++ source files for business logic
│
└── 📄 user_profiles.json  # (Auto-generated) JSON file for user information UI storage
└── 📄 bank_data.json      # (Auto-generated) JSON file for transaction logs
```

## 🔒 Security Note
*This project is primarily an educational simulation and proof-of-concept. It utilizes basic plaintext mechanisms and lightweight cryptographic hashes for demo purposes. It should **not** be used in a real production financial environment without substantial security upgrades including robust database integration, secure session management, TLS, and strict input sanitizations.*
