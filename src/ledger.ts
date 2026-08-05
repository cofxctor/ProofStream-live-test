export type Account = { id: string; balance: number };

export type TransferRecord = {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
};

export function balanceOf(account: Account): number {
  return account.balance;
}

export function transfer(
  from: Account,
  to: Account,
  amount: number,
  log: TransferRecord[] = [],
): [Account, Account, TransferRecord[]] {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`transfer amount must be positive, got ${amount}`);
  }
  if (from.balance < amount) {
    throw new Error(`overdraft blocked: ${from.id} holds ${from.balance}, ${amount} requested`);
  }

  const record: TransferRecord = {
    from: from.id,
    to: to.id,
    amount,
    timestamp: Date.now(),
  };

  return [
    { ...from, balance: from.balance - amount },
    { ...to, balance: to.balance + amount },
    // Append-only: a new array every time, so an existing log is never mutated.
    [...log, record],
  ];
}
