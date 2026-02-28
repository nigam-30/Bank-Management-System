// app.js

// ── Dark Mode (permanent) ──────────────────────────────────────────────────
// Tailwind uses `darkMode: "class"`, so we add "dark" to <html> immediately
// (before DOMContentLoaded) to prevent any flash of light-mode content.
document.documentElement.classList.add('dark');

document.addEventListener("DOMContentLoaded", () => {

    // Custom Modal System matching Tailwind/Theme
    const showModal = (title, message, fields = [], callback = null) => {
        const overlay = document.createElement("div");
        overlay.className = "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity";

        const modal = document.createElement("div");
        modal.className = "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] transform transition-all";

        // Header
        const header = document.createElement("div");
        header.className = "px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0";
        header.innerHTML = `<h3 class="font-bold text-lg text-slate-900 dark:text-white">${title}</h3>
                            <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors close-btn">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>`;

        const body = document.createElement("div");
        body.className = "p-6 flex flex-col gap-4 overflow-y-auto";
        if (message) {
            body.innerHTML += `<p class="text-sm text-slate-600 dark:text-slate-300 mb-2">${message}</p>`;
        }

        const inputs = [];
        fields.forEach(f => {
            const label = document.createElement("label");
            label.className = "flex flex-col gap-1.5";
            label.id = "modal-wrapper-" + f.id;
            label.innerHTML = `<span class="text-sm font-semibold text-slate-700 dark:text-slate-300">${f.label}</span>`;

            if (f.type === "select") {
                const select = document.createElement("select");
                select.className = "w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-slate-400";
                select.id = "modal-input-" + f.id;
                f.options.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt.value;
                    option.textContent = opt.text;
                    select.appendChild(option);
                });
                inputs.push({ id: f.id, element: select });
                label.appendChild(select);
            } else if (f.type === "combo") {
                const input = document.createElement("input");
                input.className = "w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-slate-400";
                input.setAttribute("list", "list-" + f.id);
                input.type = "text";
                input.id = "modal-input-" + f.id;
                input.placeholder = f.placeholder || "Select or enter manually...";
                if (f.value) input.value = f.value;
                const datalist = document.createElement("datalist");
                datalist.id = "list-" + f.id;
                f.options.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt.value;
                    option.textContent = opt.text;
                    datalist.appendChild(option);
                });
                label.appendChild(input);
                label.appendChild(datalist);
                inputs.push({ id: f.id, element: input });
            } else {
                const input = document.createElement("input");
                input.className = "w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder:text-slate-400";
                input.type = f.type || "text";
                input.id = "modal-input-" + f.id;
                input.placeholder = f.placeholder || "";
                if (f.value) input.value = f.value;
                if (f.maxLength) input.maxLength = f.maxLength;
                inputs.push({ id: f.id, element: input });
                label.appendChild(input);
            }
            body.appendChild(label);
        });

        // Footer
        const footer = document.createElement("div");
        footer.className = "px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 shrink-0";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "px-4 py-2 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors close-btn";
        cancelBtn.textContent = "Cancel";

        const submitBtn = document.createElement("button");
        submitBtn.className = "px-4 py-2 rounded-lg font-medium bg-primary text-white hover:bg-blue-600 shadow-sm transition-colors";
        submitBtn.textContent = fields.length ? "Submit" : "OK";

        const closeModal = () => {
            document.body.removeChild(overlay);
        };

        submitBtn.onclick = () => {
            const result = {};
            inputs.forEach(inp => result[inp.id] = inp.element.value);
            closeModal();
            if (callback) callback(result);
        };

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);

        modal.appendChild(header);
        modal.appendChild(body);
        modal.appendChild(footer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.querySelectorAll('.close-btn').forEach(btn => btn.onclick = closeModal);
        if (inputs.length > 0) inputs[0].element.focus();
    };

    // Custom Alert
    const customAlert = (title, message) => showModal(title, message, []);

    const fetchAccountsForDropdown = async (currentAcc) => {
        try {
            const res = await fetch('/api/accounts');
            const data = await res.json();
            if (data.error || !data.length) return [{ value: "", text: "No accounts found" }];
            return data.filter(a => String(a.account_number) !== String(currentAcc)).map(a => ({
                value: String(a.account_number),
                text: `${a.name} (${a.account_number})`
            }));
        } catch (e) {
            return [{ value: "", text: "Error loading accounts" }];
        }
    };

    // Login Handling
    const loginForm = document.querySelector('form');
    if (window.location.pathname === '/' || window.location.pathname.endsWith('code.html')) {
        // Fetch Demo Info
        fetch('/api/demo_info').then(r => r.json()).then(data => {
            if (data && Object.keys(data).length > 0) {
                const card = document.getElementById('demo-info-card');
                const grid = document.getElementById('demo-info-grid');
                if (card && grid) {
                    grid.innerHTML = '';
                    for (const [k, v] of Object.entries(data)) {
                        grid.innerHTML += `
                            <div class="flex flex-col mb-1">
                                <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">${k}</span>
                                <span class="text-slate-900 dark:text-white font-mono break-all font-medium">${v}</span>
                            </div>`;
                    }
                    card.classList.remove('hidden');
                }
            }
        }).catch(err => console.log('Demo info restricted', err));

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const inputs = loginForm.querySelectorAll('input');
                const accNo = inputs[0].value;
                const password = inputs.length > 1 ? inputs[1].value : "";

                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ account: accNo, password: password })
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('current_account', accNo);
                    window.location.href = '/dashboard';
                } else {
                    customAlert('Login Failed', data.message);
                }
            });

            // "Create an Account" button detection
            document.querySelectorAll('button').forEach(btn => {
                if (btn.textContent.includes('Create an Account')) {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        showModal("Create New Account", "Fill in your details to open an account with FinTech Bank.", [
                            { id: "name", label: "Full Name", placeholder: "e.g., Alex Johnson" },
                            { id: "email", label: "Email Address", placeholder: "e.g., alex@exampe.com", type: "email" },
                            { id: "dob", label: "Date of Birth", type: "date" },
                            { id: "address", label: "Home Address", type: "text", placeholder: "e.g., 123 Main St, City" },
                            { id: "initial", label: "Initial Deposit (INR)", placeholder: "e.g., 5000", type: "number" },
                            { id: "debit", label: "Issue Debit Card?", type: "select", options: [{ value: "y", text: "Yes" }, { value: "n", text: "No" }] },
                            { id: "pin", label: "Debit Card PIN (4 Digits)", placeholder: "e.g., 1234", type: "password" },
                            { id: "upi_id", label: "(Optional) Register UPI ID", placeholder: "e.g., name@upi" },
                            { id: "upi_pin", label: "Set UPI PIN (4-6 Digits)", type: "password", placeholder: "Required if UPI ID set" },
                            { id: "nb_pass", label: "(Optional) Set Netbanking Password", type: "password", placeholder: "Enter password" }
                        ], (res) => {
                            if (!res.name || !res.initial || !res.email || !res.dob || !res.address) return customAlert("Error", "Name, Email, DOB, Address and Initial Deposit are required.");
                            fetch('/api/create_account', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    name: res.name,
                                    email: res.email,
                                    address: res.address,
                                    dob: res.dob,
                                    deposit: res.initial,
                                    debit: res.debit,
                                    pin: res.pin || "0000",
                                    upi_id: res.upi_id || "",
                                    upi_pin: res.upi_pin || "",
                                    nb_pass: res.nb_pass || ""
                                })
                            }).then(r => r.json()).then(d => {
                                if (d.account_number) {
                                    customAlert("Success!", d.message + "\n\nRedirecting to dashboard securely...");
                                    setTimeout(() => {
                                        sessionStorage.setItem('current_account', d.account_number);
                                        window.location.href = '/dashboard';
                                    }, 2500);
                                } else {
                                    customAlert("Notice", d.message);
                                }
                            });
                        });
                    });
                }
            });
        }
    } // <-- Missing closing brace for the outer if block

    // Fetch and bind data for inner pages
    if (window.location.pathname !== '/' && window.location.pathname !== '/code.html') {
        const accNo = sessionStorage.getItem('current_account');
        if (!accNo && window.location.pathname !== '/favicon.ico') {
            window.location.href = '/';
            return;
        }

        fetch('/api/account/' + accNo)
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    customAlert("Authentication Error", "Account error or backend restarted.");
                    window.location.href = '/';
                    return;
                }
                // Update common UI parts
                document.title = "Fintech Bank - " + data.name;

                // Explicit Data Binding for UI Elements (replaces brittle walkDOM)
                const safeSetText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = text;
                };

                const balAmt = parseFloat(data.balance || 0);
                const loanAmt = parseFloat(data.loan_amount || 0);
                const fdAmt = parseFloat(data.fixed_deposit || 0);

                // Dashboard specific bindings
                safeSetText('ui-user-welcome', 'Welcome back, ' + data.name);
                safeSetText('ui-user-profile-name', data.name);
                safeSetText('ui-total-balance', balAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                safeSetText('ui-active-loans', loanAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                safeSetText('ui-active-fds', fdAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));

                // Settings specific bindings
                safeSetText('ui-user-profile-email', data.email || 'Not provided');
                safeSetText('ui-setting-name', data.name);
                safeSetText('ui-setting-email', data.email || 'Not provided');
                safeSetText('ui-setting-dob', data.dob || 'Not provided');
                safeSetText('ui-form-name', data.name);
                safeSetText('ui-form-email', data.email || 'Not provided');
                safeSetText('ui-form-dob', data.dob || 'Not provided');
                safeSetText('ui-setting-account-number', data.account_number);
                safeSetText('ui-setting-balance', balAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));

                // Loan specific bindings
                safeSetText('ui-loan-outstanding', loanAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                const emiAmt = loanAmt > 0 ? (loanAmt * 0.05) : 0;
                safeSetText('ui-loan-emi', emiAmt.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                let nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                const ds = loanAmt > 0 ? nextMonth.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';
                safeSetText('ui-loan-emi-date', ds);
                safeSetText('ui-loan-status-text', loanAmt > 0 ? 'Active Loan Account' : 'No Active Loans');
                safeSetText('ui-loan-preapproved', '₹0.00'); // Per user request to zero out the mock text

                safeSetText('ui-fd-status-text', fdAmt > 0 ? 'Active FD Account' : 'No Active FDs');
                safeSetText('ui-fd-maturity-date', fdAmt > 0 ? ds : '--');

                // Card specific bindings
                safeSetText('ui-card-name', data.name);
                safeSetText('ui-card-type', data.company ? data.company.toUpperCase() + ' DEBIT' : 'DEBIT CARD');
                if (window.location.pathname.includes('/cards')) {
                    const activeContainer = document.getElementById('active-card-container');
                    const noActiveContainer = document.getElementById('no-active-card-container');
                    if (data.card_number) {
                        if (activeContainer) activeContainer.classList.remove('hidden');
                        if (noActiveContainer) noActiveContainer.classList.add('hidden');
                        safeSetText('ui-card-number', data.card_number);
                    } else {
                        if (activeContainer) activeContainer.classList.add('hidden');
                        if (noActiveContainer) noActiveContainer.classList.remove('hidden');
                        safeSetText('ui-card-number', '•••• •••• •••• ••••');
                    }

                    const blockedContainer = document.getElementById('blocked-cards-container');
                    const blockedList = document.getElementById('blocked-cards-list');
                    if (data.blocked_cards && data.blocked_cards.length > 0 && blockedContainer && blockedList) {
                        blockedContainer.classList.remove('hidden');
                        blockedList.innerHTML = data.blocked_cards.map(bc => `
                            <div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div class="flex items-center gap-3">
                                    <span class="material-symbols-outlined text-red-500">credit_card_off</span>
                                    <div>
                                        <p class="text-sm font-medium text-slate-800 dark:text-slate-200">${bc.card_number}</p>
                                        <p class="text-xs text-slate-500">Exp: ${bc.expiry}</p>
                                    </div>
                                </div>
                                <span class="px-2.5 py-1 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">Blocked</span>
                            </div>
                        `).join('');
                    } else if (blockedContainer) {
                        blockedContainer.classList.add('hidden');
                    }
                } else {
                    safeSetText('ui-card-number', data.card_number || 'Acc: ' + data.account_number);
                }
                const exp = data.expiry || '--/--';
                const cvv = data.cvv ? ` | CVV: ${data.cvv}` : '';
                safeSetText('ui-card-expiry', `Valid Thru ${exp}${cvv}`);

                // Implement real-time transactions processing
                const tbody = document.querySelector('tbody');
                if (tbody) {
                    if (data.history && data.history.length > 0) {
                        let sorted = [...data.history].reverse();
                        if (window.location.pathname === '/dashboard') {
                            sorted = sorted.slice(0, 5);
                            tbody.innerHTML = sorted.map(t => {
                                const isCredit = String(t.amount).startsWith('+') || String(t.type).toLowerCase().includes('in') || String(t.type).toLowerCase().includes('received');
                                const sign = isCredit ? '+' : '';
                                const color = isCredit ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white';
                                return `
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-slate-900 dark:text-white">${t.type}</div></td>
                                        <td class="px-6 py-4 whitespace-nowrap"><div class="text-xs text-slate-500">${t.date}</div></td>
                                        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-slate-600 dark:text-slate-300">${isCredit ? 'Credit' : 'Debit'}</div></td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${color}">${sign}₹${Math.abs(parseFloat(t.amount)).toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</span></td>
                                    </tr>
                                `;
                            }).join('');
                        } else if (window.location.pathname === '/services') {
                            tbody.innerHTML = sorted.map(t => {
                                const isCredit = String(t.amount).startsWith('+') || String(t.type).toLowerCase().includes('in') || String(t.type).toLowerCase().includes('received');
                                const sign = isCredit ? '+' : '';
                                const color = isCredit ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white';
                                return `
                                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">${t.date}</td>
                                        <td class="px-6 py-4"><span class="text-sm font-medium text-slate-900 dark:text-white">${t.type}</span></td>
                                        <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-300"><span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">Standard</span></td>
                                        <td class="px-6 py-4 text-sm font-medium text-right whitespace-nowrap ${color}">${sign}₹${Math.abs(parseFloat(t.amount)).toFixed(2)}</td>
                                        <td class="px-6 py-4 text-center"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</span></td>
                                        <td class="px-6 py-4 text-center"><button class="text-slate-400 hover:text-primary transition-colors"><span class="material-symbols-outlined text-[20px]">more_horiz</span></button></td>
                                    </tr>
                                `;
                            }).join('');
                        }
                    } else {
                        tbody.innerHTML = `
                            <tr class="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors group">
                                <td class="px-6 py-8 whitespace-nowrap" colspan="6" align="center">
                                    <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">No recent transactions to show.</p>
                                </td>
                            </tr>
                        `;
                    }
                }

                // Fix pagination string if present
                const txCountEl = document.getElementById('ui-tx-count');
                const len = data.history ? data.history.length : 0;
                if (txCountEl) {
                    txCountEl.textContent = len === 0 ? "Showing 0 entries" : `Showing 1 to ${Math.min(5, len)} of ${len} entries`;
                }

                const txCountFullEl = document.getElementById('ui-tx-count-full');
                if (txCountFullEl) {
                    txCountFullEl.innerHTML = len === 0 ? "Showing 0 entries" : `Showing <span class="font-medium text-slate-900 dark:text-white">1-${Math.min(10, len)}</span> of <span class="font-medium text-slate-900 dark:text-white">${len}</span>`;
                }

                // Update Spending Limits from local storage
                const onlineLim = localStorage.getItem('online_limit_' + accNo);
                if (onlineLim) {
                    const el = document.getElementById('txt-online-limit');
                    if (el) el.textContent = onlineLim;
                }
                const atmLim = localStorage.getItem('atm_limit_' + accNo);
                if (atmLim) {
                    const el = document.getElementById('txt-atm-limit');
                    if (el) el.textContent = atmLim;
                }

                // Update Quick Transfer avatars (remove hardcoded mocks)
                const quickSendContainer = document.querySelector('.overflow-x-auto.pb-2');
                if (quickSendContainer) {
                    const fakeAvatars = quickSendContainer.querySelectorAll('.cursor-pointer');
                    fakeAvatars.forEach((avatar) => {
                        avatar.remove();
                    });
                }

                // Clean Hardcoded "Active FD" Cards
                const fdGrid = document.querySelector('.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
                if (fdGrid) {
                    const fakeCards = fdGrid.querySelectorAll('.group.relative');
                    fakeCards.forEach(c => c.remove());
                    // Zero out the "3" Active portfolios badge
                    const portfolioCount = document.querySelector('h2 > span.bg-slate-200');
                    if (portfolioCount && portfolioCount.textContent.trim() === '3') portfolioCount.textContent = '0';
                }



                // Generic Action buttons handling
                document.querySelectorAll('button').forEach(btn => {
                    const text = btn.textContent.trim().toLowerCase().replace(/\s+/g, ' ');

                    if (window.location.pathname === '/upi' && text.includes('transfer now')) {
                        btn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            const textInputs = document.querySelectorAll('input[type="text"]:not([name="transfer-method"])');
                            const toAcc = textInputs[0]?.value.trim();
                            const amount = document.querySelector('input[type="number"]')?.value.trim();

                            const purposeInput = document.querySelector('textarea');
                            const purpose = purposeInput && purposeInput.value.trim() ? purposeInput.value.trim() : "None";
                            const company = toAcc === "999999" ? "Fintech System Utility" : (toAcc.includes('@') ? toAcc.split('@')[0].toUpperCase() : "Individual Account");

                            if (!toAcc) return customAlert("Error", "Please enter a Recipient UPI ID or Account Number.");
                            if (!amount || isNaN(amount) || Number(amount) <= 0) return customAlert("Error", "Please enter a valid amount.");

                            const selectedMethod = document.querySelector('input[name="transfer-method"]:checked')?.value || 'upi';
                            const methodNameText = selectedMethod === 'netbanking' ? 'Net Banking' : 'UPI';

                            if (confirm(`Confirm ${methodNameText} Transfer of ₹${amount} to ${toAcc}?`)) {
                                fetch('/api/transfer', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ method: selectedMethod, from_acc: accNo, to_acc: toAcc, amount: amount })
                                })
                                    .then(rs => rs.json())
                                    .then(d => {
                                        if (d.success) {
                                            customAlert("Payment Successful", `<b>Company / Receiver:</b> ${company}<br><b>Purpose:</b> ${purpose}<br><b>Amount:</b> ₹${amount}<br><br><span class="text-green-600">${d.result || d.message}</span>`);
                                            setTimeout(() => window.location.href = '/dashboard', 3000);
                                        } else {
                                            customAlert("UPI Payment Failed", d.result || d.message);
                                        }
                                    });
                            }
                        });
                    }

                    else if (text.includes('transfer') || text.includes('send')) {
                        btn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            const options = await fetchAccountsForDropdown(accNo);
                            if (options.length === 0 || options[0].value === "") return customAlert("Error", "No available accounts.");
                            showModal("Transfer Funds", "Securely transfer money to another account.", [
                                { id: "method", label: "Transfer Method", type: "select", options: [{ value: "netbanking", text: "Net Banking" }, { value: "upi", text: "UPI" }] },
                                { id: "toAcc", label: "Receiver Account Number", type: "combo", options: options },
                                { id: "amount", label: "Amount (INR)", placeholder: "0.00", type: "number" }
                            ], (res) => {
                                if (res.toAcc && res.amount && res.method) {
                                    fetch('/api/transfer', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ method: res.method, from_acc: accNo, to_acc: res.toAcc, amount: res.amount })
                                    }).then(r => r.json()).then(d => {
                                        customAlert("Transaction Details", d.result);
                                        setTimeout(() => window.location.reload(), 2000);
                                    });
                                }
                            });
                        });
                    }
                    else if (text.includes('top up') || (text.includes('deposit') && !text.includes('fixed') && !text.includes('fd'))) {
                        btn.addEventListener('click', async (e) => {
                            e.preventDefault();
                            showModal("Top Up Account", "Add funds securely to your account.", [
                                { id: "amount", label: "Amount (INR)", type: "number", placeholder: "e.g., 5000" }
                            ], (res) => {
                                if (res.amount) {
                                    fetch('/api/transfer', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ method: "topup", from_acc: "999999", to_acc: accNo, amount: res.amount })
                                    }).then(r => r.json()).then(d => {
                                        customAlert("Top Up", d.result || "Top Up Processed");
                                        setTimeout(() => window.location.reload(), 2000);
                                    });
                                }
                            });
                        });
                    }

                    else if (text.includes('apply for loan')) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            showModal("Apply for Loan", "Enter the loan amount you wish to apply for.", [
                                { id: "amount", label: "Loan Amount (INR)", placeholder: "e.g., 50000", type: "number" }
                            ], (res) => {
                                if (res.amount) {
                                    fetch('/api/apply_loan', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ account: accNo, amount: res.amount })
                                    }).then(r => r.json()).then(d => {
                                        customAlert("Loan Application", d.result || d.message);
                                        if (d.success) setTimeout(() => window.location.reload(), 2000);
                                    });
                                }
                            });
                        });
                    }

                    else if ((text.includes('create fixed deposit') || text.includes('new fd')) && btn.id !== 'btn-create-fd-page') {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            showModal("Create Fixed Deposit", "Open a new FD and earn higher interest.", [
                                { id: "amount", label: "FD Amount (INR)", placeholder: "e.g., 10000", type: "number" },
                                { id: "tenure", label: "Tenure (Months)", placeholder: "e.g., 12", type: "number" }
                            ], (res) => {
                                if (res.amount && res.tenure) {
                                    fetch('/api/create_fd', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ account: accNo, amount: res.amount, tenure: res.tenure })
                                    }).then(r => r.json()).then(d => {
                                        customAlert("Fixed Deposit", d.result);
                                        setTimeout(() => window.location.reload(), 2000);
                                    });
                                }
                            });
                        });
                    }

                    // Repay Loan is specifically handled lower in the file by ID.
                    else if (text.includes('withdraw fd')) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (!confirm("Are you sure you want to withdraw your FD early? Penalties may apply.")) return;
                            fetch('/api/withdraw_fd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: accNo }) })
                                .then(rs => rs.json())
                                .then(d => {
                                    customAlert("FD Withdrawal", d.result || d.message);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                        });
                    }
                    else if (text.includes('statement') || text.includes('download') || text.includes('get statement')) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const downloadUrl = `/api/statement/${accNo}`;
                            fetch(downloadUrl)
                                .then(resp => {
                                    if (!resp.ok) throw new Error("Network response was not ok");
                                    return resp.blob();
                                })
                                .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.style.display = 'none';
                                    a.href = url;
                                    a.download = `statement_${accNo}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);
                                })
                                .catch(() => {
                                    if (typeof customAlert === 'function') {
                                        customAlert("Error", "Could not download the statement. Please try again later.");
                                    } else {
                                        alert("Could not download the statement.");
                                    }
                                });
                        });
                    }
                    else if (text === 'manage' || text === 'manage limits') {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            showModal("Manage Spending Limits", "Update your daily spending constraints.", [
                                { id: "online", label: "Online Transactions Limit (INR)", type: "number", placeholder: "e.g., 5000", value: document.getElementById('txt-online-limit')?.textContent.replace(/\D/g, '') || "" },
                                { id: "atm", label: "ATM Withdrawal Limit (INR)", type: "number", placeholder: "e.g., 1000", value: document.getElementById('txt-atm-limit')?.textContent.replace(/\D/g, '') || "" }
                            ], (res) => {
                                if (res.online || res.atm) {
                                    if (res.online) {
                                        const el = document.getElementById('txt-online-limit');
                                        if (el) el.textContent = res.online;
                                        localStorage.setItem('online_limit_' + accNo, res.online);
                                    }
                                    if (res.atm) {
                                        const el = document.getElementById('txt-atm-limit');
                                        if (el) el.textContent = res.atm;
                                        localStorage.setItem('atm_limit_' + accNo, res.atm);
                                    }
                                    customAlert("Success", "Spending limits updated successfully.");
                                }
                            });
                        });
                    }
                    else if (text === 'block card' || text === 'block') {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (confirm("Are you sure you want to block your debit card? You will need to contact support to unblock it.")) {
                                fetch('/api/block_card', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ account: accNo })
                                }).then(rs => rs.json()).then(d => {
                                    customAlert("Security Notice", d.message);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                            }
                        });
                    }
                    else if (['filter', 'export', 'next', 'previous', 'contact support'].some(w => text.includes(w))) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            customAlert("Notice", "This feature is currently unavailable or under maintenance.");
                        });
                    }
                    else if (text.includes('update') || text.includes('edit')) {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            showModal("Edit Profile", "Update your profile details.", [
                                { id: "email", label: "Email Address", type: "email", value: data.email || "" },
                                { id: "dob", label: "Date of Birth", type: "date", value: data.dob || "" }
                            ], (res) => {
                                if (res.email && res.dob) {
                                    fetch('/api/update_profile', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ account_number: accNo, email: res.email, dob: res.dob })
                                    }).then(r => r.json()).then(d => {
                                        customAlert(d.success ? "Success" : "Error", d.message);
                                        if (d.success) setTimeout(() => window.location.reload(), 2000);
                                    });
                                } else {
                                    customAlert("Error", "All fields are required.");
                                }
                            });
                        });
                    }
                });

                // Issue Debit Card handling
                const bIssueCard = document.getElementById('btn-issue-card');
                if (bIssueCard) {
                    bIssueCard.addEventListener('click', (e) => {
                        e.preventDefault();
                        showModal("Set Card PIN", "Please choose a 4-digit PIN for your new debit card.", [
                            { id: "pin", label: "4-Digit PIN", type: "password", placeholder: "e.g., 1234" }
                        ], (res) => {
                            if (!res.pin || res.pin.length !== 4 || isNaN(res.pin)) {
                                return customAlert("Error", "Please enter a valid 4-digit PIN.");
                            }
                            fetch('/api/issue_card', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ account: accNo, pin: res.pin })
                            }).then(r => r.json()).then(d => {
                                customAlert("Debit Card", d.message);
                                if (d.success) setTimeout(() => window.location.reload(), 2000);
                            });
                        });
                    });
                }

                const nav = document.querySelector('aside nav');
                if (nav && !document.querySelector('.injected-services')) {
                    nav.insertAdjacentHTML('beforeend', `
                 <a href="#" id="btn-pay-bill" class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors injected-services"><span class="material-symbols-outlined">receipt_long</span><span class="text-sm font-medium">Bill Payment / Other</span></a>
                 `);
                }

                const bPayUpi = document.getElementById('btn-pay-upi');
                if (bPayUpi) bPayUpi.onclick = async (e) => {
                    e.preventDefault();
                    const options = await fetchAccountsForDropdown(accNo);
                    if (options.length === 0 || options[0].value === "") return customAlert("Error", "No available accounts.");
                    showModal("Pay via UPI", "Transfer using UPI.", [
                        { id: "toAcc", label: "Recipient Account", type: "combo", options: options },
                        { id: "amount", type: "number", label: "Amount (INR)" }
                    ], r => {
                        if (r.toAcc && r.amount) fetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method: 'upi', from_acc: accNo, to_acc: r.toAcc, amount: r.amount }) }).then(rs => rs.json()).then(d => { customAlert("UPI Payment", d.result); setTimeout(() => window.location.reload(), 2000); });
                    });
                };

                const bPayBill = document.getElementById('btn-pay-bill');
                if (bPayBill) bPayBill.onclick = async (e) => {
                    e.preventDefault();
                    showModal("Bill Payment & Others", "Select category to pay.", [
                        { id: "biller", label: "Select Biller/Purpose", type: "select", options: [{ value: "Electricity", text: "Electricity" }, { value: "Water", text: "Water" }, { value: "Broadband/Mobile", text: "Broadband/Mobile" }, { value: "Gas", text: "Gas" }, { value: "DTH", text: "DTH" }, { value: "Other/Merchant", text: "Other/Merchant Payment" }] },
                        { id: "company", label: "Company/Merchant Name", type: "text", placeholder: "e.g. Tata Power / Amazon" },
                        { id: "amount", type: "number", label: "Amount (INR)" },
                        {
                            id: "method", label: "Payment Source", type: "select", options: [
                                { value: "Account Balance", text: "Account Balance" },
                                { value: "Net Banking", text: "Net Banking" },
                                { value: "Debit Card", text: "Debit Card" },
                                { value: "UPI", text: "UPI" }
                            ]
                        },
                        { id: "nb_password", label: "Net Banking Password", type: "password", placeholder: "Enter Password" },
                        { id: "card_number", label: "Card Number", type: "text", placeholder: "16-digit card number" },
                        { id: "card_expiry", label: "Expiry Date (MM/YY)", type: "text", placeholder: "MM/YY" },
                        { id: "card_cvv", label: "CVV", type: "password", placeholder: "***" },
                        { id: "card_name", label: "Name on Card", type: "text", placeholder: "Cardholder Name" },
                        { id: "upi_id", label: "UPI ID", type: "text", placeholder: "e.g. username@bank" },
                        { id: "upi_pin", label: "UPI PIN", type: "password", placeholder: "4 or 6 digit PIN" },
                        { id: "remarks", label: "Remarks (Optional)", type: "text", placeholder: "e.g. November electricity bill", maxLength: 100 }
                    ], r => {
                        if (r.biller && r.company && r.amount && r.method && parseFloat(r.amount) > 0) {
                            fetch('/api/pay_bill', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(Object.assign({ account: accNo }, r))
                            })
                                .then(rs => rs.json())
                                .then(d => {
                                    customAlert(d.success ? "Payment Successful" : "Payment Failed", d.message || d.result);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                        } else {
                            customAlert("Error", "Please fill required fields appropriately and enter a valid amount.");
                        }
                    });

                    setTimeout(() => {
                        const met = document.getElementById('modal-input-method');
                        const toggleIds = (ids, show) => {
                            ids.forEach(i => {
                                const el = document.getElementById('modal-wrapper-' + i);
                                if (el) el.style.display = show ? 'flex' : 'none';
                            });
                        };

                        const updateFields = () => {
                            const val = met.value;
                            toggleIds(['nb_password', 'card_number', 'card_expiry', 'card_cvv', 'card_name', 'upi_id', 'upi_pin'], false);

                            if (val === 'Net Banking') toggleIds(['nb_password'], true);
                            else if (val === 'Debit Card') toggleIds(['card_number', 'card_expiry', 'card_cvv', 'card_name'], true);
                            else if (val === 'UPI') toggleIds(['upi_id', 'upi_pin'], true);
                        };

                        if (met) {
                            met.addEventListener('change', updateFields);
                            updateFields();
                        }
                    }, 50);
                };

                const btnApplyL = document.getElementById('btn-apply-loan');
                if (btnApplyL) btnApplyL.onclick = (e) => {
                    e.preventDefault();
                    showModal("Loan Verification", "Complete your verification for instant approval.", [
                        { id: "employment", label: "Employment Type", type: "select", options: [{ value: "Salaried", text: "Salaried" }, { value: "Self-Employed", text: "Self-Employed" }] },
                        { id: "income", type: "number", label: "Monthly Income (INR)", placeholder: "e.g. 50000" },
                        { id: "cibil", type: "number", label: "Current CIBIL Score", placeholder: "e.g. 750" },
                        { id: "amount", type: "number", label: "Requested Loan Amount (INR)" }
                    ], r => {
                        if (r.amount && r.income && r.cibil) {
                            if (parseInt(r.cibil) < 650) {
                                return customAlert("Verification Failed", "Sorry, your CIBIL score is too low for an instant loan.");
                            }
                            if (parseInt(r.amount) > parseInt(r.income) * 12) {
                                return customAlert("Verification Failed", "Requested amount exceeds maximum eligible limit based on your income (12x).");
                            }
                            fetch('/api/apply_loan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ account: accNo, amount: r.amount })
                            }).then(rs => rs.json()).then(d => {
                                customAlert(d.success ? "Success" : "Failed", d.message || d.result);
                                if (d.success) setTimeout(() => window.location.reload(), 1500);
                            });
                        } else {
                            customAlert("Error", "Please complete all verification fields securely.");
                        }
                    });
                };



                const btnRepayL = document.getElementById('btn-repay-loan');
                if (btnRepayL) btnRepayL.onclick = (e) => {
                    e.preventDefault();
                    showModal("Repay Loan", "Enter repayment amount.", [{ id: "amt", type: "number", label: "Amount (INR)" }], r => {
                        if (r.amt) {
                            fetch('/api/repay_loan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ account: accNo, amount: r.amt })
                            }).then(rs => rs.json()).then(d => {
                                customAlert("Loan Repayment", d.result || d.message);
                                if (d.success) setTimeout(() => window.location.reload(), 2000);
                            });
                        }
                    });
                };

                const bWithdrawFd = document.getElementById('btn-withdraw-fd');
                if (bWithdrawFd) bWithdrawFd.onclick = (e) => { e.preventDefault(); fetch('/api/withdraw_fd', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account: accNo }) }).then(rs => rs.json()).then(d => { customAlert("Withdraw FD", d.result || d.message); setTimeout(() => window.location.reload(), 2000); }); };
            });

        // Global Navigation Link Mapping (Header & Sidebars)
        document.querySelectorAll('a').forEach(a => {
            const txt = a.textContent.trim().toLowerCase();
            if (txt.includes('dashboard') || txt === 'home' || txt.includes('transaction')) a.href = '/dashboard';
            else if (txt.includes('account')) a.href = '/account';
            else if (txt.includes('loan')) a.href = '/loan';
            else if (txt.includes('fixed deposit') || txt.includes('invest')) a.href = '/invest';
            else if (txt.includes('money transfer') || txt.includes('upi transfer')) {
                a.href = '#';
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof showModal !== 'undefined') {
                        let options = [{ value: "999999", text: "External Utility Account" }];
                        if (typeof fetchAccountsForDropdown !== 'undefined') {
                            options = await fetchAccountsForDropdown(accNo);
                        }
                        showModal("Money Transfer", "Choose your transfer method and details.", [
                            { id: "method", label: "Transfer Method", type: "select", options: [{ value: "netbanking", text: "Net Banking" }, { value: "upi", text: "UPI" }] },
                            { id: "toAcc", label: "Recipient Account / UPI ID", type: "combo", options: options },
                            { id: "amount", type: "number", label: "Amount (INR)", placeholder: "0.00" }
                        ], (res) => {
                            if (res.toAcc && res.amount && res.method) {
                                fetch('/api/transfer', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ method: res.method, from_acc: accNo, to_acc: res.toAcc, amount: res.amount })
                                }).then(r => r.json()).then(d => {
                                    customAlert("Transaction Details", d.result || d.message);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                            }
                        });
                    }
                });
            }
            else if (txt.includes('cheque')) {
                a.href = '#';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (typeof showModal !== 'undefined') {
                        showModal("Cheque Book Services", "Request a new Cheque Book for your account.", [
                            { id: "leaves", label: "Number of Leaves", type: "select", options: [{ value: "25", text: "25 Leaves" }, { value: "50", text: "50 Leaves" }, { value: "100", text: "100 Leaves" }] }
                        ], (res) => {
                            if (res.leaves) {
                                customAlert("Success", "Cheque Book request submitted successfully. It will be delivered to your registered address.");
                            }
                        });
                    }
                });
            }
            else if (txt.includes('service') || txt.includes('analytic') || txt.includes('report')) a.href = '/services';
            else if (txt.includes('credit / deposit')) {
                a.href = '#';
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof showModal !== 'undefined') {
                        const accNo = sessionStorage.getItem('current_account') || "";
                        let options = [{ value: accNo, text: `Active: ${accNo}` }];
                        if (typeof fetchAccountsForDropdown !== 'undefined') {
                            options = await fetchAccountsForDropdown(accNo);
                        }
                        showModal("Deposit Funds", "Enter amount to deposit into your account.", [
                            { id: "toAcc", label: "Select Account", type: "combo", options: options },
                            { id: "amount", label: "Amount (INR)", type: "number", placeholder: "e.g., 5000" }
                        ], (res) => {
                            if (res.toAcc && res.amount) {
                                fetch('/api/execute', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ choice: "1", inputs: [res.toAcc, res.amount] })
                                }).then(rs => rs.json()).then(d => {
                                    customAlert("Deposit", d.result || d.message);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                            }
                        });
                    }
                });
            }
            else if (txt.includes('debit / withdraw')) {
                a.href = '#';
                a.addEventListener('click', async (e) => {
                    e.preventDefault();
                    if (typeof showModal !== 'undefined') {
                        const accNo = sessionStorage.getItem('current_account') || "";
                        let options = [{ value: accNo, text: `Active: ${accNo}` }];
                        if (typeof fetchAccountsForDropdown !== 'undefined') {
                            options = await fetchAccountsForDropdown(accNo);
                        }
                        showModal("Withdraw Funds", "Enter amount to withdraw from your account.", [
                            { id: "toAcc", label: "Select Account", type: "combo", options: options },
                            { id: "amount", label: "Amount (INR)", type: "number", placeholder: "e.g., 2000" }
                        ], (res) => {
                            if (res.toAcc && res.amount) {
                                fetch('/api/execute', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ choice: "2", inputs: [res.toAcc, res.amount] })
                                }).then(rs => rs.json()).then(d => {
                                    customAlert("Withdraw", d.result || d.message);
                                    if (d.success) setTimeout(() => window.location.reload(), 2000);
                                });
                            }
                        });
                    }
                });
            }
            else if (txt.includes('card') || txt.includes('payment')) a.href = '/cards';
            else if (txt.includes('setting')) a.href = '/account';

            // Sync Active State correctly on left sidebar links
            const path = a.href !== '#' ? new URL(a.href, window.location.origin).pathname : null;
            if (path && window.location.pathname.includes(path) && path !== '/') {
                if (a.closest('aside') || a.closest('nav')) {
                    a.classList.add('bg-primary/10', 'text-primary', 'dark:bg-primary/20');
                    a.classList.remove('text-slate-600', 'text-slate-700', 'hover:bg-slate-50', 'hover:bg-slate-100', 'dark:hover:bg-slate-800', 'dark:hover:bg-gray-800');
                    const icon = a.querySelector('.material-symbols-outlined');
                    if (icon) {
                        icon.classList.remove('text-slate-500', 'dark:text-slate-400');
                        icon.classList.add('text-primary');
                    }
                }
            }
        });

        // Logout
        document.querySelectorAll('a, button').forEach(el => {
            const txt = el.textContent.toLowerCase();
            if (txt.includes('logout') && !txt.includes('dashboard')) {
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    sessionStorage.removeItem('current_account');
                    window.location.href = '/';
                });
            }
        });

        // Settings / Additional toggles
        document.querySelectorAll('p, button, div').forEach(el => {
            const txt = el.textContent ? el.textContent.trim() : '';
            if (txt === 'Change Password' && !el.hasAttribute('data-bound')) {
                el.setAttribute('data-bound', 'true');
                const p = el.closest('.group') || el;
                p.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showModal("Change Password", "Update your NetBanking Password", [
                        { id: "old_pass", label: "Current Password", type: "password" },
                        { id: "new_pass", label: "New Password", type: "password" }
                    ], r => {
                        if (r.old_pass && r.new_pass) fetch('/api/settings/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_number: accNo, old_password: r.old_pass, new_password: r.new_pass }) }).then(x => x.json()).then(d => { customAlert(d.success ? "Success" : "Error", d.message); });
                    });
                });
            }
            if (txt === '2-Factor Auth' && !el.hasAttribute('data-bound')) {
                el.setAttribute('data-bound', 'true');
                const p = el.closest('.group') || el;
                p.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fetch('/api/settings/2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_number: accNo }) }).then(x => x.json()).then(d => {
                        customAlert(d.success ? "Success" : "Error", d.message);
                        if (d.success) setTimeout(() => window.location.reload(), 1500);
                    });
                });
            }
            if (txt.toLowerCase() === 'notifications' && el.tagName === 'BUTTON' && !el.hasAttribute('data-bound')) {
                el.setAttribute('data-bound', 'true');
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    fetch('/api/settings/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_number: accNo }) }).then(x => x.json()).then(d => {
                        customAlert(d.success ? "Success" : "Error", d.message);
                    });
                });
            }
        });

        // Analytics Math Parsing
        if (window.location.pathname === '/services') {
            fetch('/api/analytics/' + accNo)
                .then(r => r.json())
                .then(analytics => {
                    const elBal = document.getElementById('analytics-balance');
                    const elDep = document.getElementById('analytics-deposits');
                    const elWith = document.getElementById('analytics-withdrawals');
                    const elLoan = document.getElementById('analytics-loan');
                    const elFd = document.getElementById('analytics-fd');
                    const elTx = document.getElementById('analytics-transactions');

                    if (elBal) elBal.textContent = (analytics.balance || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (elDep) elDep.textContent = (analytics.total_deposits || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (elWith) elWith.textContent = (analytics.total_withdrawals || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (elLoan) elLoan.textContent = (analytics.loan_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (elFd) elFd.textContent = (analytics.fixed_deposit || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    if (elTx) elTx.textContent = (analytics.transaction_count || 0).toString();

                    const chartArea = document.getElementById('analytics-chart');
                    if (chartArea) {
                        const dailyData = analytics.daily_data || {};
                        if (analytics.transaction_count === 0 || Object.keys(dailyData).length === 0) {
                            chartArea.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-slate-400 font-medium w-full text-center">No transaction history available for analytics</div>';
                        } else {
                            let dates = Object.keys(dailyData).sort();
                            if (dates.length > 10) dates = dates.slice(-10);
                            let maxVal = 1;
                            dates.forEach(d => {
                                if (dailyData[d].inc > maxVal) maxVal = dailyData[d].inc;
                                if (dailyData[d].exp > maxVal) maxVal = dailyData[d].exp;
                            });

                            let chartHTML = `
                            <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div class="border-t border-slate-100 dark:border-slate-800 w-full h-0"></div>
                                <div class="border-t border-slate-100 dark:border-slate-800 w-full h-0"></div>
                                <div class="border-t border-slate-100 dark:border-slate-800 w-full h-0"></div>
                                <div class="border-t border-slate-100 dark:border-slate-800 w-full h-0"></div>
                                <div class="border-t border-slate-100 dark:border-slate-800 w-full h-0"></div>
                            </div>`;

                            dates.forEach(d => {
                                let inc = dailyData[d].inc;
                                let exp = dailyData[d].exp;
                                let hpInc = (inc / maxVal) * 100;
                                let hpExp = (exp / maxVal) * 100;
                                let dateLabel = d.split('-').slice(1).join('/');

                                chartHTML += `
                                <div class="flex flex-col items-center gap-2 w-full group relative z-10 h-full justify-end">
                                    <div class="flex items-end gap-1 h-full w-full justify-center">
                                        <div class="w-[30%] max-w-[24px] bg-primary rounded-t-sm relative group-hover:opacity-80 transition-opacity" style="height: ${hpInc}%"></div>
                                        <div class="w-[30%] max-w-[24px] bg-slate-300 dark:bg-slate-600 rounded-t-sm relative group-hover:opacity-80 transition-opacity" style="height: ${hpExp}%"></div>
                                    </div>
                                    <span class="text-[10px] sm:text-xs text-slate-400 opacity-80 mt-1">${dateLabel}</span>
                                    <div class="absolute bottom-full mb-1 sm:mb-2 hidden group-hover:flex flex-col bg-slate-800 text-white text-xs rounded p-2 z-20 min-w-max shadow-lg transform -translate-x-1/2 left-1/2">
                                        <div class="flex justify-between gap-4"><span>Inc:</span> <span class="font-bold whitespace-nowrap">₹${inc.toFixed(0)}</span></div>
                                        <div class="flex justify-between gap-4"><span>Exp:</span> <span class="font-bold whitespace-nowrap">₹${exp.toFixed(0)}</span></div>
                                    </div>
                                </div>`;
                            });

                            chartArea.innerHTML = chartHTML;
                        }
                    }
                });

            // Update hardcoded calendar string dynamically
            const dateSpan = document.getElementById('analytics-date-range');
            if (dateSpan) {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const opts = { month: 'short', day: 'numeric', year: 'numeric' };
                dateSpan.textContent = `${firstDay.toLocaleDateString('en-IN', opts)} - ${lastDay.toLocaleDateString('en-IN', opts)}`;
            }

            // Set dynamic today for any date inputs (UPI forms, etc.)
            document.querySelectorAll('input[type="date"]').forEach(inp => {
                if (inp.value === '2023-10-27' || inp.value === '2023-10-24') {
                    inp.value = new Date().toISOString().split('T')[0];
                }
            });
        }

        // Start of Loan Page Logic
        if (window.location.pathname === '/loan' || window.location.pathname === '/loan.html' || window.location.pathname.includes('code(4)')) {
            const amtSld = document.getElementById('emi-amount-slider');
            const amtDis = document.getElementById('emi-amount-display');
            const tenSld = document.getElementById('emi-tenure-slider');
            const tenDis = document.getElementById('emi-tenure-display');
            const intDis = document.getElementById('emi-interest-display');
            const moDis = document.getElementById('emi-monthly-display');
            const totIntDis = document.getElementById('emi-total-interest-display');
            const totPayDis = document.getElementById('emi-total-payable-display');
            const btnApply = document.getElementById('btn-apply-loan-page');

            const calcEmi = () => {
                if (!amtSld || !tenSld) return;
                let P = parseFloat(amtSld.value) || 0;
                let Y = parseInt(tenSld.value) || 0;
                let N = Y * 12; // total months
                let R = 10.5 / 12 / 100; // monthly rate

                if (amtDis) amtDis.textContent = P.toLocaleString();
                if (tenDis) tenDis.textContent = Y + (Y === 1 ? ' Year' : ' Years');
                if (intDis) intDis.textContent = '10.5%';

                let emi = 0;
                let totalPayable = 0;
                let totalInterest = 0;

                if (P > 0 && N > 0) {
                    emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
                    totalPayable = emi * N;
                    totalInterest = totalPayable - P;
                }

                if (moDis) moDis.textContent = emi.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
                if (totIntDis) totIntDis.textContent = totalInterest.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
                if (totPayDis) totPayDis.textContent = totalPayable.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 });
            };

            if (amtSld) amtSld.addEventListener('input', calcEmi);
            if (tenSld) tenSld.addEventListener('input', calcEmi);

            if (btnApply) {
                btnApply.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (btnApply.hasAttribute('disabled')) return;
                    btnApply.setAttribute('disabled', 'true');

                    let P = parseFloat(amtSld.value) || 0;

                    fetch('/api/apply_loan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ account: accNo, amount: P })
                    }).then(r => r.json()).then(d => {
                        btnApply.removeAttribute('disabled');
                        customAlert(d.success ? "Success" : "Failed", d.result || d.message);
                        if (d.success) setTimeout(() => window.location.reload(), 2000);
                    });
                });
            }

            calcEmi(); // Init calculation

            // GET Loan history
            const tbody = document.getElementById('loan-history-tbody');
            if (tbody) {
                fetch('/api/loans/' + accNo)
                    .then(r => r.json())
                    .then(d => {
                        if (d.success && d.loans && d.loans.length > 0) {
                            tbody.innerHTML = '';
                            d.loans.forEach(L => {
                                let statusClass = L.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';

                                const tr = document.createElement('tr');
                                tr.className = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors";
                                tr.innerHTML = `
                                <td class="px-6 py-4">
                                <div class="font-bold text-slate-900 dark:text-white">${L.type}</div>
                                <div class="text-xs text-slate-500">ID: ${L.id}</div>
                                </td>
                                <td class="px-6 py-4 text-slate-600 dark:text-slate-400">${L.date}</td>
                                <td class="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">${parseFloat(L.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })}</td>
                                <td class="px-6 py-4 text-center">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                                                                ${L.status}
                                                                            </span>
                                </td>
                            `;
                                tbody.appendChild(tr);
                            });
                        } else {
                            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">No loan history available.</td></tr>';
                        }
                    });
            }
        }

        // Start of Invest Page Math Parsing (Issue 1)
        if (window.location.pathname === '/invest' || window.location.pathname === '/invest.html' || window.location.pathname.includes('code(5)')) {
            const fdAmt = document.getElementById('fd-amount');
            const fdDur = document.getElementById('fd-duration');
            const fdInt = document.getElementById('fd-interest');
            const fdMat = document.getElementById('fd-maturity');
            const fdDat = document.getElementById('fd-date');
            const btnFd = document.getElementById('btn-create-fd-page');

            const calcFd = () => {
                if (!fdAmt || !fdDur || !fdInt || !fdMat || !fdDat) return;
                let amt = parseFloat(fdAmt.value) || 0;
                let mos = parseInt(fdDur.value) || 0;
                // Interest = Principal * Rate * Time / 100
                let interest = (amt * 7.2 * (mos / 12)) / 100;
                let mat = amt + interest;

                fdInt.textContent = '+' + interest.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
                fdMat.textContent = mat.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

                let d = new Date();
                d.setMonth(d.getMonth() + mos);
                const opts = { year: 'numeric', month: 'short', day: 'numeric' };
                fdDat.textContent = 'Matures on ' + d.toLocaleDateString('en-IN', opts);
            };

            if (fdAmt) fdAmt.addEventListener('input', calcFd);
            if (fdDur) fdDur.addEventListener('input', calcFd);

            if (btnFd) {
                btnFd.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (btnFd.hasAttribute('disabled')) return;
                    btnFd.setAttribute('disabled', 'true');

                    let amt = parseFloat(fdAmt.value) || 0;
                    let mos = parseInt(fdDur.value) || 0;
                    if (amt < 500) { btnFd.removeAttribute('disabled'); return customAlert("Error", "Minimum amount is ₹500"); }
                    if (mos < 3) { btnFd.removeAttribute('disabled'); return customAlert("Error", "Minimum lock-in is 3 months"); }

                    fetch('/api/create_fd', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ account: accNo, amount: amt, tenure: mos })
                    }).then(r => r.json()).then(d => {
                        btnFd.removeAttribute('disabled');
                        customAlert(d.success ? "Success" : "Failed", d.result || d.message);
                        if (d.success) setTimeout(() => window.location.reload(), 2000);
                    });
                });
            }

            calcFd(); // Init calculation

            // Dynamically populate FDs
            const fdGrid = document.getElementById('fd-grid');
            const activeFdCount = document.getElementById('active-fd-count');
            if (fdGrid && activeFdCount) {
                fetch('/api/analytics/' + accNo)
                    .then(r => r.json()).then(d => {
                        const fdAmtStr = (d.fixed_deposit || '0').toString().replace(/,/g, '');
                        const fd = parseFloat(fdAmtStr);
                        if (fd > 0) {
                            activeFdCount.textContent = '1';
                            fdGrid.innerHTML = `
                            <div class="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col justify-between min-h-[240px]">
                                <div class="absolute top-5 right-5">
                                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        <span class="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Active
                                    </span>
                                </div>
                                <div class="mb-4">
                                    <p class="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">FD PORTFOLIO</p>
                                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white">${fd.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 })}</h3>
                                    <p class="text-sm text-slate-500">Principal Amount</p>
                                </div>
                                <div class="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Interest</p>
                                        <p class="text-sm font-semibold text-green-600 dark:text-green-400">8.5% p.a.</p>
                                    </div>
                                    <div>
                                        <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Maturity</p>
                                        <p class="text-sm font-medium text-slate-900 dark:text-white">In ${d.fd_tenure || '12'} Months</p>
                                    </div>
                                </div>
                                <button id="btn-withdraw-fd-dynamic" class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100/50 hover:bg-red-50 dark:bg-slate-800/50 dark:hover:bg-red-900/20 text-slate-700 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-sm font-medium transition-all group/btn">
                                    <span class="material-symbols-outlined text-[18px] group-hover/btn:scale-110 transition-transform">money_off</span>
                                    Withdraw Early
                                </button>
                            </div>
                        `;
                            const withdrawBtn = document.getElementById('btn-withdraw-fd-dynamic');
                            if (withdrawBtn) {
                                withdrawBtn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    if (!confirm("Are you sure you want to withdraw your FD early? Penalties may apply.")) return;
                                    fetch('/api/withdraw_fd', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ account: accNo })
                                    }).then(rs => rs.json()).then(d => {
                                        customAlert("FD Withdrawal", d.result || d.message);
                                        if (d.success) setTimeout(() => window.location.reload(), 2000);
                                    });
                                });
                            }
                        } else {
                            activeFdCount.textContent = '0';
                            fdGrid.innerHTML = `
                                <div class="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-5 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group min-h-[240px]" onclick="document.getElementById('fd-amount').focus()">
                                    <div class="size-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary transition-colors">
                                        <span class="material-symbols-outlined text-2xl">add</span>
                                    </div>
                                    <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Open a deposit</p>
                                </div>
                            `;
                        }
                    });
            }
        }
    }
});
