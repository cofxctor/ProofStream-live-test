export type Account = { id: string; balance: number };

export function balanceOf(account: Account): number {
  return account.balance;
}

export function transfer(from: Account, to: Account, amount: number): [Account, Account] {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`transfer amount must be positive, got ${amount}`);
  }
  if (from.balance < amount) {
    throw new Error(`overdraft blocked: ${from.id} holds ${from.balance}, ${amount} requested`);
  }
  return [
    { ...from, balance: from.balance - amount },
    { ...to, balance: to.balance + amount },
  ];
}
