/**
 * X 增长帖子规则评分器。纯函数，无网络、数据库或第三方依赖。
 * 布尔字段由调用方提供；评分不等于证据已核实，也不自动理解原文。
 */
export interface ScoringInput {
  title: string;
  contentText: string;
  /** 有与方法对应的结果，且有周期、样本或前后对比等评估上下文；单个收入数字不够。 */
  hasDataProof: boolean;
  hasExecutionSteps: boolean;
  /** 明确方法适用的使用场景和前提，不能仅凭“所有创业者”判定。 */
  hasAudienceFit: boolean;
  /** 说明执行所需时间、资金或资源；产品售价不等于执行成本。 */
  hasCostExplanation: boolean;
  /** 实用内容夹带自有产品、赞助或引流推广；进入复核，不直接拒绝。 */
  isSoftAd: boolean;
  /** 帖子以商业推广或售课为主要目的；不按作者身份或“课程”关键词判断。 */
  isMerchantOrCourse: boolean;
  isViralStoryOnly: boolean;
  isHardToReproduce: boolean;
  /** 由调用方根据发布时间和方法有效期判断；抓取日期不等于发布时间，未知填false。 */
  isRecent: boolean;
}

export type Recommendation = 'approved' | 'needs_review' | 'rejected';
export type Confidence = 'low' | 'medium' | 'high';

export interface ScoringSummary {
  /** 当前用标题概括；不声称已从原文提取方法。 */
  coreMethod: string;
  proof: string;
  executionSteps: string;
  audience: string;
  limitations: string[];
  /** 输入信息的完整程度，不是事实真实性或增长效果的概率。 */
  confidence: Confidence;
}

export interface ScoringResult {
  totalScore: number;
  recommendation: Recommendation;
  reasons: string[];
  summary: ScoringSummary;
}

const BOOLEAN_FIELDS = [
  'hasDataProof', 'hasExecutionSteps', 'hasAudienceFit',
  'hasCostExplanation', 'isSoftAd', 'isMerchantOrCourse',
  'isViralStoryOnly', 'isHardToReproduce', 'isRecent',
] as const satisfies readonly (keyof ScoringInput)[];

const APPROVAL_THRESHOLD = 90;
const REJECTION_THRESHOLD = 50;

function validateInput(input: ScoringInput): void {
  // 同时保护来自 JSON、JavaScript 或未来 AI 输出的运行时输入。
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('评分输入必须是对象');
  }
  if (typeof input.title !== 'string' || typeof input.contentText !== 'string') {
    throw new TypeError('title 和 contentText 必须是字符串');
  }
  for (const field of BOOLEAN_FIELDS) {
    if (typeof input[field] !== 'boolean') {
      throw new TypeError(`${field} 必须是布尔值`);
    }
  }
}

/**
 * 分值：证据25、执行25、人群15、成本10、可复现风险10、非推广10、时效5。
 * 硬拒绝优先；其余低于50拒绝，90及以上且通过复核条件才批准。
 * 无证据、软广、难复现、时效未知均需复核，不能仅靠总分批准。
 * 成本不明只扣10分并提示限制：其他条件全部满足时90分可初筛通过。
 * 缺失字段/错误类型抛 TypeError；空白标题或正文作为低质量投稿拒绝。
 */
