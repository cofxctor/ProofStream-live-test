import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transfer, type Account } from './ledger';

const alice = (): Account => ({ id: 'alice', balance: 100 });
const bob = (): Account => ({ id: 'bob', balance: 10 });

test('moves value between accounts', () => {
  const [from, to] = transfer(alice(), bob(), 25);
  assert.equal(from.balance, 75);
  assert.equal(to.balance, 35);
});

test('rejects a non-positive amount', () => {
  assert.throws(() => transfer(alice(), bob(), 0), /positive/);
  assert.throws(() => transfer(alice(), bob(), -5), /positive/);
});

test('blocks an overdraft', () => {
  assert.throws(() => transfer(bob(), alice(), 500), /overdraft/);
});
