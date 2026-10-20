import { readFile } from 'node:fs/promises';
import { scorePost } from './scorer.js';

try {
  const file = process.argv[2];
  if (!file) throw new Error('用法：npm run score -- <投稿.json>');
  const input = JSON.parse(await readFile(file, 'utf8'));
  const result = Array.isArray(input) ? input.map(scorePost) : scorePost(input);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
}
