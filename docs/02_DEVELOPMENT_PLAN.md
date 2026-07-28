# Supplier Risk Intelligence Platform Demo - 开发计划

## 1. 计划说明

本计划以 PRD 的 P0 范围为开发基线，目标是先完成可信、稳定、可复现的 MVP，再逐步加入真实 LLM、OCR、完整数据基础设施和 AWS 部署。

计划中的“天”指有效开发日，不对应固定日历日期。任何范围变化都应先更新 PRD，再调整本计划。

## 2. 交付策略

### 2.1 原则

1. Vertical Slice 优先：尽早打通输入、API、模型、检索和结果页面。
2. Evidence First：任何 RAG 输出必须先有证据，再有总结。
3. Offline First：训练、Embedding 和索引构建在离线 Pipeline 中完成。
4. Cost Safe：公共请求路径默认不依赖付费 LLM。
5. Demo Honest：明确标注合成数据与简化部署。
6. Observable by Design：从首个 API 开始使用 Correlation ID 和分阶段计时。

### 2.2 版本划分

| 版本               | 目标                                             |
| ------------------ | ------------------------------------------------ |
| V0 Skeleton        | 仓库、应用骨架、CI 和本地启动                    |
| V1 Vertical Slice  | 一个供应商案例端到端返回结果                     |
| V2 MVP             | 完整 P0 功能、测试、文档和部署                   |
| V3 Enhanced Demo   | LLM Provider、fallback、文本输入、Ollama Profile |
| V4 Production-like | OCR、PostgreSQL、Redis、Milvus Server、AWS IaC   |

## 3. 总体里程碑

| 里程碑                | 预计工期 | 主要交付物                            |
| --------------------- | -------: | ------------------------------------- |
| M0 文档与范围基线     |     1 天 | PRD、开发计划、技术架构、Walkthrough  |
| M1 仓库与工程骨架     |   1–2 天 | Monorepo、基础应用、CI、Docker        |
| M2 数据与模型         |   2–3 天 | 合成数据、XGBoost、评估、解释         |
| M3 RAG 检索           |   2–3 天 | 文档语料、索引、Hybrid Ranking、评估  |
| M4 API Vertical Slice |     2 天 | Fastify、Python Risk Engine、统一响应 |
| M5 Demo UI            |   2–3 天 | Astro 页面、表单、结果和证据          |
| M6 质量与安全         |     2 天 | 测试、限流、错误处理、可访问性        |
| M7 GitHub 与上线      |   1–2 天 | README、CI/CD、公开 Demo              |
| M8 Portfolio          |   1–2 天 | Astro Portfolio、Case Study、域名接入 |

预计 MVP 总工期为 14–18 个有效开发日。

## 4. 详细工作分解

## Phase 0 - 文档与范围基线

### 工作项

- [x] 阅读 SRM 深挖文档。
- [x] 阅读简历中的 SRM 项目描述。
- [x] 评估 Demo、GitHub、Portfolio 和在线部署的可行性。
- [x] 创建 PRD。
- [x] 创建开发计划。
- [x] 创建技术架构文档。
- [x] 创建 Walkthrough 日志。

### 完成条件

- 四份文档相互引用的范围、术语和技术选择一致。
- MVP 与生产系统的边界清楚。
- 未决事项有默认选择，不阻塞开发。

## Phase 1 - 仓库与工程骨架

### 工作项

- [x] 初始化 Git 仓库和 `.gitignore`。
- [x] 建立 pnpm workspace 或等价 Monorepo。
- [x] 创建 `apps/web` Astro 应用。
- [x] 创建 `apps/api` Fastify TypeScript 应用。
- [x] 创建 `services/risk-engine` Python FastAPI 应用。
- [x] 创建共享 API Schema。
- [x] 配置 TypeScript、ESLint、Prettier、Python Ruff 和 Pytest。
- [x] 增加健康检查、版本端点和基础 Correlation ID。
- [x] 配置 Dockerfile 和 Docker Compose。
- [x] 配置 GitHub Actions 基础 CI。

### 验收

- 一个命令安装依赖。
- 一个命令启动开发环境。
- Web、API、Risk Engine 健康检查均正常。
- CI 能执行 lint、typecheck、test 和 build。

## Phase 2 - 合成数据与 XGBoost

### 工作项

