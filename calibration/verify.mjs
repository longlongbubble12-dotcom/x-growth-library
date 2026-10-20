// 运行：node --experimental-strip-types --test calibration/verify.mjs
// 真实存档标注与模拟边界样例分开；不发送网络请求、不写入业务数据。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scorePost } from '../lib/scoring.ts';

const dataset = JSON.parse(await readFile(new URL('./samples.json', import.meta.url), 'utf8'));
const baseline = JSON.parse(await readFile(new URL('./baseline.json', import.meta.url), 'utf8'));

// 完全虚构，只验证政策边界；不能算作真实 approved 样本。
const complete = {
  title: '模拟：SaaS激活邮件实验',
  contentText: '模拟：新注册用户分组实验，有周期、样本、步骤和适用前提。',
  hasDataProof: true,
  hasExecutionSteps: true,
  hasAudienceFit: true,
  hasCostExplanation: true,
  isSoftAd: false,
  isMerchantOrCourse: false,
  isViralStoryOnly: false,
  isHardToReproduce: false,
  isRecent: true,
};

test('10条真实存档的临时人工预期、旧版输出和新版输出可对照', () => {
  assert.equal(dataset.samples.length, 10);
  const rows = dataset.samples.map(sample => {
    const before = baseline.results.find(result => result.id === sample.id);
    assert.ok(before);
    const after = scorePost(sample.input);
    assert.equal(after.recommendation, sample.expectedRecommendation, sample.id);
    assert.equal(after.totalScore, before.totalScore, `${sample.id}: 此轮不调整维度权重`);
    assert.ok(after.reasons.length > 0);
    for (const field of ['coreMethod', 'proof', 'executionSteps', 'audience', 'confidence']) {
      assert.equal(typeof after.summary[field], 'string');
      assert.ok(after.summary[field].length > 0);
    }
    assert.ok(Array.isArray(after.summary.limitations));
    return { id: sample.id, score: after.totalScore, before: before.recommendation, after: after.recommendation };
  });
  console.table(rows);
});

test('模拟边界：成本缺失可以90分批准，但限制必须保留', () => {
  assert.equal(scorePost(complete).recommendation, 'approved');
  const result = scorePost({ ...complete, hasCostExplanation: false });
  assert.equal(result.totalScore, 90);
  assert.equal(result.recommendation, 'approved');
  assert.equal(result.summary.confidence, 'medium');
  assert.ok(result.summary.limitations.some(item => item.includes('成本未说明')));
});

test('模拟边界：高分广告、爆款故事或核心条件缺失不能通过', () => {
  for (const patch of [
    { isMerchantOrCourse: true }, { isViralStoryOnly: true },
    { hasExecutionSteps: false }, { hasAudienceFit: false },
  ]) {
    assert.equal(scorePost({ ...complete, ...patch }).recommendation, 'rejected');
  }
  for (const patch of [
    { hasDataProof: false }, { isSoftAd: true },
    { isHardToReproduce: true }, { isRecent: false },
  ]) {
    assert.equal(scorePost({ ...complete, ...patch }).recommendation, 'needs_review');
  }
});

test('运行时校验、空白正文解释和输入不可变性', () => {
  const snapshot = structuredClone(complete);
  scorePost(Object.freeze({ ...complete }));
  assert.deepEqual(complete, snapshot);
  for (const input of [null, [], {}, { ...complete, hasDataProof: 'false' }]) {
    assert.throws(() => scorePost(input), TypeError);
  }
  const result = scorePost({ ...complete, contentText: ' \n ' });
  assert.equal(result.totalScore, 0);
  assert.equal(result.recommendation, 'rejected');
  assert.ok(result.reasons.every(reason => !reason.includes('（+')));
});

test('512种布尔组合：分数有界、核心门槛不被绕过、三种输出均可达', () => {
  const fields = Object.keys(complete).filter(key => typeof complete[key] === 'boolean');
  const recommendations = new Set();
  for (let mask = 0; mask < 2 ** fields.length; mask++) {
    const input = { ...complete };
    fields.forEach((field, bit) => { input[field] = Boolean(mask & (1 << bit)); });
    const result = scorePost(input);
    assert.ok(Number.isInteger(result.totalScore) && result.totalScore >= 0 && result.totalScore <= 100);
    recommendations.add(result.recommendation);
    if (result.recommendation === 'approved') {
      assert.ok(input.hasDataProof && input.hasExecutionSteps && input.hasAudienceFit && input.isRecent);
      assert.ok(!input.isSoftAd && !input.isMerchantOrCourse && !input.isViralStoryOnly && !input.isHardToReproduce);
      assert.ok(result.totalScore >= 90);
    }
  }
  assert.deepEqual([...recommendations].sort(), ['approved', 'needs_review', 'rejected']);
});
