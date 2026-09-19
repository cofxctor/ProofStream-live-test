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

export type StatementLine = { record: TransferRecord; balance: number };

/// One line per record involving the account, oldest first, each carrying the
/// balance the account held immediately after it. A transfer to yourself
/// nets to zero and still appears, because it happened.
export function statement(
  records: TransferRecord[],
  accountId: string,
  openingBalance: number,
): StatementLine[] {
  let balance = openingBalance;
  return history(records, accountId).map((record) => {
    if (record.to === accountId) balance += record.amount;
    if (record.from === accountId) balance -= record.amount;
    return { record, balance };
  });
}

export type AccountSummary = { sent: number; received: number; net: number; count: number };

/// What an account moved, over the records that involve it. `net` is what it
/// gained: received minus sent, so a payer's net is negative.
export function summary(records: TransferRecord[], accountId: string): AccountSummary {
  const mine = history(records, accountId);
  let sent = 0;
  let received = 0;
  for (const r of mine) {
    if (r.from === accountId) sent += r.amount;
    if (r.to === accountId) received += r.amount;
  }
  return { sent, received, net: received - sent, count: mine.length };
}

/// A statement as CSV: a header row, then one row per line. Values are written
/// as they are held, so nothing is rounded on the way out.
export function toCsv(lines: StatementLine[]): string {
  const rows = lines.map((l) =>
    [l.record.from, l.record.to, l.record.amount, l.record.timestamp, l.balance].join(','),
  );
  return ['from,to,amount,timestamp,balance', ...rows].join('\n');
}
