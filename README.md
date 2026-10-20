# X 真实增长方法精选知识库

面向独立开发者，筛选有证据、可执行、适用人群明确的增长方法。当前是离线评分器项目，尚无网站页面、真实API或数据库。

**换电脑或新的Codex会话接手时，先读 [开发进度.md](./开发进度.md)。**

## 当前实现

- 主实现：[lib/scoring.ts](./lib/scoring.ts)，导出纯函数 `scorePost` 和TypeScript类型。
- 输出：`totalScore`、`recommendation`、`reasons`、结构化 `summary`。
- 推荐结果：`approved` / `needs_review` / `rejected`。
- 90分及以上且核心条件完整可初筛通过；缺成本说明只扣分，硬拒绝不能被高分绕过。
- 标记由调用方提供；当前不自动提取原文或验证事实。

## 运行与测试

本次使用Node.js v22.23.3验证，无第三方依赖，无需npm install。在项目根目录运行：

```powershell
node --experimental-strip-types --test calibration/verify.mjs
```

预期5组通过，涵盖10条真实存档标注、模拟边界和512种布尔组合。详细限制见 [calibration/REPORT.md](./calibration/REPORT.md)。

当前没有 `npm run dev` 或网页预览地址；未配置TypeScript静态编译检查。

## 保留的早期原型

`scorer.js`、`cli.js`、`examples.json`、`scorer.test.js` 是早期JavaScript原型。它使用不同输入结构和 `include / review / reject` 枚举，不能当作当前TypeScript接口。

```powershell
node --test scorer.test.js
node cli.js examples.json
```

现有 `package.json` 的npm脚本仍指向早期原型；`npm.cmd test` 不能替代当前校准测试。Windows PowerShell下可使用 `npm.cmd` 避免 `npm.ps1` 的执行策略问题。

## 跨电脑同步

Git跟踪源码、测试、校准资料和开发进度。首次私有仓库同步、每日pull/commit/push流程和接手提示见 [开发进度.md](./开发进度.md)。保留现有远程配置，不强推覆盖另一台电脑的工作。
