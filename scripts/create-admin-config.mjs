import { randomBytes } from 'node:crypto';
import { hashPassword,randomHex } from '../lib/password.ts';
// Send output only to a secure destination; never commit generated values.
const password=randomBytes(18).toString('base64url');
const salt=randomHex(16);
console.log(JSON.stringify({username:'admin',password,salt,hash:await hashPassword(password,salt)}));
