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
/// Every record involving this account, in the order it happened. The log is
/// append-only, so the slice is already chronological — sorting it would only
/// hide a bug if that ever stopped being true.
export function history(records: TransferRecord[], accountId: string): TransferRecord[] {
  return records.filter((r) => r.from === accountId || r.to === accountId);
}
/// What this account held at `at`, replayed from its opening balance.
/// The log is append-only and already chronological, so one pass is enough —
/// nothing new to store and no index that can drift out of sync.
export function balanceAt(
  records: TransferRecord[],
  accountId: string,
  openingBalance: number,
  at: number,
): number {
  return records
    .filter((r) => r.timestamp <= at)
    .reduce((balance, r) => {
      if (r.from === accountId) return balance - r.amount;
      if (r.to === accountId) return balance + r.amount;
      return balance;
    }, openingBalance);
}
// having to do this multiple times is crazy