- [x] 定义供应商事件和特征数据字典。
- [x] 编写固定随机种子的合成数据生成器。
- [x] 生成带时间字段、噪声和约 2% 高风险标签的数据集。
- [x] 实现时间切分训练和测试。
- [x] 在训练 Fold 内处理类别不平衡。
- [x] 训练 XGBoost 并选择业务阈值。
- [x] 计算 Recall、Precision、PR-AUC 和 Confusion Matrix。
- [x] 实现 SHAP 兼容的 XGBoost 特征贡献输出。
- [x] 保存模型、特征 Schema、版本和评估 Metadata。
- [x] 增加训练数据和模型封装测试。

### 验收

- 训练 Pipeline 可重复运行。
- 测试集严格晚于训练集。
- API 推理使用固定特征顺序和 Schema。
- 指标报告不把 Accuracy 作为主结论。

## Phase 3 - 文档 Ingestion 与 RAG

### 工作项

- [x] 创建虚构供应商和示例文档集。
- [x] 定义文档 Metadata Schema。
- [x] 实现结构化文本提取、Metadata 校验和规则清理。
- [x] 实现文件 Hash 完全去重。
- [x] 实现候选分组后的近重复检测。
- [x] 实现按文档 Section 的语义分块。
- [x] 集成本地 TF-IDF + LSA 稠密 Embedding。
- [x] 实现 L2 normalization。
- [x] 构建兼容的版本化只读向量索引。
- [x] 实现 BM25、Domain Anchor Boost、Source Quality 和 Temporal Decay。
- [x] 创建人工标注查询集。
- [x] 计算 Recall@5、MRR 和检索延迟。

### 验收

- 每个预置问题至少有一条人工标注证据。
- 返回证据携带完整 Citation Metadata。
- 无相关证据时达到拒答条件。
- 检索评估可通过命令重复运行。

## Phase 4 - API 与风险编排

### 工作项

- [x] 定义 `POST /v1/evaluations` 请求和响应。
- [x] Fastify 实现输入校验、限流和错误映射。
- [x] Fastify 调用 Python Risk Engine。
- [x] Python 服务并行执行模型推理和检索。
- [x] 实现结构化风险与文档风险融合。
- [x] 实现 Evidence-bound Deterministic Summary。
- [x] 实现 Schema 和 Citation Validation。
- [x] 返回阶段级 Telemetry。
- [x] 增加稳定 Request ID 和 Correlation ID。
- [x] 生成 OpenAPI 文档和 Swagger UI。

### 验收

- 三个预置案例都通过端到端测试。
- 输入错误返回一致的 4xx Schema。
- 内部失败不会向客户端暴露堆栈。
- 每条引用均能在当前响应的 Evidence 中解析。

## Phase 5 - Astro Demo UI

### 工作项

- [x] 建立设计 Token 和响应式 Layout。
- [x] 实现场景选择器。
- [x] 实现结构化指标表单。
- [x] 实现风险问题输入。
- [x] 实现结果 Summary 和 Risk Gauge。
- [x] 实现特征贡献图。
- [x] 实现 Evidence Cards 和 Citation Drawer。
- [x] 实现 Latency Trace 和技术详情折叠面板。
- [x] 实现 Loading、Empty、Validation 和 Error 状态。
- [x] 实现 Architecture 和 Evaluation 页面。
- [x] 增加可访问性检查。

### 验收

- 用户从进入页面到完成一次示例不超过三次主要点击。
- 风险等级同时使用文本、图标和颜色。
- 手机和桌面布局均无溢出或遮挡。
- API 失败时提供明确的恢复操作。

## Phase 6 - 可靠性、安全与测试

### 工作项

- [x] 配置请求限流和 Payload 限制。
- [x] 配置 CORS allowlist。
- [x] 配置 API 和内部服务超时。
- [x] 对日志字段做敏感信息过滤。
- [x] 增加单元、契约、集成和端到端测试。
- [x] 增加错误注入测试。
- [x] 运行性能基线测试。
- [x] 检查依赖漏洞和 Secret。
- [x] 编写隐私和安全说明。

### 验收

- 关键路径自动化测试全部通过。
- 非法输入、超时、无证据和内部错误均有覆盖。
- Demo 指标有可重复的测试方法。
- 公共配置中不存在 Secret。

