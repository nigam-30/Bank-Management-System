import os
import subprocess
import threading
import time
import json
import re
import hashlib
from flask import Flask, request, jsonify, send_from_directory, make_response
from bs4 import BeautifulSoup
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import datetime

app = Flask(__name__, static_folder="ui_code")

PROFILES_JSON = "user_profiles.json"
BANK_DATA_JSON = "bank_data.json"

def load_profiles():
    if not os.path.exists(PROFILES_JSON):
        with open(PROFILES_JSON, "w") as f:
            json.dump({}, f)
        return {}
    try:
        with open(PROFILES_JSON, "r") as f:
            return json.load(f)
    except:
        return {}

def save_profiles(data):
    tmp_path = PROFILES_JSON + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(data, f, indent=4)
    os.replace(tmp_path, PROFILES_JSON)

def run_cpp_command(bank_instance, choice, inputs):
    with bank_instance.lock:
        if bank_instance.proc.poll() is not None:
            bank_instance.start_process()
        
        bank_instance.stdin.write(f"{choice}\n")
        bank_instance.stdin.flush()
        for val in inputs:
            bank_instance.stdin.write(f"{val}\n")
            bank_instance.stdin.flush()
            
        out = bank_instance._read_until("Enter choice: ")
        return out

def parse_output(out):
    filtered_out = re.sub(r"--- Banking Menu ---[\s\S]*?Enter choice:", "", out).strip()
    filtered_out = re.sub(r"Enter .*?:", "", filtered_out).strip()
    return filtered_out

def generate_pdf(acc_no, data):
    filename = f"statement_{acc_no}.pdf"
    doc = SimpleDocTemplate(filename, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=100)
    elements = []
    
    styles = getSampleStyleSheet()
    
    history = data.get('history', [])
    opening_date = "01/01/2026"
    if history:
        try:
            opening_date = history[0].get('date', '').split(' ')[0]
        except:
            pass
    
    
    # Custom styles
    style_normal = styles['Normal']
    style_normal.fontSize = 9
    style_normal.leading = 11
    
    style_heading = styles['Heading1']
    style_heading.fontSize = 14
    style_heading.textColor = colors.HexColor("#004C8F") # Blue
    style_heading.alignment = TA_CENTER
    
    style_right = ParagraphStyle('RightAlign', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=9)
    style_center = ParagraphStyle('CenterAlign', parent=styles['Heading3'], alignment=TA_CENTER)
    
    style_right_col = ParagraphStyle('RightCol', parent=styles['Normal'], fontSize=7.5, leading=9)
    style_logo = ParagraphStyle('Logo', parent=styles['Heading2'], backColor=colors.HexColor("#004C8F"), textColor=colors.white, alignment=TA_LEFT, leftIndent=5, rightIndent=5, spaceBefore=0, spaceAfter=0)
    
    today_str = datetime.datetime.now().strftime("%d/%m/%Y")
    
    address_text = f"<font size=9>MR. {data.get('name', 'N/A').upper()}</font><br/>{data.get('address', 'As per bank records')}<br/>.<br/>.<br/><br/>JOINT HOLDERS :"
    address_box_table = Table([[Paragraph(address_text, style_normal)]], colWidths=[240])
    address_box_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    
    left_inner_data = [
        [Paragraph("<b> &nbsp;FINTECH BANK PVT LTD &nbsp;</b>", style_logo)],
        [Spacer(1, 15)],
        [address_box_table],
        [Spacer(1, 5)],
        [Paragraph("Nomination : Not Registered", style_normal)],
        [Spacer(1, 15)],
        [Table([[f"From : {opening_date}", f"To : {today_str}"]], colWidths=[85, 165], style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
        ])]
    ]
    left_inner_table = Table(left_inner_data, colWidths=[250])
    left_inner_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    
    right_data = [
        ["Account Branch", ": FINTECH MAIN BRANCH"],
        ["Address", ": Maker Chambers, Nariman Point, Mumbai."],
        ["City", ": Mumbai"],
        ["State", ": Maharashtra"],
        ["Phone no.", ": 011-2345678"],
        ["OD Limit", ": 0.00"],
        ["Currency", ": INR"],
        ["Email", f": {data.get('email', 'N/A')}"],
        ["Cust ID", f": {acc_no}"],
        ["Account No", f": {acc_no}"],
        ["A/C Open Date", f": {opening_date}"],
        ["Account Status", ": Regular"],
    ]
    
    right_col_formatted = []
    for row in right_data:
        right_col_formatted.append([Paragraph(row[0], style_right_col), Paragraph(row[1], style_right_col)])
        
    right_inner_table = Table(right_col_formatted, colWidths=[80, 180])
    right_inner_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 1),
    ]))
    
    master_table = Table([[left_inner_table, "", right_inner_table]], colWidths=[240, 50, 260])
    master_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    
    elements.append(Paragraph("Page No. : 1", ParagraphStyle('CenterAlign', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8)))
    elements.append(Spacer(1, 20))
    elements.append(master_table)
    elements.append(Spacer(1, 10))
    
    # 4. Transactions Table
    table_data = [["Date", "Narration", "Ref No.", "Withdrawal (Dr)", "Deposit (Cr)", "Closing Balance"]]
    
    history = data.get('history', [])
    if history:
        for t in history:
            date_val = t.get('date', '').split(' ')[0] if ' ' in t.get('date', '') else t.get('date', '')
            narration = t.get('type', '')
            amt_str = str(t.get('amount', '0'))
            bal_str = str(t.get('balance', '0'))
            ref_no = "REF/UP/" + str(hash(date_val + narration))[-6:]
            
            dr_amt = ""
            cr_amt = ""
            if amt_str.startswith("-"):
                dr_amt = amt_str[1:]
            elif amt_str.startswith("+"):
                cr_amt = amt_str[1:]
            else:
                try: 
                    if float(amt_str) < 0:
                        dr_amt = str(abs(float(amt_str)))
                    else:
                        cr_amt = amt_str
                except:
                    cr_amt = amt_str
                    
            table_data.append([date_val, Paragraph(narration, style_normal), ref_no, dr_amt, cr_amt, bal_str])
    else:
        table_data.append(["-", "No transactions found", "-", "-", "-", "-"])
        
    table = Table(table_data, colWidths=[65, 200, 75, 65, 65, 70])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#004C8F")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,0), 'CENTER'),
        ('ALIGN', (3,1), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 20))
    
    # 5. Statement Summary
    statement_summary_title = Paragraph("<b>STATEMENT SUMMARY :-</b>", style_normal)
    elements.append(statement_summary_title)
    
    total_debits = 0.0
    total_credits = 0.0
    dr_count = 0
    cr_count = 0
    closing_bal = 0.0
    try:
        closing_bal = float(str(data.get('balance', '0')).replace(',', ''))
    except:
        pass
        
    for t in history:
        amt_val = str(t.get('amount', '0')).replace(',', '')
        amt_f = 0.0
        try:
            amt_f = float(amt_val)
        except:
            if amt_val.startswith('-'):
                try: amt_f = -float(amt_val[1:])
                except: pass
            elif amt_val.startswith('+'):
                try: amt_f = float(amt_val[1:])
                except: pass
        
        if amt_f < 0:
            dr_count += 1
            total_debits += abs(amt_f)
        elif amt_f > 0:
            cr_count += 1
            total_credits += amt_f
            
    opening_bal = closing_bal + total_debits - total_credits
    
    summary_data = [
        ["Opening Balance", "Dr Count", "Cr Count", "Debits", "Credits", "Closing Bal"],
        [f"{opening_bal:,.2f}", str(dr_count), str(cr_count), f"{total_debits:,.2f}", f"{total_credits:,.2f}", f"{closing_bal:,.2f}"]
    ]
    summary_table = Table(summary_data, colWidths=[90, 60, 60, 80, 80, 80])
    summary_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 40))
    
    # 6. Footer Notes
    def add_footer(canvas, doc):
        canvas.saveState()
        # Right note
        canvas.setFont('Helvetica', 8)
        canvas.drawRightString(doc.pagesize[0] - 30, 80, "This is a computer generated statement and does not")
        canvas.drawRightString(doc.pagesize[0] - 30, 70, "require signature.")
        
        # Left notes
        canvas.setFont('Helvetica-Bold', 9)
        canvas.setFillColor(colors.HexColor('#004C8F'))
        canvas.drawString(30, 60, "FINTECH BANK LIMITED")
        
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(colors.blue)
        canvas.drawString(30, 50, "*Closing balance includes funds earmarked for hold and uncleared funds")
        
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.black)
        text1 = "Contents of this statement will be considered correct if no error is reported within 30 days of receipt of statement. The address on this statement is that on record with the Bank"
        text2 = "as at the day of requesting this statement."
        text3 = "FINTECH Bank Service Tax Registration Number: M-IV/ST/BANK & OTHER SERVICES /20/2001"
        text4 = "Registered Office Address: FINTECH Bank House, Senapati Bapat Marg, Lower Parel, Mumbai 400013"
        canvas.drawString(30, 40, text1)
        canvas.drawString(30, 31, text2)
        canvas.drawString(30, 22, text3)
        canvas.drawString(30, 13, text4)
        canvas.restoreState()
    
    doc.build(elements, onFirstPage=add_footer, onLaterPages=add_footer)
    return filename

