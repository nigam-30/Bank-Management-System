#include "bank.h"
#include <unordered_map>
#include <vector>

// ✅ Define global containers
std::unordered_map<int, Account> accounts;
std::vector<int> sortedAccountNumbers;
std::unordered_map<std::string, int> upiMap;

// Additional globals
int nextChequeStart = 100000;