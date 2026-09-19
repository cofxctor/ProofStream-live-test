import assert from 'node:assert/strict';
import { test } from 'node:test';
import { history, statement, summary, transfer, type Account, type TransferRecord } from './ledger';

const alice = (): Account => ({ id: 'alice', balance: 100 });
const bob = (): Account => ({ id: 'bob', balance: 10 });
const carol = (): Account => ({ id: 'carol', balance: 50 });

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

test('records every successful transfer', () => {
  const [, , log] = transfer(alice(), bob(), 25);
  assert.equal(log.length, 1);
  assert.equal(log[0].from, 'alice');
  assert.equal(log[0].to, 'bob');
  assert.equal(log[0].amount, 25);
  assert.equal(typeof log[0].timestamp, 'number');
});

test('appends without mutating the existing log', () => {
  const first: TransferRecord[] = [];
  const [, , afterOne] = transfer(alice(), bob(), 25, first);
  const [, , afterTwo] = transfer(alice(), carol(), 10, afterOne);

  assert.equal(first.length, 0, 'the original log is untouched');
  assert.equal(afterOne.length, 1);
  assert.equal(afterTwo.length, 2);
});

test('a blocked transfer records nothing', () => {
  const log: TransferRecord[] = [];
  assert.throws(() => transfer(bob(), alice(), 500, log));
  assert.equal(log.length, 0);
});

test('history returns only the records involving an account', () => {
  let log: TransferRecord[] = [];
  [, , log] = transfer(alice(), bob(), 25, log);
  [, , log] = transfer(alice(), carol(), 10, log);
  [, , log] = transfer(carol(), bob(), 5, log);

  const bobs = history(log, 'bob');
  assert.equal(bobs.length, 2, 'bob received twice and sent none');
  assert.ok(bobs.every((r) => r.from === 'bob' || r.to === 'bob'));

  assert.equal(history(log, 'alice').length, 2);
  assert.equal(history(log, 'nobody').length, 0);
});

test('statement carries the running balance after every record', () => {
  let log: TransferRecord[] = [];
  [, , log] = transfer(alice(), bob(), 25, log);
  [, , log] = transfer(carol(), alice(), 10, log);
  const lines = statement(log, 'alice', 100);
  assert.deepEqual(lines.map((l) => l.balance), [75, 85]);
});

test('an account with no records has an empty statement', () => {
  assert.deepEqual(statement([], 'nobody', 0), []);
});

test('a transfer to yourself nets to zero and still appears', () => {
  const [, , log] = transfer(alice(), alice(), 5);
  const lines = statement(log, 'alice', 100);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].balance, 100);
});

test('summary totals what an account sent and received', () => {
  let log: TransferRecord[] = [];
  [, , log] = transfer(alice(), bob(), 25, log);
  [, , log] = transfer(carol(), alice(), 10, log);
  assert.deepEqual(summary(log, 'alice'), { sent: 25, received: 10, net: -15, count: 2 });
});

test('an account with no records summarises to zero', () => {
  assert.deepEqual(summary([], 'nobody'), { sent: 0, received: 0, net: 0, count: 0 });
});

test('a transfer to yourself counts both ways and nets to zero', () => {
  const [, , log] = transfer(alice(), alice(), 5);
  assert.deepEqual(summary(log, 'alice'), { sent: 5, received: 5, net: 0, count: 1 });
});