class BankBackend:
    def __init__(self):
        self.lock = threading.Lock()
        self.netbanking_db = {}
        self.user_details_db = load_profiles()
        self.start_process()

    def compile_if_missing(self):
        exe_file = "bank_system.exe" if os.name == 'nt' else "bank_system"
        if not os.path.exists(exe_file):
            print("Compiling " + exe_file + "...")
            subprocess.run(["g++", "main.cpp", "account.cpp", "credit.cpp", "debit.cpp", 
                            "fd.cpp", "loan.cpp", "report.cpp", "upi.cpp", "utils.cpp", "cheque.cpp", "globals.cpp", 
                            "-o", exe_file])

    def start_process(self):
        self.compile_if_missing()

        # WIPE PERSISTENT FILES ON BOOT SO THE SERVER STARTS FRESH AS REQUESTED
        if os.path.exists(BANK_DATA_JSON):
            try: os.remove(BANK_DATA_JSON)
            except: pass
        if os.path.exists(PROFILES_JSON):
            try: os.remove(PROFILES_JSON)
            except: pass
            
        self.user_details_db = {} 

        exe_file = "bank_system.exe" if os.name == 'nt' else "./bank_system"
        self.proc = subprocess.Popen(
            [exe_file],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        if self.proc.stdout is None or self.proc.stdin is None:
            raise RuntimeError("Backend process failed to establish pipes.")
        self.stdout = self.proc.stdout
        self.stdin = self.proc.stdin
        self.init_output = self._read_until("Enter choice: ")

    def _read_until(self, marker, timeout=5.0):
        buffer = ""
        start = time.time()
        while time.time() - start < timeout:
            if self.proc.poll() is not None:
                self.start_process()
                break
            char = self.stdout.read(1)
            if not char: break
            buffer += char
            if buffer.endswith(marker): break
        return buffer

    def execute(self, choice, inputs):
        return run_cpp_command(self, choice, inputs)
            
    def get_report(self):
        out = self.execute("9", [])
        accounts = []
        for line in out.split('\n'):
            if line.startswith("Account No:"):
                parts = line.split(" | ")
                if len(parts) >= 3:
                    try:
                        acc_no = parts[0].split(": ")[1].strip()
                        name = parts[1].split(": ")[1].strip()
                        bal_str = parts[2].split("INR ")[-1].strip()
                        loan_str = parts[3].split("INR ")[-1].strip() if len(parts)>3 else "0"
                        fd_str = parts[4].split("INR ")[-1].strip() if len(parts)>4 else "0"
                        
                        accounts.append({
                            "account_number": acc_no,
                            "name": name,
                            "balance": bal_str,
                            "loan_amount": loan_str,
                            "fixed_deposit": fd_str
                        })
                    except Exception as e:
                        print("Parse error on line:", line, e)
                        continue
        return accounts

bank = BankBackend()
print("Connected to C++ Backend successfully.")

@app.route("/")
def index():
    return send_ui_file("code.html")

@app.route("/dashboard")
def dashboard():
    return send_ui_file("code(1).html")

@app.route("/account")
def account():
    return send_ui_file("code(2).html")

@app.route("/upi")
def upi():
    return send_ui_file("code(3).html")

@app.route("/loan")
def loan():
    return send_ui_file("code(4).html")

@app.route("/transactions")
def transactions():
    return send_ui_file("code(1).html")

@app.route("/settings")
def settings():
    return send_ui_file("code(2).html")

@app.route("/invest")
def invest():
    return send_ui_file("code(5).html")

@app.route("/services")
def services():
    return send_ui_file("code(6).html")

@app.route("/cards")
def cards():
    return send_ui_file("code(7).html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory("ui_code", path)

def send_ui_file(filename):
    filepath = os.path.join("ui_code", filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        html = f.read()
    soup = BeautifulSoup(html, 'html.parser')
    script_tag = soup.new_tag("script", src="/app.js")
    if soup.body:
        soup.body.append(script_tag)
    return str(soup)

@app.route("/api/login", methods=["POST"])
def login():
    req = request.json
    accNo = req.get("account")
    password = req.get("password", "")
    accounts = bank.get_report()
    
    for acc in accounts:
        if str(acc["account_number"]) == str(accNo):
            nb_pass_on_file = bank.user_details_db.get(str(accNo), {}).get("nb_pass")
            if nb_pass_on_file and password != nb_pass_on_file:
                return jsonify({"success": False, "message": "Invalid Netbanking Password!"})
            return jsonify({
                "success": True, 
                "message": "Logged in", 
                "account": {
                    "account_number": acc["account_number"],
                    "name": acc["name"],
                    "balance": acc["balance"],
                    "loan_amount": acc["loan_amount"],
                    "fixed_deposit": acc["fixed_deposit"]
                }
            })
            
    return jsonify({"success": False, "message": "Account not found in C++ memory. Please pass correct credentials!"})

@app.route("/api/create_account", methods=["POST"])
def create_account():
    req = request.json
    name = str(req.get("name", ""))
    deposit = str(req.get("deposit", "0"))
    debit = str(req.get("debit", "n"))
    pin = str(req.get("pin", "0000"))
    want_upi = str(req.get("upi_id", ""))
    upi_pin = str(req.get("upi_pin", ""))
    want_nb = str(req.get("nb_pass", ""))
    
    if want_upi and len(upi_pin) not in [4, 6]:
        return jsonify({"success": False, "message": "UPI PIN must be 4 or 6 digits."})
    
    inputs_to_send = [name, deposit, debit]
    if debit.lower() == 'y':
        inputs_to_send.append(pin)
        
    out = bank.execute("1", inputs_to_send)
    
    acc_no = None
    ms = re.search(r"Account Number is: (\d+)", out)
    if ms:
        acc_no = ms.group(1)
        if want_upi:
            bank.execute("10", [acc_no, want_upi])
            
        details = {
            "email": req.get("email", ""),
            "dob": req.get("dob", ""),
            "address": req.get("address", ""),
            "nb_pass": want_nb if want_nb else ""
        }
        
        if want_upi and upi_pin:
            details["upi_pin_hash"] = hashlib.sha256(upi_pin.encode()).hexdigest()
        
        # Extract C++ generated Debit Card explicitly
        if debit.lower() == 'y':
            card_match = re.search(r"Card Number\s*:\s*([\d\s]+)", out)
            if card_match:
                details["card_number"] = card_match.group(1).strip()
            cvv_match = re.search(r"CVV\s*:\s*(\d+)", out)
            if cvv_match:
                details["cvv"] = cvv_match.group(1).strip()
            exp_match = re.search(r"Expiry Date\s*:\s*([\d/]+)", out)
            if exp_match:
                details["expiry"] = exp_match.group(1).strip()
            details["company"] = "Visa" # Inferred from C++ starting digit 4

        bank.user_details_db[str(acc_no)] = details
        save_profiles(bank.user_details_db)
        
        if float(deposit) > 0:
            save_transaction(acc_no, "Initial Deposit", f"+{deposit}", deposit)
            
    filtered_out = parse_output(out)
    msg = f"Account created! Your Account Number is {acc_no}."
    if want_upi:
        msg += f"\nUPI ID '{want_upi}' also registered."
    
    return jsonify({"success": True, "message": msg, "account_number": acc_no})

@app.route("/api/account/<acc_no>")
def get_account(acc_no):
    accounts = bank.get_report()
    for acc in accounts:
        if str(acc["account_number"]) == str(acc_no):
            details = bank.user_details_db.setdefault(str(acc_no), {})
            
            # Generate static mock debit card if missing
            if "card_number" not in details:
                import random
                random.seed(int(acc_no))
                details["card_number"] = f"4{random.randint(100,999)} {random.randint(1000,9999)} {random.randint(1000,9999)} {random.randint(1000,9999)}"
                details["cvv"] = str(random.randint(100, 999))
                details["company"] = random.choice(["Visa", "MasterCard"])
                details["expiry"] = f"{random.randint(1, 12):02d}/{random.randint(26, 30)}"
                random.seed()
                save_profiles(bank.user_details_db)
                
            acc["email"] = details.get("email", "")
            acc["address"] = details.get("address", "")
            acc["dob"] = details.get("dob", "")
            acc["card_number"] = details.get("card_number")
            acc["cvv"] = details.get("cvv")
            acc["company"] = details.get("company")
            acc["expiry"] = details.get("expiry")
            if details.get("cc_number") and not details.get("cc_cvv"):
                import random
                random.seed(int(acc_no) + 1)
                base_cc = details.get("cc_number", "").replace(" ", "")
                if len(base_cc) == 12:
                    base_cc += str(random.randint(1000, 9999))
                details["cc_number"] = base_cc
                details["cc_cvv"] = str(random.randint(100, 999))
                details["cc_expiry"] = f"{random.randint(1, 12):02d}/{random.randint(28, 32)}"
                random.seed()
                save_profiles(bank.user_details_db)

            acc["cc_number"] = details.get("cc_number", "")
            acc["cc_limit"] = details.get("cc_limit", "")
            acc["cc_cvv"] = details.get("cc_cvv", "")
            acc["cc_expiry"] = details.get("cc_expiry", "")
            
            acc["blocked_cards"] = details.get("blocked_cards", [])

            # Attach bank_data History
            try:
                import json
                with open(BANK_DATA_JSON, "r") as f:
                    bd = json.load(f)
                    acc["history"] = bd.get("accounts", {}).get(str(acc_no), {}).get("history", [])
            except:
                acc["history"] = []

            return jsonify(acc)
    return jsonify({"error": "Not found"}), 404

@app.route("/api/block_card", methods=["POST"])
def block_card():
    req = request.json
    acc_no = str(req.get("account"))
    
    if acc_no not in bank.user_details_db:
        return jsonify({"success": False, "message": "Account not found."})
        
    details = bank.user_details_db[acc_no]
    
    if "card_number" in details and details["card_number"]:
        # Move to blocked cards
        if "blocked_cards" not in details:
            details["blocked_cards"] = []
        
        details["blocked_cards"].append({
            "card_number": details["card_number"],
            "expiry": details.get("expiry", "")
        })
        
        # Clear current card
        details["card_number"] = ""
        details["cvv"] = ""
        details["expiry"] = ""
        save_profiles(bank.user_details_db)
        
        return jsonify({"success": True, "message": "Debit card securely blocked."})
        
    return jsonify({"success": False, "message": "No active debit card found."})

@app.route("/api/issue_card", methods=["POST"])
def issue_card():
    req = request.json
    acc_no = str(req.get("account"))
    
    if acc_no not in bank.user_details_db:
        bank.user_details_db[acc_no] = {}
        
    details = bank.user_details_db[acc_no]
    
    if "card_number" in details and details["card_number"]:
         return jsonify({"success": False, "message": "You already have an active debit card."})
         
    new_pin = req.get("pin")
    if not new_pin or len(str(new_pin)) != 4 or not str(new_pin).isdigit():
         return jsonify({"success": False, "message": "Valid 4-digit PIN is required."})
         
    import random
    # Use random without seed to generate new card
    random.seed()
    details["card_number"] = f"4{random.randint(100,999)} {random.randint(1000,9999)} {random.randint(1000,9999)} {random.randint(1000,9999)}"
    details["cvv"] = str(random.randint(100, 999))
    details["company"] = random.choice(["Visa", "MasterCard"])
    details["expiry"] = f"{random.randint(1, 12):02d}/{random.randint(26, 30)}"
    details["pin"] = str(new_pin)
    save_profiles(bank.user_details_db)
    
    return jsonify({"success": True, "message": "New debit card issued successfully."})

@app.route("/api/accounts", methods=["GET"])
def get_accounts():
    try:
        accounts = bank.get_report()
        res = []
        for a in accounts:
            res.append({
                "account_number": a["account_number"],
                "name": a["name"],
                "balance": a["balance"]
            })
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/demo_info", methods=["GET"])
def get_demo_info():
    if not hasattr(bank, 'init_output'):
        return jsonify({})
    
    match = re.search(r"--- Demo Info ---(.*?)-----------------", bank.init_output, re.DOTALL)
    if match:
        info = match.group(1).strip()
        parsed = {}
        for line in info.split('\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                parsed[k.strip()] = v.strip()
        return jsonify(parsed)
    return jsonify({})

def save_transaction(acc_no, tx_type, amount, balance):
    import datetime
    import os, json
    data = {}
    if os.path.exists(BANK_DATA_JSON):
        try:
            with open(BANK_DATA_JSON, "r") as f:
                data = json.load(f)
        except:
            pass
    if "accounts" not in data:
        data["accounts"] = {}
    if str(acc_no) not in data["accounts"]:
        data["accounts"][str(acc_no)] = {"history": []}
        
    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    data["accounts"][str(acc_no)]["history"].append({
        "date": date_str,
        "type": tx_type,
        "amount": amount,
        "balance": balance
    })
    
    with open(BANK_DATA_JSON, "w") as f:
        json.dump(data, f)

@app.route("/api/transfer", methods=["POST"])
def transfer_api():
    try:
        req = request.json
        from_acc = str(req.get("from_acc"))
        to_acc = str(req.get("to_acc"))
        amount = str(req.get("amount"))
        method = req.get("method")
        
        if from_acc == to_acc:
            return jsonify({"success": False, "result": "Cannot transfer to self."})
            
        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "result": "Amount must be strictly greater than zero."})
            
        accs = bank.get_report()
        valid_to = any(str(a["account_number"]) == to_acc for a in accs)
        if not valid_to:
            return jsonify({"success": False, "result": "Receiver account does not exist or is invalid."})
        
        # We process using Choice 3 to ensure both sender and receiver balances update correctly.
        out = bank.execute("3", [from_acc, to_acc, amount])
        res_str = parse_output(out)
        
        if "successful" in res_str.lower() or "success" in res_str.lower() or "transferred" in res_str.lower():
            # Let's read current balance to append the transaction accurately
            accs = bank.get_report()
            b1 = next((a["balance"] for a in accs if str(a["account_number"]) == from_acc), "0")
            b2 = next((a["balance"] for a in accs if str(a["account_number"]) == to_acc), "0")
            save_transaction(from_acc, f"Transfer Out ({method})", f"-{amount}", b1)
            save_transaction(to_acc, f"Transfer In ({method})", f"+{amount}", b2)
        else:
            return jsonify({"success": False, "result": res_str})
        
        return jsonify({"success": True, "result": res_str})
    except Exception as e:
        return jsonify({"success": False, "result": str(e)})

@app.route("/api/pay_bill", methods=["POST"])
def pay_bill():
    try:
        req = request.json
        accNo = str(req.get("account"))
        biller = str(req.get("biller", "Bill"))
        company = str(req.get("company", "Unknown"))
        amount = str(req.get("amount", "0"))
        method = str(req.get("method", "Account Balance"))

        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "message": "Amount must be strictly greater than zero."})

        accs = bank.get_report()
        current_acc = next((a for a in accs if str(a["account_number"]) == accNo), None)
        if not current_acc:
            return jsonify({"success": False, "message": "Logged-in account not found."})
            
        if float(str(current_acc["balance"]).replace(',', '')) < float(amount):
            return jsonify({"success": False, "message": "Insufficient balance."})

        details = bank.user_details_db.get(str(accNo), {})

        if method == "Net Banking":
            nb_password = str(req.get("nb_password", ""))
            nb_pass_on_file = details.get("nb_pass")
            if not nb_pass_on_file or nb_password != nb_pass_on_file:
                return jsonify({"success": False, "message": "Invalid Net Banking Password."})
                
        elif method == "Debit Card":
            card_number = str(req.get("card_number", "")).replace(" ", "")
            card_expiry = str(req.get("card_expiry", ""))
            card_cvv = str(req.get("card_cvv", ""))
            
            if len(card_number) < 16 or not card_number.isdigit():
                return jsonify({"success": False, "message": "Invalid Card Number format."})
            if not re.match(r"^(0[1-9]|1[0-2])\/\d{2}$", card_expiry):
                return jsonify({"success": False, "message": "Invalid Expiry format (MM/YY required)."})
            if len(card_cvv) not in [3, 4] or not card_cvv.isdigit():
                return jsonify({"success": False, "message": "Invalid CVV format."})
                
            stored_card = str(details.get("card_number", "")).replace(" ", "")
            if card_number != stored_card:
                return jsonify({"success": False, "message": "Card does not belong to logged-in account, or mismatched number."})
            if card_cvv != str(details.get("cvv", "")):
                return jsonify({"success": False, "message": "CVV mismatch."})
                
        elif method == "UPI":
            upi_id = str(req.get("upi_id", ""))
            upi_pin = str(req.get("upi_pin", ""))
            
            # Simulated check or retrieve from details if stored
            stored_upi_pin_hash = details.get("upi_pin_hash")
            import hashlib
            computed_hash = hashlib.sha256(upi_pin.encode()).hexdigest()
            # If a strict hashed PIN was registered:
            if stored_upi_pin_hash and computed_hash != stored_upi_pin_hash:
                 return jsonify({"success": False, "message": "Invalid UPI PIN."})
            elif not stored_upi_pin_hash and len(upi_pin) not in [4, 6]:
                 return jsonify({"success": False, "message": "UPI PIN must be 4 or 6 digits."})

        # Route bill payment to System Account (simulate utility vendor)
        to_acc = "999999"

        valid_to = any(str(a["account_number"]) == to_acc for a in accs)
        if not valid_to:
            return jsonify({"success": False, "message": "System receiver account could not be found."})

        # Transfer via Option 3 to SYSTEM
        out = bank.execute("3", [accNo, to_acc, amount])
        res_str = parse_output(out)

        if "successful" in res_str.lower() or "success" in res_str.lower() or "transferred" in res_str.lower():
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            b2 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == to_acc), "0")
            
            # Map tx titles to strict required proper types
            remarks = str(req.get("remarks", "")).strip()[:100]
            tx_type = f"{company}" + (f" - {remarks}" if remarks else f" - {biller}")
            save_transaction(accNo, tx_type, f"-{amount}", b1)
            save_transaction(to_acc, f"Payment from {accNo}", f"+{amount}", b2)
            
            return jsonify({"success": True, "message": f"Payment successful via {method}.", "result": res_str})
            
            
        return jsonify({"success": False, "message": "Payment system failed: " + res_str})
        
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/debit_payment", methods=["POST"])
def debit_payment():
    try:
        req = request.json
        accNo = str(req.get("account"))
        pin = str(req.get("pin", ""))
        amount = str(req.get("amount", "0"))
        merchant = str(req.get("merchant", "POS Data"))

        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "message": "Invalid amount."})

        accs = bank.get_report()
        current_acc = next((a for a in accs if str(a["account_number"]) == accNo), None)
        if not current_acc:
            return jsonify({"success": False, "message": "Account not found."})

        details = bank.user_details_db.get(str(accNo), {})
        stored_pin = str(details.get("pin", ""))
        
        # Validating PIN if it was set
        if stored_pin and pin != stored_pin:
             return jsonify({"success": False, "message": "Incorrect ATM PIN."})

        if float(str(current_acc["balance"]).replace(',', '')) < float(amount):
            return jsonify({"success": False, "message": "Insufficient balance."})

        # Process withdrawal (Option 2)
        out = bank.execute("2", [accNo, amount])
        res_str = parse_output(out)

        if "successful" in res_str.lower() or "success" in res_str.lower() or "withdrawn" in res_str.lower():
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            save_transaction(accNo, f"Debit Card - {merchant}", f"-{amount}", b1)
            return jsonify({"success": True, "message": f"Payment to {merchant} successful!"})
        else:
            return jsonify({"success": False, "message": "System declined payment: " + res_str})

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/create_fd", methods=["POST"])
def create_fd():
    try:
        req = request.json
        accNo = str(req.get("account"))
        amount = str(req.get("amount", "0"))
        tenure = str(req.get("tenure", "12"))
        
        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "message": "Amount must be strictly greater than zero."})
            
        accs = bank.get_report()
        current_acc = None
        for a in accs:
            if str(a["account_number"]) == accNo:
                current_acc = a
                break
                
        if not current_acc:
            return jsonify({"success": False, "message": "Account not found."})
            
        if float(str(current_acc["balance"]).replace(',', '')) < float(amount):
            return jsonify({"success": False, "result": "Insufficient balance."})
            
        out = bank.execute("7", [accNo, amount])
        res_str = parse_output(out)
        
        if "successfully" in res_str.lower():
            # Get updated balance
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            save_transaction(accNo, "FD Creation", f"-{amount}", b1)
            
            # Save FD Tenure
            if str(accNo) not in bank.user_details_db:
                bank.user_details_db[str(accNo)] = {}
            bank.user_details_db[str(accNo)]["fd_tenure"] = tenure
            save_profiles(bank.user_details_db)
            
            return jsonify({"success": True, "result": "FD created successfully."})
            
        return jsonify({"success": False, "result": res_str})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/withdraw_fd", methods=["POST"])
