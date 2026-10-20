import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scorePost } from './scorer.js';

const examples = JSON.parse(await readFile(new URL('./examples.json', import.meta.url), 'utf8'));
test('三个验收示例返回评分、推荐和摘要', () => {
  const results = examples.map(scorePost);
  assert.deepEqual(results.map(r => r.recommendation), ['include', 'review', 'reject']);
  assert.deepEqual(results.map(r => r.totalScore), [100, 75, 0]);
  for (const result of results) assert.ok(result.summary.length > 0);
});
test('高总分不能绕过证据、人群、步骤硬门槛', () => {
  for (const patch of [{ evidence: {} }, { audience: {} }, { steps: ['单一步骤'] }]) {
    assert.equal(scorePost({ ...examples[0], ...patch }).recommendation, 'reject');
  }
});
test('零值是有效观测值；字符串数值不是', () => {
  const post = structuredClone(examples[0]);
  post.evidence.before = 0;
  assert.equal(scorePost(post).recommendation, 'include');
  post.evidence.before = '0';
  assert.equal(scorePost(post).recommendation, 'reject');
});
test('无效输入和伪链接得到明确处理', () => {
  assert.throws(() => scorePost(null), TypeError);
  const post = structuredClone(examples[0]);
  post.evidence.sourceUrl = 'javascript:alert(1)';
  assert.equal(scorePost(post).recommendation, 'reject');
});