export function scorePost(input: ScoringInput): ScoringResult {
  validateInput(input);
  const reasons: string[] = [];
  const limitations: string[] = ['依据输入标记评分，未独立核实原文、数据或因果关系'];
  let totalScore = 0;

  const dimensions: ReadonlyArray<readonly [boolean, number, string, string]> = [
    [input.hasDataProof, 25, '证据：有数据证明标记（+25）', '证据：未提供数据证明（+0）'],
    [input.hasExecutionSteps, 25, '执行性：有操作步骤（+25）', '执行性：缺少操作步骤（+0）'],
    [input.hasAudienceFit, 15, '适用人群：明确（+15）', '适用人群：不明确（+0）'],
    [input.hasCostExplanation, 10, '成本门槛：有说明（+10）', '成本门槛：缺少说明（+0）'],
    [!input.isHardToReproduce, 10, '风险：未标记为难复现（+10）', '风险：难以复现（+0）'],
    [!input.isSoftAd && !input.isMerchantOrCourse, 10, '推广：未标记为软广或卖课推广（+10）', '推广：存在软广或商业推广标记（+0）'],
    [input.isRecent, 5, '时效性：近期有效（+5）', '时效性：需重新确认（+0）'],
  ];
  for (const [passed, points, positive, negative] of dimensions) {
    if (passed) totalScore += points;
    reasons.push(passed ? positive : negative);
  }

  const rejectionReasons: string[] = [];
  const emptyContent = !input.title.trim() || !input.contentText.trim();
  if (emptyContent) {
    totalScore = 0;
    // 归零后移除维度加分描述，避免“总分0、各项仍加满分”的矛盾解释。
    reasons.length = 0;
    rejectionReasons.push('标题或正文为空，总分归零');
  }
  if (input.isMerchantOrCourse) rejectionReasons.push('属于商家或卖课推广');
  if (input.isViralStoryOnly) rejectionReasons.push('只有爆款故事，缺少可迁移的方法');
  if (!input.hasExecutionSteps) rejectionReasons.push('缺少可执行步骤');
  if (!input.hasAudienceFit) rejectionReasons.push('未明确适用人群');

  if (!input.hasDataProof) limitations.push('缺少数据证据，需要补充来源、样本及对照');
  if (!input.hasExecutionSteps) limitations.push('缺少可执行步骤');
  if (!input.hasAudienceFit) limitations.push('适用人群不明确');
  if (!input.hasCostExplanation) limitations.push('时间、资金或工具成本未说明');
  if (input.isSoftAd) limitations.push('存在软广，需核实利益关系及推荐偏差');
  if (input.isMerchantOrCourse) limitations.push('存在商业推广或卖课倾向');
  if (input.isViralStoryOnly) limitations.push('爆款个案可能存在幸存者偏差');
  if (input.isHardToReproduce) limitations.push('方法难以复现，可能依赖特殊资源或背景');
  if (!input.isRecent) limitations.push('时效性未确认，需核实平台规则和方法有效期');
  if (emptyContent) limitations.push('标题或正文为空，无法形成有效摘要');

  const needsReview = !input.hasDataProof ||
    input.isSoftAd || input.isHardToReproduce || !input.isRecent;
  let recommendation: Recommendation;
  if (rejectionReasons.length > 0 || totalScore < REJECTION_THRESHOLD) {
    recommendation = 'rejected';
    reasons.push(...rejectionReasons.map(reason => `自动拒绝：${reason}`));
    if (totalScore < REJECTION_THRESHOLD) reasons.push(`自动拒绝：总分低于${REJECTION_THRESHOLD}`);
  } else if (totalScore >= APPROVAL_THRESHOLD && !needsReview) {
    recommendation = 'approved';
    reasons.push(`通过：达到${APPROVAL_THRESHOLD}分且核心条件完整；仅代表规则初筛通过`);
  } else {
    recommendation = 'needs_review';
    reasons.push('待复核：请根据 summary.limitations 补充或核实信息');
  }

  const completeness = [input.hasDataProof, input.hasExecutionSteps,
    input.hasAudienceFit, input.hasCostExplanation].filter(Boolean).length;
  const confidence: Confidence = emptyContent || completeness <= 1 ? 'low'
    : completeness === 4 ? 'high' : 'medium';

  return {
    totalScore,
    recommendation,
    reasons,
    summary: {
      coreMethod: input.title.trim() || '未提供方法标题',
      proof: input.hasDataProof ? '标记为有数据证明；具体数据和来源尚未提取或核实' : '未提供数据证明',
      executionSteps: input.hasExecutionSteps ? '标记为有执行步骤；具体步骤尚未从原文提取' : '未提供可执行步骤',
      audience: input.hasAudienceFit ? '标记为适用人群明确；具体人群尚未从原文提取' : '适用人群不明确',
      limitations,
      confidence,
    },
  };
}