def withdraw_fd():
    try:
        req = request.json
        accNo = str(req.get("account"))

        accs = bank.get_report()
        current_acc = None
        for a in accs:
            if str(a["account_number"]) == accNo:
                current_acc = a
                break

        if not current_acc:
            return jsonify({"success": False, "message": "Account not found."})

        fd_amount_str = str(current_acc.get("fixed_deposit", "0")).replace(',', '')
        fd_amount = float(fd_amount_str)

        if fd_amount <= 0:
            return jsonify({"success": False, "message": "No Active Fixed Deposit found for this account."})

        # Process choice 8 for FD Withdrawal
        out = bank.execute("8", [accNo])
        res_str = parse_output(out)

        if "successfully" in res_str.lower() or "success" in res_str.lower() or "withdrawn" in res_str.lower():
            # Get updated balance
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            
            # The user might have accrued interest, but since it's hard to fetch the exact maturity amount dynamically here without another query, we will just deposit the current principal back as a base simulation. C++ handles exact numbers.
            save_transaction(accNo, "FD Withdrawal", f"+{fd_amount_str}", b1)
            
            # Remove any FD preferences from profile if any exist
            if str(accNo) in bank.user_details_db:
                if "fd_plan" in bank.user_details_db[str(accNo)]:
                    del bank.user_details_db[str(accNo)]["fd_plan"]
                if "fd_tenure" in bank.user_details_db[str(accNo)]:
                    del bank.user_details_db[str(accNo)]["fd_tenure"]
                save_profiles(bank.user_details_db)
                    
            return jsonify({"success": True, "result": "Fixed Deposit withdrawn successfully."})
            
        return jsonify({"success": False, "result": "Failed to withdraw FD: " + res_str})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/apply_loan", methods=["POST"])
