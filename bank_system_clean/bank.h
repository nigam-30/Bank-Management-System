#ifndef BANK_H
#define BANK_H

#include <string>
#include <unordered_map>
#include <vector>
using namespace std;

const int SYSTEM_ACCOUNT_NO = 999999;
const string SYSTEM_UPI_ID = "system@upi";

struct ChequeBook {
    int startCheque;
    int used;
};


struct DebitCard {
    string cardNumber;
    string nameOnCard;
    string expiry;
    int cvv;
    int pin;
};

struct Transaction {
    string type;
    double amount;
    Transaction* next;
};

struct Account {
    int accountNumber;
    string name;
    double balance;
    double loanAmount;
    double fixedDeposit;
    Transaction* history;

    // Cheque Book
    bool hasChequeBook;
    ChequeBook chequeBook;

    // Debit Card
    bool hasDebitCard;
    DebitCard card;

    // ✅ Credit Card
    bool hasCreditCard;
    string creditCardNumber;
    double creditCardLimit;
};

// Global variables
extern unordered_map<int, Account> accounts;
extern vector<int> sortedAccountNumbers;
extern unordered_map<string, int> upiMap;
extern int nextChequeStart;

// Existing declarations
void createSystemAccount();
void showTestInfo();
void createAccount();
void checkBalance();
void transferMoney();
void applyLoan();
void repayLoan();
void calculateFDMaturity();
void manageFD();
void withdrawFD();
void viewReport();
void createUPI();
void payUPI();
void debitPayment();

// ✅ Credit Card declarations
bool checkCreditCardEligibility(Account &acc);
void applyCreditCard(Account &acc);

// Additional declarations
bool binarySearch(int target);
void orderCheque();
void addTransaction(Account& acc, const string& type, double amount);
DebitCard generateDebitCard(const string& name);

#endif