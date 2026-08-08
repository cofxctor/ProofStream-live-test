export type Account = { id: string; balance: number };

export type TransferRecord = {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
    /// Balances AFTER this transfer settled. Storing them makes any historical
  /// balance a lookup instead of a replay.
  fromBalance: number;
  toBalance: number;
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
    fromBalance: from.balance - amount,
    toBalance: to.balance + amount,
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

/// What this account held at `at`: the balance left by the most recent transfer
/// it was party to. Undefined when it had no activity yet — the caller still
/// holds the opening balance in that case, and this module never saw it.
export function balanceAt(
  records: TransferRecord[],
  accountId: string,
  at: number,
): number | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    if (r.timestamp > at) continue;
    if (r.from === accountId) return r.fromBalance;
    if (r.to === accountId) return r.toBalance;
  }
  return undefined;
}