def apply_loan():
    try:
        req = request.json
        accNo = str(req.get("account"))
        amount = str(req.get("amount", "0"))

        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "message": "Amount must be strictly greater than zero."})

        # Option 4: Apply Loan requires Account Number then Amount
        out = bank.execute("4", [accNo, amount])
        res_str = parse_output(out)

        if "approved" in res_str.lower() or "success" in res_str.lower():
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            save_transaction(accNo, "Loan Credit", f"+{amount}", b1)
            return jsonify({"success": True, "message": "Loan approved successfully.", "result": res_str})

        return jsonify({"success": False, "message": "Failed: " + res_str})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/repay_loan", methods=["POST"])
def repay_loan():
    try:
        req = request.json
        accNo = str(req.get("account"))
        amount = str(req.get("amount", "0"))

        if not re.match(r"^\d+(\.\d*)?$", amount) or float(amount) <= 0:
            return jsonify({"success": False, "message": "Amount must be strictly greater than zero."})

        accs = bank.get_report()
        current_acc = next((a for a in accs if str(a["account_number"]) == accNo), None)
        
        if not current_acc:
            return jsonify({"success": False, "message": "Account not found."})

        if float(str(current_acc["balance"]).replace(',', '')) < float(amount):
            return jsonify({"success": False, "result": "Insufficient balance for repayment."})

        out = bank.execute("5", [accNo, amount])
        res_str = parse_output(out)

        if "successfully" in res_str.lower() or "success" in res_str.lower() or "repaid" in res_str.lower():
            updated_accs = bank.get_report()
            b1 = next((a["balance"] for a in updated_accs if str(a["account_number"]) == accNo), "0")
            save_transaction(accNo, "Loan Repayment", f"-{amount}", b1)
            return jsonify({"success": True, "message": "Loan repayment processed successfully.", "result": res_str})

        return jsonify({"success": False, "message": "Failed: " + res_str})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route("/api/loans/<acc_no>", methods=["GET"])
