import { defineConfig } from 'vitest/config';
import { readFileSync,existsSync } from 'node:fs';
if(existsSync('.env'))for(const line of readFileSync('.env','utf8').split(/\r?\n/)){const match=/^([A-Z_]+)=(.*)$/.exec(line);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.includes('test'))throw new Error('Set TEST_DATABASE_URL to a disposable PostgreSQL database with "test" in its name.');
process.env.DATABASE_URL=url;
process.env.JWT_SECRET='test-only-secret-at-least-thirty-two-characters';
export default defineConfig({test:{fileParallelism:false,testTimeout:20000,env:{NODE_ENV:'test'}}});
