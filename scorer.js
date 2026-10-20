/** 确定性评分器：评估结构化投稿的完整性，不核实外部事实。 */
const present = value => typeof value === 'string' && value.trim().length > 0;
const list = value => Array.isArray(value) ? value.filter(present) : [];
const httpUrl = value => {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
};

export function scorePost(post) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) {
    throw new TypeError('每条投稿必须是 JSON 对象');
  }
  const evidence = post.evidence ?? {};
  const audience = post.audience ?? {};
  const steps = list(post.steps);
  const limitations = list(post.limitations);
  const hasMeasurement = present(evidence.metric) &&
    Number.isFinite(evidence.before) && Number.isFinite(evidence.after) &&
    present(evidence.period) && present(evidence.sample);
  const hasSource = present(evidence.sourceUrl) && httpUrl(evidence.sourceUrl);
  const hasAudience = present(audience.who) && present(audience.stage);
  const hasSteps = steps.length >= 2;

  const breakdown = {
    evidence: (hasSource ? 10 : 0) + (hasMeasurement ? 20 : 0) + (present(evidence.method) ? 10 : 0),
    actionability: (hasSteps ? 15 : 0) + (present(post.resources) ? 5 : 0) + (present(post.successMetric) ? 10 : 0),
    audience: (present(audience.who) ? 10 : 0) + (present(audience.stage) ? 5 : 0) + (present(audience.prerequisites) ? 5 : 0),
    boundaries: (limitations.length > 0 ? 5 : 0) + (present(post.attributionCaveat) ? 5 : 0)
  };
  const rejectionReasons = [];
  if (!present(post.title) || !present(post.content)) rejectionReasons.push('缺少标题或帖子原文');
  if (!hasSource || !hasMeasurement) rejectionReasons.push('缺少可追溯证据链接或完整效果数据（指标、前后值、周期、样本）');
  if (!hasSteps) rejectionReasons.push('缺少至少两个执行步骤');
  if (!hasAudience) rejectionReasons.push('未明确适用人群及所处阶段');
  const totalScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const recommendation = rejectionReasons.length ? 'reject' : totalScore >= 85 ? 'include' : 'review';
  const label = { reject: '自动拒绝', include: '建议收录', review: '人工复核' }[recommendation];
  const summary = `${label}（${totalScore}/100）。${hasAudience ? `适用于${audience.who}，阶段：${audience.stage}。` : ''}${rejectionReasons.length ? rejectionReasons.join('；') + '。' : `提供${steps.length}个执行步骤及${evidence.metric}的前后数据。${recommendation === 'review' ? '方法、资源或适用边界仍需补充。' : ''}`}证据尚未独立核实。`;
  return {
    id: post.id ?? null,
    totalScore,
    recommendation,
    summary,
    breakdown,
    rejectionReasons,
    evidenceStatus: 'unverified',
    rubricVersion: '1.0'
  };
}