def get_loans(acc_no):
    import os, json
    loans = []
    
    accs = bank.get_report()
    current_acc = next((a for a in accs if str(a["account_number"]) == str(acc_no)), None)
    if not current_acc:
        return jsonify({"success": False, "message": "Account not found", "loans": []})
        
    current_loan_amt = float(str(current_acc.get("loan_amount", "0")).replace(',', ''))
        
    if os.path.exists(BANK_DATA_JSON):
        try:
            with open(BANK_DATA_JSON, "r") as f:
                data = json.load(f)
                history = data.get("accounts", {}).get(str(acc_no), {}).get("history", [])
                
                # Active if there is still outstanding total loan
                status = "Active" if current_loan_amt > 0 else "Closed"
                
                # Reverse history to show latest
                for tx in reversed(history):
                    if "Loan Credit" in tx.get("type", ""):
                        amount = str(tx.get("amount", "")).replace("+", "").replace("-", "")
                        loans.append({
                            "type": "Personal Loan",
                            "date": tx.get("date", "").split(" ")[0],
                            "amount": amount,
                            "status": status,
                            "id": f"#LN-{len(loans)+1000}" 
                        })
        except Exception:
            pass
            
    return jsonify({"success": True, "loans": loans})

@app.route("/api/statement/<acc_no>")
def get_statement(acc_no):
    accounts = bank.get_report()
    acc_data = None
    for a in accounts:
        if str(a["account_number"]) == str(acc_no):
            acc_data = a
            break
            
    if not acc_data:
        acc_data = {"name": "Unknown", "balance": "0"}
        
    # Execute proper C++ menu to fetch FULL transaction history
    history = []
    if os.path.exists(BANK_DATA_JSON):
        try:
            with open(BANK_DATA_JSON, "r") as f:
                data = json.load(f)
                h = data.get("accounts", {}).get(str(acc_no), {}).get("history", [])
                history = h
        except:
            pass
            
    try:
        if os.path.exists("user_profiles.json"):
            with open("user_profiles.json", "r") as pf:
                profiles = json.load(pf)
                profile = profiles.get(str(acc_no), {})
                if "email" in profile:
                    acc_data["email"] = profile["email"]
                if "address" in profile:
                    acc_data["address"] = profile["address"]
    except:
        pass

    acc_data["history"] = history
    pdf_file = generate_pdf(acc_no, acc_data)
    
    with open(pdf_file, "rb") as f:
        pdf_bytes = f.read()
        
    response = make_response(pdf_bytes)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename=statement_{acc_no}.pdf'
    return response