## Phase 7 - GitHub 展示与部署

### 工作项

- [x] 编写顶级 README。
- [x] 加入架构图、截图和 Demo GIF。
- [x] 编写 Quick Start 和 Troubleshooting。
- [x] 编写 Evaluation、Security 和 Limitations 文档。
- [x] 创建公开 GitHub 仓库。
- [x] 配置分支保护和 CI 状态检查。
- [x] 部署 API 和 Risk Engine。
- [x] 部署 Astro Demo。
- [x] 配置域名、HTTPS 和环境变量。
- [ ] 设置用量告警和消费上限。
- [x] 执行生产 Smoke Test。

### 验收

- 匿名用户可通过 HTTPS 运行示例。
- GitHub 新访客可在 15 分钟内本地启动。
- 线上版本与仓库主分支对应。
- README 显示 Build、Test 和 Demo 状态。

## Phase 8 - Portfolio

### 工作项

- [x] 基于 Astro 静态模式创建独立站点。
- [x] 建立独立视觉风格和真实内容。
- [x] 添加 Home、Projects、About 和 Resume。
- [x] 编写 SRM Case Study。
- [x] 连接 Live Demo、GitHub 和 HTML Resume；用户确认 PDF 保持私有并通过邮件索取。
- [x] 配置 SEO、Open Graph、Sitemap 和可选 Analytics。
- [ ] 通过 GitHub Pages 部署；Workflow 已完成，等待合并后首次运行。
- [ ] 配置自定义域名和 HTTPS。

### 验收

- 首页第一屏能说明候选人定位和主要项目。
- SRM 项目有代码、在线 Demo 和架构说明入口。
- 页面在桌面和手机上均通过视觉检查。
- Portfolio 不依赖后端即可访问。

## 5. 测试计划

| 层级                 | 重点                                                   |
| -------------------- | ------------------------------------------------------ |
| Unit                 | 特征转换、阈值、排名公式、时间衰减、Citation Validator |
| Contract             | Fastify 与 Python 服务的请求响应 Schema                |
| Integration          | 模型、索引和 API 的组合行为                            |
| Retrieval Regression | 标注查询集的 Recall@5 和 MRR 不回退                    |
| End-to-End           | 三个示例从 UI 到结果完整运行                           |
| Performance          | 推理、检索和完整评估的 P50/P95/P99                     |
| Security             | Payload、限流、CORS、错误泄漏、Secret Scan             |
| Visual               | 桌面、平板、手机、明暗模式和图表可读性                 |

## 6. Definition of Done

每个功能只有在以下条件满足后才可标记完成：

- 实现符合 PRD 和技术架构。
- 包含正常、边界和错误路径测试。
- 类型检查、Lint 和测试通过。
- 对外接口有 Schema 或文档。
- 不引入未记录的 Secret 或外部依赖。
- 用户可见变化已进行桌面和移动端检查。
- Walkthrough 已记录实现、验证结果和剩余问题。
- 如改变了架构或范围，对应文档已同步更新。

## 7. 依赖与阻塞项

### 开发阶段不阻塞

- GitHub 账户授权。
- 域名购买。
- Railway/Render/AWS 账户。
- OpenAI/DeepSeek API Key。

这些内容可在本地开发完成后处理。

### 上线前需要

- GitHub 仓库创建或推送授权。
- 托管平台账户和支付/消费上限配置。
- 最终域名选择。
- 若启用真实 LLM，需要 Provider Secret 和预算。

## 8. 风险控制

- 任何 P1/P2 功能不得阻塞 P0 交付。
- 若多服务部署成本或复杂度过高，公共版本可合并部署，但保留清晰模块边界。
- 若 Embedding 模型超过托管内存，改用预计算 Embedding，不在请求路径加载大模型。
- 若真实 LLM 不稳定，公共 Demo 自动使用确定性 Evidence Summary。
- 若 OCR 存在资源或安全风险，保持为本地可选 Profile。

## 9. 进度报告机制

开发过程中持续维护 `04_DEVELOPMENT_WALKTHROUGH.md`：

- 每个有意义的开发批次写一条记录。
- 记录目标、修改、决策、验证、问题和下一步。
- 不将计划项直接写成已完成项。
- 关键测试必须记录实际命令和结果摘要。
- 架构或范围变化必须链接回对应文档章节。
