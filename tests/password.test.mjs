import test from 'node:test';
import assert from 'node:assert/strict';
import {hashPassword,equalHash,randomHex,safeReturnTo} from '../lib/password.ts';
test('password verification rejects wrong passwords and binds each hash to its salt',async()=>{
  const salt=randomHex(16),hash=await hashPassword('test-password-long',salt);
  assert.ok(equalHash(hash,await hashPassword('test-password-long',salt)));
  assert.ok(!equalHash(hash,await hashPassword('wrong-password-long',salt)));
  assert.ok(!equalHash(hash,await hashPassword('test-password-long',randomHex(16))));
  assert.ok(!equalHash(hash,hash+'0'));
});
test('return paths stay on the website and avoid auth/API loops',()=>{
  for(const value of ['https://evil.example','//evil.example','/\\evil.example','/\n/evil.example','/login?next=/','/api/auth/logout'])assert.equal(safeReturnTo(value),'/admin');
  assert.equal(safeReturnTo('/article/one?lang=en'),'/article/one?lang=en');
  assert.equal(safeReturnTo('/'),'/');
});