@app.route("/api/analytics/<acc_no>", methods=["GET"])
def get_analytics(acc_no):
    accounts = bank.get_report()
    acc_data = next((a for a in accounts if str(a["account_number"]) == str(acc_no)), None)
    
    if not acc_data:
        return jsonify({"success": False, "message": "Account not found."}), 404
        
    history = []
    if os.path.exists(BANK_DATA_JSON):
        try:
            with open(BANK_DATA_JSON, "r") as f:
                data = json.load(f)
                history = data.get("accounts", {}).get(str(acc_no), {}).get("history", [])
        except Exception:
            pass
            
    total_income = 0.0
    total_expense = 0.0
    daily_data = {}
    
    for t in history:
        amt_str = str(t.get("amount", "0")).replace(',', '')
        import re
        amt_match = re.search(r'[\d\.]+', amt_str)
        amt = float(amt_match.group()) if amt_match else 0.0
        
        t_type = str(t.get("type", "")).lower()
        is_credit = amt_str.startswith('+') or 'in' in t_type or 'received' in t_type or 'credit' in t_type
        
        if is_credit:
            total_income += amt
        else:
            total_expense += amt
            
        date_str = str(t.get("date", ""))
        d_match = re.match(r'^(\d{4}-\d{2}-\d{2})', date_str)
        if d_match:
            d = d_match.group(1)
            if d not in daily_data:
                daily_data[d] = {"inc": 0.0, "exp": 0.0}
            if is_credit:
                daily_data[d]["inc"] += amt
            else:
                daily_data[d]["exp"] += amt
                
    analytics_payload = {
        "success": True,
        "balance": float(str(acc_data.get("balance", "0")).replace(',', '')),
        "total_deposits": total_income,
        "total_withdrawals": total_expense,
        "loan_amount": float(str(acc_data.get("loan_amount", "0")).replace(',', '')),
        "fixed_deposit": float(str(acc_data.get("fixed_deposit", "0")).replace(',', '')),
        "fd_tenure": bank.user_details_db.get(str(acc_no), {}).get("fd_tenure", "12"),
        "transaction_count": len(history),
        "daily_data": daily_data
    }
    
    return jsonify(analytics_payload)
            
    acc_data["history"] = history
    pdf_file = generate_pdf(acc_no, acc_data)
    
    with open(pdf_file, "rb") as f:
        pdf_bytes = f.read()
        
    response = make_response(pdf_bytes)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename={pdf_file}'
    return response

