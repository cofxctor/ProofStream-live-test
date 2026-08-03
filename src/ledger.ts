export type Account = { id: string; balance: number };

export function balanceOf(account: Account): number {
  return account.balance;
}
