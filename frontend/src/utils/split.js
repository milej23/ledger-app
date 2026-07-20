// Splits `amount` into `n` shares that sum exactly to `amount`, working in
// integer cents so floating-point drift can't leave the total off by a cent.
export function splitEqually(amount, n) {
  if (n <= 0) return [];
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < remainder ? 1 : 0)) / 100);
}

// Net balance per person across all expenses: positive = overall owed to
// them, negative = they overall owe. A person's own share of an expense
// they paid for nets out automatically (they paid it, so they don't owe it).
export function computeBalances(people, expenses) {
  const net = {};
  people.forEach(p => { net[p.id] = 0; });

  expenses.forEach(exp => {
    if (!(exp.paidBy in net)) net[exp.paidBy] = 0;
    exp.shares.forEach(share => {
      if (share.personId === exp.paidBy) return;
      if (!(share.personId in net)) net[share.personId] = 0;
      net[exp.paidBy] += share.amount;
      net[share.personId] -= share.amount;
    });
  });

  return net;
}

// Turns net balances into concrete "X pays Y $Z" suggestions (Splitwise's
// "settle up" view), greedily matching the biggest debtor to the biggest
// creditor so the number of transfers stays minimal.
export function suggestSettlements(balances) {
  const creditors = [];
  const debtors = [];
  Object.entries(balances).forEach(([id, amt]) => {
    if (amt > 0.005) creditors.push({ id, amt });
    else if (amt < -0.005) debtors.push({ id, amt: -amt });
  });
  creditors.sort((a, b) => b.amt - a.amt);
  debtors.sort((a, b) => b.amt - a.amt);

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amt, creditors[j].amt);
    transfers.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].amt -= amount;
    creditors[j].amt -= amount;
    if (debtors[i].amt < 0.005) i++;
    if (creditors[j].amt < 0.005) j++;
  }
  return transfers;
}

// How much `personId` owes / is owed by every other person individually,
// derived from the same per-expense share data (used on a person's detail view).
export function computePairBalances(personId, expenses) {
  const pairs = {};
  expenses.forEach(exp => {
    exp.shares.forEach(share => {
      if (share.personId === exp.paidBy) return;
      if (exp.paidBy === personId && share.personId !== personId) {
        pairs[share.personId] = (pairs[share.personId] || 0) + share.amount;
      } else if (share.personId === personId && exp.paidBy !== personId) {
        pairs[exp.paidBy] = (pairs[exp.paidBy] || 0) - share.amount;
      }
    });
  });
  return pairs;
}