@app.route("/api/update_profile", methods=["POST"])
def update_profile():
    req = request.json
    acc_no = str(req.get("account_number"))
    email = str(req.get("email", ""))
    dob = str(req.get("dob", ""))
    
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"success": False, "message": "Invalid email formatting."})
        
    if not re.match(r"\d{4}-\d{2}-\d{2}", dob):
        return jsonify({"success": False, "message": "Date of birth must be YYYY-MM-DD"})
        
    if acc_no not in [str(a["account_number"]) for a in bank.get_report()] and acc_no != "99999999999999":
        return jsonify({"success": False, "message": "Account does not exist."})
        
    if acc_no not in bank.user_details_db:
        bank.user_details_db[acc_no] = {}
        
    bank.user_details_db[acc_no]["email"] = email
    bank.user_details_db[acc_no]["dob"] = dob
    save_profiles(bank.user_details_db)
    
    return jsonify({"success": True, "message": "Profile updated successfully"})

@app.route("/api/settings/password", methods=["POST"])
def update_password():
    req = request.json
    acc_no = str(req.get("account_number"))
    old_p = str(req.get("old_password", ""))
    new_p = str(req.get("new_password", ""))
    
    current_p = bank.user_details_db.get(acc_no, {}).get("nb_pass", "")
    if current_p and current_p != old_p:
        return jsonify({"success": False, "message": "Current password incorrect."})
        
    if len(new_p) < 4:
        return jsonify({"success": False, "message": "New password too short."})
        
    if acc_no not in bank.user_details_db:
        bank.user_details_db[acc_no] = {}
    
    bank.user_details_db[acc_no]["nb_pass"] = new_p
    save_profiles(bank.user_details_db)
    return jsonify({"success": True, "message": "Password updated successfully."})
    
