# X 精选帖子知识库

以精选X帖子为主线，按主题和用户目标分类，帮助用户筛选有价值的方法。对其中适合操作的生图、视频或工作流帖子，扩展配方与复现入口。产品范围见 [产品方案.md](./产品方案.md)。

当前已实现可访问的前端与面向增长方法的离线评分器。「获客与变现」已人工整理3条真实历史复盘候选，提供原帖、已读存档、作者报告、编辑判断及限制；其余分类保留5条明确标注的虚构演示。作者业绩未独立核实，旧帖近期有效性待复核。尚未接入自动采集、生图API、账户或数据库。

**换电脑或新的Codex会话接手时，先读 [开发进度.md](./开发进度.md)。**

## 前端启动与验证

无第三方依赖，无需npm install。在本项目根目录运行：

```powershell
npm.cmd run dev
```

访问 **http://localhost:5173**，按Ctrl+C停止前台服务。也可运行 `node scripts/dev-server.mjs`。端口被占用时，在PowerShell中先设置 `$env:PORT = '5174'` 再启动。

可验证操作：

1. 打开 [获客与变现](http://localhost:5173/?topic=business)，查看3条历史复盘。详情中的X原帖、线程存档及作者补充文章在新标签页打开；原站读取受限时可查看已核对的公开存档。
2. 点击书签，再进入「我的收藏」；刷新页面检查收藏是否保留。记录仅保存在当前浏览器，不会跨设备同步。
3. 默认使用简洁卡片，也可切换阅读列表。真实条目显示「历史复盘」和「作者自述 · 待复核」，其他条目标为「虚构演示」。搜索「434」或作者名，或在「筛选」中仅显示真实历史复盘。
4. 「看复盘」展示编辑判断、作者报告的数据、原帖做法、不能得出的结论及适用条件；按Escape关闭详情。生图／工作流演示的「看配方」支持填写变量后复制，剪贴板不可用时回退手动复制。
5. 缩窄浏览器检查移动布局；暂无真实生成按钮或执行费用。

源码入口：[web/index.html](./web/index.html)、[web/app.js](./web/app.js)、[web/styles.css](./web/styles.css)、[web/data.js](./web/data.js)。预览服务仅暴露前端资源，不提供仓库文件访问。

来源记录见 [真实帖子初筛](./research/2026-10-20-获客与变现帖子初筛.md)。页面的原帖日期按北京时间显示，研究记录按UTC保存，二者可能相差一天。来源读取不等于业绩核实；这些候选没有被标为评分器的`approved`。

内容检查命令：`npm.cmd run test:content`（来源身份、日期、待复核状态、真实／演示边界及配方字段）。本次2组通过。HTTP、渲染与筛选逻辑已检查；当前没有可用自动化浏览器，移动端视觉、实际点击和剪贴板仍待浏览器验收。

## 现有增长评分器

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

亦可使用 `npm.cmd run test:scoring` 执行当前校准。尚未配置TypeScript静态编译检查。

## 保留的早期原型

`scorer.js`、`cli.js`、`examples.json`、`scorer.test.js` 是早期JavaScript原型。它使用不同输入结构和 `include / review / reject` 枚举，不能当作当前TypeScript接口。

```powershell
node --test scorer.test.js
node cli.js examples.json
```

`demo`与`score`脚本仍指向早期原型；`npm.cmd test`运行普通Node测试，不能替代显式的`test:scoring`校准。Windows PowerShell下可使用 `npm.cmd` 避免 `npm.ps1` 的执行策略问题。

## 跨电脑同步

Git跟踪源码、测试、校准资料和开发进度。首次私有仓库同步、每日pull/commit/push流程和接手提示见 [开发进度.md](./开发进度.md)。保留现有远程配置，不强推覆盖另一台电脑的工作。