@app.route("/api/settings/2fa", methods=["POST"])
def toggle_2fa():
    req = request.json
    acc_no = str(req.get("account_number"))
    if acc_no not in bank.user_details_db:
        bank.user_details_db[acc_no] = {}
    
    current = bank.user_details_db[acc_no].get("2fa_enabled", False)
    bank.user_details_db[acc_no]["2fa_enabled"] = not current
    save_profiles(bank.user_details_db)
    status = "enabled" if not current else "disabled"
    return jsonify({"success": True, "message": f"2-Factor Authentication {status}."})
    
@app.route("/api/settings/notifications", methods=["POST"])
def toggle_notifications():
    req = request.json
    acc_no = str(req.get("account_number"))
    if acc_no not in bank.user_details_db:
        bank.user_details_db[acc_no] = {}
    
    current = bank.user_details_db[acc_no].get("notifications", True)
    bank.user_details_db[acc_no]["notifications"] = not current
    save_profiles(bank.user_details_db)
    status = "enabled" if not current else "disabled"
    return jsonify({"success": True, "message": f"Notifications {status}."})

@app.route("/api/execute", methods=["POST"])
def execute_command():
    req = request.json
    choice = req.get("choice")
    inputs = req.get("inputs", [])
    out = bank.execute(str(choice), [str(i) for i in inputs])
    filtered_out = parse_output(out)
    return jsonify({"success": True, "result": filtered_out})

@app.route("/api/apply_cc", methods=["POST"])
def apply_cc():
    req = request.json
    accNo = str(req.get("accNo", ""))
    age = str(req.get("age", ""))
    income = str(req.get("income", ""))
    cibil = str(req.get("cibil", ""))
    citizenship = str(req.get("citizenship", ""))
    pan = str(req.get("pan", ""))
    address = str(req.get("address", ""))
    proof = str(req.get("proof", ""))

    with bank.lock:
        bank.stdin.write("13\n")
        bank.stdin.flush()
        bank.stdin.write(f"{accNo}\n")
        bank.stdin.flush()
        
        bank.stdin.write(f"{age}\n{income}\n{cibil}\n{citizenship}\n")
        bank.stdin.flush()
        
        start = time.time()
        buf = ""
        passed = False
        while time.time() - start < 3.0:
            char = bank.stdout.read(1)
            if not char: break
            buf += char
            if "Enter PAN Number:" in buf:
                passed = True
                break
            if "Enter choice:" in buf:
                break
                
        if passed:
            bank.stdin.write(f"{pan}\n{address}\n{proof}\n")
            bank.stdin.flush()
            end_buf = bank._read_until("Enter choice: ")
            buf += end_buf
            
            # Extract Credit Card details
            cc_match = re.search(r"Card Number\s*:\s*([\d\s]+)", buf)
            limit_match = re.search(r"Limit\s*:\s*\D*(\d+)", buf)
            
            if cc_match:
                import random
                details = bank.user_details_db.setdefault(str(accNo), {})
                base_cc = cc_match.group(1).strip()
                if len(base_cc.replace(" ", "")) == 12:
                    base_cc += str(random.randint(1000, 9999))
                details["cc_number"] = base_cc
                details["cc_cvv"] = str(random.randint(100, 999))
                details["cc_expiry"] = f"{random.randint(1, 12):02d}/{random.randint(28, 32)}"
                if limit_match:
                    details["cc_limit"] = limit_match.group(1).strip()
                save_profiles(bank.user_details_db)
            
            
    filtered = parse_output(buf)
    return jsonify({"success": True, "result": filtered})

@app.route("/api/create_upi", methods=["POST"])
def create_upi():
    req = request.json
    acc = req.get("account")
    upi_id = req.get("upi_id")
    upi_pin = str(req.get("upi_pin", ""))
    if not acc or not upi_id or len(upi_pin) not in [4, 6]:
        return jsonify({"success": False, "message": "Missing info or invalid UPI PIN (must be 4-6 digits)"})
    details = bank.user_details_db.get(str(acc), {})
    details["upi_id"] = upi_id
    details["upi_pin_hash"] = hashlib.sha256(upi_pin.encode()).hexdigest()
    bank.user_details_db[str(acc)] = details
    save_profiles(bank.user_details_db)
    bank.execute("10", [acc, upi_id])
    return jsonify({"success": True, "message": "UPI ID Created"})

@app.route("/api/reset_upi_pin", methods=["POST"])
def reset_upi_pin():
    import hashlib
    req = request.json
    acc = req.get("account")
    upi_pin = req.get("upi_pin")
    if not acc or not upi_pin or len(str(upi_pin)) not in [4, 6]:
        return jsonify({"success": False, "message": "Invalid PIN"})
    details = bank.user_details_db.get(str(acc), {})
    details["upi_pin_hash"] = hashlib.sha256(str(upi_pin).encode()).hexdigest()
    bank.user_details_db[str(acc)] = details
    save_profiles(bank.user_details_db)
    return jsonify({"success": True, "message": "UPI PIN Reset successful"})

if __name__ == "__main__":
    def open_browser():
        import webbrowser
        webbrowser.open("http://127.0.0.1:5000/")
    
    threading.Timer(1.5, open_browser).start()
    app.run(port=5000, debug=False, use_reloader=False)

