# Supplier Risk Intelligence Platform Demo - Development Walkthrough

## 1. 文档目的

本文件持续记录项目从需求到上线的实际开发过程。它不是待办列表的复制，而是可审计的工程日志，用于回答：

- 本轮开发要解决什么问题？
- 实际修改了什么？
- 为什么做这些决策？
- 如何验证结果？
- 遇到了哪些问题？
- 下一步是什么？

该记录将作为 GitHub 技术展示的一部分，帮助技术面试官理解项目的演进过程和工程判断。

## 2. 更新规则

1. 每个有意义的开发批次增加一条记录。
2. 最新记录放在最上方，保留历史记录。
3. 只记录实际完成的修改，不把计划描述成结果。
4. 测试必须记录实际执行的命令和结果摘要。
5. 失败和回退也要记录，避免形成虚假的“完美开发史”。
6. 范围或架构变化必须同步更新 PRD、开发计划或架构文档。
7. 不在日志中记录 Secret、Token、个人敏感信息或未经授权的数据。

## 3. 当前项目状态

| 项目       | 状态                     |
| ---------- | ------------------------ |
| 当前阶段   | M6 质量与安全已完成      |
| 当前版本   | 0.6.0                    |
| Git 仓库   | 已初始化，分支为 main    |
| 应用代码   | 三服务工程骨架已创建     |
| 本地运行   | Native 与 Compose 已验证 |
| 在线环境   | 尚未创建                 |
| 下一里程碑 | M7 - GitHub 与上线       |

## 4. 里程碑状态

| 里程碑                | 状态        | 说明                                     |
| --------------------- | ----------- | ---------------------------------------- |
| M0 文档与范围基线     | Complete    | 四份基线文档已创建并完成交叉核对         |
| M1 仓库与工程骨架     | Complete    | Web → API → Risk Engine 已验证           |
| M2 数据与模型         | Complete    | 合成数据、XGBoost、解释与 API 已验证     |
| M3 RAG 检索           | Complete    | 虚构语料、混合检索、引用与评估已验证     |
| M4 API Vertical Slice | Complete    | 风险融合、契约 API、追踪与 E2E 已验证    |
| M5 Demo UI            | Complete    | 交互、可视化、状态、响应式与 a11y 已验证 |
| M6 质量与安全         | Complete    | 边界加固、故障测试、审计与性能基线已验证 |
| M7 GitHub 与上线      | Not Started | —                                        |
| M8 Portfolio          | Not Started | —                                        |

---

## 5. Walkthrough 记录

## 2026-07-28 - M6 Reliability, Security and Test Hardening

### 目标

将公开 Demo 从“功能可运行”提升为“边界可验证”：限制资源消耗，分类依赖故障，避免敏感数据进入日志与仓库，消除已知高风险依赖漏洞，并建立可重复的性能与故障回归方法。

### 完成内容

- 将 CORS 改为逗号分隔的显式 origin allowlist，只允许 GET、POST、OPTIONS 及必要请求头。
- 将 64 KiB Payload、30 次/分钟限流、3 秒 API timeout、2 秒 Risk Engine deadline 和限流窗口全部改为有界启动配置；非法值使服务启动失败。
- 使用 `AbortController` 中止超时的内部 HTTP 等待，并将 timeout、unavailable 和 non-success response 分别映射为安全的 504、503 和 502。
- 增加 Helmet 标准安全响应头；明确关闭会破坏 Swagger UI 的默认 CSP，并保留其他 Header。
- 配置 Pino 对 Authorization、Cookie、X-API-Key 和 Set-Cookie Header 脱敏；请求体与完整问题不进入访问日志。
- 将畸形 JSON、超大 Payload、限流、字段校验和内部错误统一为无堆栈结构化响应。
- API 容器使用 UID 1000，Risk Engine 使用专用 UID 10001；两者启用只读 root filesystem、临时 `/tmp`、`cap_drop: ALL` 与 `no-new-privileges`。
- 新增 API 配置测试、真实 Abort timeout 测试、CORS、Helmet、Payload、限流及 502/503/504 故障注入测试。
- 新增仓库 Secret Scanner，检查敏感文件名、私钥和常见云 Provider Token；扫描包含已跟踪及未忽略的新文件。
- 将 `pnpm audit`、`pip-audit` 和 Secret Scanner 接入 CI。
- 新增公开 Security and Privacy 文档与 Web Privacy 页面，说明数据生命周期、已实现控制、威胁和限制。
- 新增顺序 Docker 性能基线脚本、单元测试和原始 JSON 报告。

### 安全审计

- 初次 Node 审计发现 5 个 High：Astro 两项、sharp、`@fastify/static` 和 brace-expansion。
- 升级 Astro 与 Swagger UI，并使用 pnpm 生成的精确 overrides 固定已修复传递依赖；复查结果为 `No known vulnerabilities found`。
- 初次 Python 审计发现 pip 与 pytest 共 7 条已知漏洞；升级到 pip 26.1.2 和 pytest 9.1.1 后，复查为 `No known vulnerabilities found`。
- `python -m pipelines.security_audit`：最终扫描 83 个仓库文件，0 findings。
- Secret Scanner 自身 2 项测试通过，覆盖高置信凭据命中与 `.env.example` 占位符放行。

### 性能基线

环境为本地 Docker Desktop、单用户、顺序请求。3 次 warmup 后，三个场景各执行 6 次，共 18 次测量：

| 指标                  |      P50 |      P95 | PRD 阈值 |
| --------------------- | -------: | -------: | -------: |
| Client-observed total | 15.83 ms | 34.08 ms |  1500 ms |
| API-reported total    |  9.20 ms | 11.99 ms |        — |
| Model inference       |        — |  6.44 ms |    50 ms |
| Retrieval             |        — |  2.10 ms |   200 ms |
| Fusion                |        — |  0.06 ms |        — |

全部阈值通过。该基线用于固定本地环境的回归，不表示并发容量、互联网延迟或生产 SLO。原始结果位于 `reports/m6-performance-baseline.json`。

### 验证

- Vitest：3 个文件、16 项测试通过，包含 5 个真实客户端与依赖故障类别相关测试。
- Pytest 使用 pytest 9.1.1 运行，新增性能百分位与 Secret Scanner 测试。
- `pnpm verify`：产物校验、Prettier、ESLint、Ruff、Typecheck、全部测试与五页面 Build 全部通过。
- 容器运行身份：API UID 1000、Risk Engine UID 10001；对应用目录的写入探针均返回 `read-only-ok`。
- Docker Compose：Risk Engine 与 API healthy，Web 正常运行。
- Chrome 浏览器回归：High、Medium、Low、MODEL_ONLY、Validation、503 recovery、Citation 和 Privacy 路由通过。
- axe-core：桌面空态、桌面结果态、手机结果态的 WCAG 2 A/AA 自动扫描均为 0 violation。

### 技术决策

1. **配置必须有界且 fail-fast。** 公开环境可以覆盖限流和 timeout，但不能通过负值、无限值或非法 origin 意外关闭保护。
2. **依赖失败不伪装为内部 500。** 502 表示依赖响应错误，503 表示不可达，504 表示 deadline，使客户端恢复策略和日志排障更明确。
3. **CSP 暂不在 Fastify Swagger UI 强制。** Helmet 其他 Header 已启用；Swagger UI 需要内联脚本，后续可使用独立文档域或 nonce CSP，而不是部署一个不可用的文档页。
4. **Public Profile 不声明分布式限流。** 当前 limiter 为进程内实现；多实例托管必须切换 Redis store。
5. **安全扫描是门槛而不是证明。** 结果只能说明当前规则和漏洞数据库无发现，不能证明系统绝对安全。
6. **性能采用小型单用户回归。** 在限流为 30 次/分钟的公开默认配置下使用 18 次测量，避免为了跑分修改生产形态参数。

### 遇到的问题

- `pnpm audit --fix` 在 pnpm 11 需要显式模式，首次使用布尔参数被拒绝；改用 `--fix=override` 后生成精确修复版本。
- 安全升级改变虚拟依赖图后，非 TTY 的 pnpm 拒绝清理 `node_modules`；使用 `CI=true` 与 frozen lockfile 重建后恢复可重复状态。
- 全栈镜像构建超过工具的单次 60 秒窗口，但镜像与后端容器实际已完成；检查 Compose 状态后启动剩余 Web 服务，没有重复或破坏其他项目容器。
- 初次 Python 审计同时扫描工具链自身的旧 pip；将 CI 和本地 pip 升级到已修复版本，而不是忽略工具链漏洞。

### 未完成事项

- 当前限流不跨实例共享，也没有 WAF、托管 DDoS 防护或集中式 SIEM。
- Deadline 会停止 API 等待，但不能强制终止 Python 进程内已经运行的 CPU 任务。
- 本地浏览器命令仍提示宿主 Node 22 低于项目声明的 Node 24；Docker 与 CI 使用 Node 24，M7 发布说明需要明确本地前置条件。
- GitHub 远程仓库、公开 HTTPS 托管、生产 CORS origin 和用量告警属于 M7。

### 下一步

进入 M7：准备公开 GitHub 展示资产、完善部署与 Troubleshooting 文档、创建远程仓库、配置托管环境并执行生产 Smoke Test。

---

## 2026-07-28 - M5 Interactive Demo UI

### 目标

把 M4 的完整 API 能力转化为招聘者和技术面试官可以在三次主要点击内理解并操作的演示体验，同时保留输入、模型、检索、融合和引用的技术透明度。

### 完成内容

- 建立统一颜色、间距、圆角、阴影和风险状态 Design Tokens，重构桌面与手机响应式 Layout。
- 将三个虚构场景设计为可点击卡片；一次点击同步供应商名称、说明、八项指标和默认风险问题。
- 保留结构化指标编辑能力，并使数值精度与 API Schema 及预设数据一致。
- 为结果区建立 `idle`、`loading`、`success` 和 `error` 状态，提供表单 Validation Summary 与 API 失败重试按钮。
- 使用环形 Risk Gauge、风险文本、符号和颜色共同展示综合风险，避免只依赖颜色。
- 使用归一化条形图展示五项局部模型贡献及风险方向。
- 对比量化模型与文档风险，并明确显示 `SUPPORTED` 或 `MODEL ONLY` 置信状态。
- 将 Evidence 渲染为可键盘操作的按钮卡片，点击后通过原生 Dialog 查看完整 Citation、来源、类别和相关度。
- 使用可折叠 Technical Trace 展示模型、检索、融合延迟，以及策略、模型、索引、Request ID 和 Correlation ID。
- 更新首页和 Architecture 页面；新增 Evaluation 页面，公开模型与检索指标的口径和局限。
- 增加 Playwright Core + axe-core 浏览器 QA，使用本机 Chrome 验证真实交互与可访问性。

### 浏览器验收

- 桌面视口 1440×1000：Medium 场景完成评估并返回 MEDIUM，Citation Dialog 可打开和关闭，无横向溢出。
- 手机视口 390×844：Low 场景完成评估并返回 LOW，结果区自动进入视口，无横向溢出。
- Validation：问题少于 10 个字符时显示可聚焦的原生错误摘要，不发送 API 请求。
- Error Recovery：模拟 API 503 后显示解释和 `Try again` 操作。
- axe-core：桌面空态、桌面结果态和手机结果态的 WCAG 2 A/AA 自动化扫描均为 0 个 violation。
- 首页、Architecture、Evaluation 和 Demo 在手机视口均通过横向溢出检查。
- 浏览器截图生成于被 Git 忽略的 `apps/web/tmp/m5-browser-qa/`，用于本地视觉核对。

### 验证

- `pnpm --filter @srm/web typecheck`：7 个 Astro 文件，0 errors、0 warnings、0 hints。
- `pnpm --filter @srm/web build`：4 个静态页面构建成功。
- `pnpm --filter @srm/web qa:browser`：场景、成功结果、Citation、Validation、错误恢复、响应式和 a11y 全部通过。
- Docker Web 镜像重建成功；真实浏览器通过 `http://localhost:8080/demo/` 调用容器 API。

### 技术决策

1. **继续使用原生 Astro Client Script。** M5 交互仍可由一个页面级状态机清晰维护，无需为展示型 Portfolio 引入 React 运行时。
2. **招聘者主路径与技术细节分层。** 综合风险、结论和关注项优先显示；延迟、版本及追踪 ID 收入原生折叠面板。
3. **风险不能只用颜色表达。** HIGH、MEDIUM、LOW 同时具有文字、几何符号、颜色和 Gauge 的可访问名称。
4. **场景接口优先，内嵌预设降级。** 页面启动时从 `/v1/scenarios` 同步权威场景；API 暂时不可用时，固定虚构预设仍允许用户查看和编辑输入。
5. **浏览器 QA 使用现有 Chrome。** `playwright-core` 不下载额外浏览器，降低仓库和 CI 负担；运行环境可通过 `CHROME_PATH` 指定 Chromium。

### 遇到的问题

- 初次浏览器测试直接点击视觉隐藏的 radio，受到外层卡片拦截；测试改为点击真实用户操作的整张卡片。
- Medium 场景包含三位小数与 5.26 天，但初始 HTML `step` 精度较低，导致浏览器在 API 调用前阻止提交；对齐 Schema 数据精度后修复，并增加预设表单有效性断言。
- 静态 fallback 供应商名称一度与 `/v1/scenarios` 返回值不一致；视觉核对发现后统一为共享场景定义中的名称和说明。

### 未完成事项

- 浏览器 QA 当前依赖本机已安装的 Chrome/Chromium，尚未作为 CI 必跑项下载和管理浏览器。
- M6 仍需系统化执行依赖漏洞、Secret、超时、性能、日志字段和安全说明检查。
- GitHub 远程仓库、公开托管环境和 Portfolio 集成尚未执行。

### 下一步

进入 M6：完成可靠性、安全、性能基线、依赖与 Secret 审计，并扩展故障注入和端到端测试。

---

## 2026-07-28 - M4 API Vertical Slice

### 目标

把 M2 的量化模型与 M3 的文档证据合并成一个可供 UI 和第三方客户端稳定调用的完整评估流程，并确保风险结论、Evidence 与 Citation 始终一致。

### 完成内容

- 新增版本化融合策略 `demo-fusion-1.0.0`：证据充分时使用 70% 量化风险与 30% 文档风险，综合分数以 0.20 和 0.65 划分 LOW、MEDIUM、HIGH。
- 当检索结果为 `INSUFFICIENT_EVIDENCE` 时，不把“缺少证据”误算为零文档风险；改为 `MODEL_ONLY`，有效权重自动调整为 100% 量化、0% 文档。
- 生成确定性的综合结论、风险类别、关注项和 Citation ID，不引入付费 LLM 或不可复现文本生成。
- 新增响应校验器，检查 Evidence 数量、Citation 唯一性、Citation 可解析性、摘要与结构化 Citation 一致性及综合分数范围。
- 升级共享 JSON Schema 和 TypeScript 类型，统一 `COMPLETE`、`MODEL_ONLY`、综合风险、融合权重和阶段延迟字段。
- 新增 `GET /v1/scenarios`，集中提供三个虚构场景、默认问题和指标，避免 UI 复制业务数据。
- 新增 OpenAPI JSON 与 Swagger UI；公开 API 文档分别位于 `/openapi.json` 和 `/docs/`。
- 接受或生成 Request ID 与 Correlation ID，在成功和错误响应中回传；不可信格式会被安全 UUID 替换。
- 统一字段级输入错误、畸形 JSON、限流和内部错误响应；客户端不接收堆栈信息。
- Astro 页面以综合风险作为主结果，同时展示量化风险、文档风险、有效权重、融合耗时、关注项和 Evidence。

### 端到端场景结果

| 场景                   | 状态       | 综合风险 | 综合分数 | Evidence |
| ---------------------- | ---------- | -------- | -------: | -------: |
| high-risk-logistics    | COMPLETE   | HIGH     | 0.936884 |        3 |
| medium-risk-quality    | COMPLETE   | MEDIUM   | 0.278667 |        1 |
| low-risk-stable        | COMPLETE   | LOW      | 0.026175 |        3 |
| 无关问题（低风险场景） | MODEL_ONLY | LOW      | 0.000101 |        0 |

以上为固定模型、虚构语料和当前融合策略下的确定性回归结果，不代表真实供应商风险或生产性能。

### 验证

- Pytest：15 项通过，覆盖模型、检索、三种综合风险、无证据降级、融合策略和 Citation Validator。
- Vitest：5 项通过，覆盖 API 契约、场景列表、OpenAPI、追踪 ID、字段校验与畸形 JSON 安全响应。
- Docker Compose：Risk Engine 与 API 均为 healthy，Web 正常运行。
- 容器 E2E：三个预设场景分别返回 HIGH、MEDIUM、LOW，Request ID 正确透传。
- 无关问题 E2E：返回 `MODEL_ONLY`、有效权重 1.0/0.0、0 条 Evidence 和 0 个 Citation。
- 错误路径 E2E：非法 `scenarioId` 返回 HTTP 400、字段级 `VALIDATION_ERROR`、Request ID 和 Correlation ID，不包含堆栈。
- OpenAPI Smoke Test：版本为 0.4.0，包含 `/v1/evaluations`；Swagger UI 返回 HTTP 200；场景接口返回 3 项。

### 技术决策

1. **缺失证据不是低风险证据。** 直接按 70/30 计算会把空检索当成 0 分并稀释模型风险，因此降级为 `MODEL_ONLY` 并公开有效权重。
2. **融合策略显式版本化。** 权重和阈值属于可审计业务策略；响应返回策略版本、配置权重和有效权重，便于复现结论。
3. **先校验后返回。** Risk Engine 在响应越过服务边界前验证 Citation 与 Evidence 的引用完整性，避免 UI 展示无法解析的结论。
4. **确定性解释优先。** M4 使用规则化结论与关注项，确保演示无需 Secret、外部网络或按次付费服务。
5. **追踪 ID 不等于业务幂等。** 当前实现用于跨服务排错和请求定位，没有声明请求去重或结果缓存能力。

### 遇到的问题

- 第一次全量格式检查发现 4 个新文件不符合 Prettier；统一格式化后纳入最终回归。
- 原始畸形 JSON 最初被归类为通用内部错误；新增 Fastify 解析错误识别后，改为安全的 `INVALID_JSON` 400 响应。
- Joblib 在当前 NumPy 版本加载数组时仍产生弃用警告，但不影响模型结果；保留为后续依赖升级观察项。

### 未完成事项

- API 当前无数据库、队列、缓存和请求幂等存储；这些不是 Public Demo M4 的能力。
- M5 仍需完成面向面试官的交互体验、响应式视觉验收、Loading/Empty/Error 状态和无障碍检查。
- GitHub 远程仓库、托管环境、监控和 Portfolio 集成尚未执行。

### 下一步

进入 M5：完善 Demo UI 的场景选择、结果信息层级、状态反馈、移动端体验和视觉验收。

---

## 2026-07-28 - M3 Hybrid Retrieval 与 Citation

### 目标

用完全虚构的供应商文档实现可复现的 Hybrid Retrieval，为每个文档风险判断返回可解析 Citation，并明确处理无相关证据的拒答路径。

### 完成内容

- 创建 12 份虚构文档，覆盖物流、运营、质量、财务、绩效与法律类别，以及 3 个 Demo 场景。
- 定义文档 ID、供应商、来源类型、日期、来源质量、风险类别、严重度和 Section Metadata。
- 使用内容 SHA-256 删除一份完全重复文档。
- 在相同场景与来源类型候选组内使用 Jaccard 相似度删除一份旧版近重复文档，保留最新版本。
- 将 10 份保留文档按 Section 切分为 17 个 Chunk。
- 离线构建 word/bigram TF-IDF、固定随机种子 LSA 和 L2-normalized 16 维稠密向量。
- 实现 Dense Cosine、BM25、Domain Anchor、Source Quality 与 Temporal Decay 加权排名。
- 实现每个文档只返回最高分 Chunk、Top-5 限制和最低相关性阈值。
- 为无关问题返回 `INSUFFICIENT_EVIDENCE`，不生成 Citation。
- 创建 8 条人工标注查询集并输出 Recall@5、MRR 与检索耗时。
- 将模型与检索并行执行，返回文档风险、证据卡片、Citation ID 和阶段延迟。
- Astro Demo 展示文档风险、检索延迟和虚构 Evidence Cards。

### 检索评估

| 指标               |     结果 |
| ------------------ | -------: |
| Evaluation Queries |        8 |
| Recall@5           | 1.000000 |
| MRR                | 1.000000 |
| Retained Documents |       10 |
| Indexed Chunks     |       17 |

该评估集规模很小，并且针对虚构语料人工设计。满分只说明当前回归用例全部命中，不能推断开放领域或生产语料性能。

### 验证

- `pnpm verify`：Artifact 校验、Prettier、Ruff、Astro、TypeScript、测试和 Build 全部通过。
- Pytest：9 项通过，覆盖 API、XGBoost、检索命中、拒答、数据时间切分及文档去重。
- Vitest：3 项通过，覆盖 Fastify 契约、Citation Evidence 和输入校验。
- Retrieval verifier：版本、语料 Hash、Chunk 数、fictional 标识、两种去重控制与指标门槛通过。
- Docker Compose：Risk Engine 与 API healthy，Web 正常启动。
- 容器端到端请求：返回模型概率 0.981211、文档 HIGH、3 条 Evidence、`E1` Citation 和独立检索延迟。
- Web Smoke Test：M3 标题与 Fictional Evidence 区域返回成功。

### 技术决策

1. **Public Profile 使用 TF-IDF + LSA，而不是运行时下载预训练模型。** 当前 Demo 优先确定性、小镜像和零外部 API；它的语义泛化能力有限，后续 Full Profile 可替换 Sentence-Transformers/Milvus。
2. **稠密与词法检索同时保留。** Dense LSA 捕获潜在主题，BM25 保留精确术语，领域锚点补充供应链语义。
3. **只返回每份文档的最高分 Chunk。** 避免 Top-5 被同一来源的相邻 Section 占满。
4. **Evidence-bound Summary 不依赖付费 LLM。** 摘要中的 `[E1]` 必须来自同一响应 Evidence；无证据时明确拒答。
5. **保留 `PARTIAL` 顶层状态。** M3 已完成检索，但量化与文档风险的正式融合属于 M4，不能提前宣称完整评估已完成。

### 遇到的问题

- 初始近重复阈值过高，旧版质量报告未被识别并压过最新报告；依据语料对比将候选组阈值调整为 0.54 后，保留最新版本且 MRR 从 0.9375 提升到 1.0。
- 初始检索保留英文停用词，完全无关问题因公共词得到虚假证据；Dense 与 BM25 同时移除英文停用词后，拒答测试通过。
- 初始 Top-5 允许同一文档的多个 Section 重复出现；增加按 `documentId` 聚合后 Evidence 来源保持唯一。
- Joblib 在当前 NumPy 版本加载数组时产生弃用警告，但不影响结果；已记录为依赖升级观察项。

### 未完成事项

- M4 尚需实现量化风险与文档风险的显式融合公式、最终综合风险和完整 Citation Validation。
- 当前 LSA 只在小型英文虚构语料上评估，没有多语言、长文档或开放领域泛化结论。
- 尚未加入 PDF/OCR、Cross-Encoder、Milvus Server 或 Cloud LLM；这些均不是 M3 Public Profile 的已实现能力。

### 下一步

进入 M4：完成风险融合、统一响应状态、Citation Validator、OpenAPI 与三场景端到端契约。

---

## 2026-07-28 - M2 数据、模型与实时推理

### 目标

构建不含企业数据的可复现供应商风险数据与模型 Pipeline，并将真实模型推理贯通现有 FastAPI、Fastify 和 Astro Demo。

### 完成内容

- 定义 8 个 point-in-time 特征和未来 14 天中断标签。
- 使用固定随机种子 726 生成 12,000 条合成供应商快照；完整数据可再生，小样本进入仓库。
- 按时间切分：2019–2023 训练、2024 验证和阈值选择、2025 最终测试。
- 仅在训练集计算 `scale_pos_weight`，避免从验证或测试期引入信息。
- 训练并保存 `srm-xgb-demo-1.0.0` XGBoost JSON 模型、Metadata 和指标报告。
- 使用 XGBoost `pred_contribs` 输出每次预测的前五项局部特征贡献。
- 将概率、风险等级、阈值、贡献方向和推理耗时加入共享 API Schema。
- 将 Python 内部端点升级为 `/v1/evaluations/evaluate`，并贯通公开 `POST /v1/evaluations`。
- 升级 Astro Demo，展示风险概率、等级、模型驱动因素和延迟。
- Docker Linux 镜像使用 `xgboost-cpu`，避免下载不需要的 GPU/NCCL 运行时。

### 模型评估

2025 合成测试期共有 1,687 条记录，正类率 2.1932%。验证集按 F2 选择高风险阈值 0.220371，测试结果如下：

| 指标             |                           结果 |
| ---------------- | -----------------------------: |
| Recall           |                       0.891892 |
| Precision        |                       0.323529 |
| PR-AUC           |                       0.653024 |
| ROC-AUC          |                       0.971794 |
| Confusion Matrix | TN 1581 / FP 69 / FN 4 / TP 33 |

以上结果仅描述确定性合成数据与 Demo Pipeline，不代表真实供应商或生产环境表现。

### 验证

- Artifact verifier：模型版本、8 个特征、特征顺序和 synthetic 标识通过。
- Ruff 与 Prettier：通过。
- Pytest：6 项通过，覆盖 API、模型加载、贡献输出、数据确定性与时间切分。
- Vitest：3 项通过，覆盖 Fastify 健康检查、契约和输入拒绝。
- Astro/TypeScript typecheck 与三个 Workspace build：通过。
- Docker Compose：Risk Engine 与 API healthy，Web 正常运行。
- 容器端到端请求：返回 `PARTIAL`、模型 `srm-xgb-demo-1.0.0`、HIGH、概率 0.981211、五项驱动因素和 Correlation ID。
- Web Smoke Test：`http://localhost:8080/demo/` 返回 200 且包含 M2 模型界面。

### 遇到的问题

- 容器首次启动时，代码在读取环境变量前计算本地项目父目录，Docker 的较短路径触发 `IndexError`；改为优先使用显式模型路径后修复。
- 标准 Linux `xgboost` 包会引入约 303 MB NCCL 依赖；改用 CPU 包后将 XGBoost 下载降至约 5.7 MB。
- 首次 Compose 构建超时后留下同名容器；仅清理本项目 `srmdemo-*` 容器后重新启动，未修改其他项目容器。

### 未完成事项

- 文档语料、Embedding、Hybrid Retrieval 和 Citation 仍明确标记为 `pending-m3`。
- 当前局部贡献是模型 log-odds 空间中的 XGBoost 贡献，用于排序和方向解释，不应理解为概率百分点。
- GitHub 远程仓库、托管环境和 Portfolio 尚未创建。

### 下一步

进入 M3：构建虚构供应商文档语料、Metadata、分块、Embedding、Hybrid Retrieval 与检索评估。

---

## 2026-07-28 - M1 仓库与工程骨架

### 目标

从空目录建立可安装、可构建、可测试、可容器化的 Monorepo，并在真实浏览器中打通 Astro → Fastify → FastAPI 的第一个占位 Vertical Slice。

### 完成内容

- 初始化 Git 仓库，默认分支为 `main`。
- 增加 `.gitignore`、`.dockerignore`、`.editorconfig` 和 `.env.example`。
- 建立 pnpm 11 Workspace 和根级开发命令。
- 创建 `apps/web` Astro 静态应用，包含首页、Demo 和 Architecture 页面。
- 创建 `apps/api` Fastify TypeScript 服务，包含输入校验、CORS、限流、Correlation ID、健康检查和统一错误响应。
- 创建 `services/risk-engine` FastAPI 服务，定义后续 XGBoost 和 RAG 的服务边界。
- 创建 `packages/api-schema`，共享 Evaluation 请求、响应和 TypeScript 类型。
- 打通 `POST /v1/evaluations` 到 Python `POST /v1/evaluations/preview` 的占位请求。
- 配置 TypeScript、ESLint、Prettier、Astro Check、Ruff、Pytest 和 Vitest。
- 为三个服务创建 Dockerfile 和 Docker Compose。
- 创建 GitHub Actions，执行 Node、Python 和 Compose 配置检查。
- 创建深色工程风格的 M1 Demo 页面，并完成桌面视觉检查。

### 文件与组件

- `apps/web`：Astro 页面、表单交互和视觉样式。
- `apps/api`：公共 Fastify API 和 Risk Engine Client。
- `services/risk-engine`：Python 服务、Pydantic Schema 和测试。
- `packages/api-schema`：Node 侧共享契约。
- `docker-compose.yml`：Web、API、Risk Engine 本地编排。
- `.github/workflows/ci.yml`：基础 CI。
- `README.md`：M1 Quick Start、验证方式和数据声明。

### 技术决策

1. **先返回明确的 Skeleton，而不是伪造模型结果。** M1 响应使用 `pending-m2` 和 `pending-m3` 标识尚未实现的模型与索引。
2. **pnpm 依赖脚本采用显式 Allowlist。** pnpm 11 默认拒绝未经审查的构建脚本；项目仅允许 `esbuild` 和 `sharp`，没有启用全局脚本放行。
3. **Docker 对外 API 使用 3100。** 宿主机已有用户项目 `scm-api-gateway` 占用 3000；未停止或修改现有容器。Native 开发仍使用 3000，Compose 映射为 `3100:3000`。
4. **API Healthcheck 使用 GET。** 初始 `wget --spider` 发送 HEAD，和只支持 GET 的 `/ready` 不匹配；改为 Node `fetch` 后健康检查通过。
5. **公共页面静态优先。** Astro 只在 Demo 表单上发送客户端请求，首版不引入 React。

### 验证

执行了根级验证：

```text
pnpm verify
```

结果：

- Prettier：通过。
- ESLint、Astro Check、TypeScript、Ruff：通过。
- Astro Check：6 个文件，0 errors，0 warnings，0 hints。
- Vitest：3 tests passed。
- Pytest：3 tests passed。
- Astro Build：3 个静态页面构建成功。
- Fastify TypeScript Build：成功。
- `docker compose config --quiet`：通过。
- Docker：Web、API、Risk Engine 三个镜像构建成功。
- Compose：API 和 Risk Engine 均为 healthy，Web 正常运行。
- 浏览器 E2E：表单提交成功，返回 `M1 vertical slice connected`、模型 `pending-m2`、索引 `pending-m3` 和 Correlation ID。
- 一次 Native API Smoke Test 的完整响应约为 5.79ms；该数字只用于连通性检查，不是性能基准。

视觉检查截图保存在忽略提交的临时路径 `tmp/m1/demo-compose-success.png`。页面未发现溢出、遮挡或不可读文本。

### 遇到的问题

- Git 因沙箱用户和目录所有者不同触发 `dubious ownership`；仅将当前项目路径加入 `safe.directory`。
- Astro 首次尝试写用户级 Telemetry 配置时被沙箱拒绝；在所有 Astro 命令中明确禁用 Telemetry。
- pnpm 11 将旧 `onlyBuiltDependencies` 替换为 `allowBuilds`；依据官方配置迁移为显式 Map。
- Docker Desktop 最初未运行；启动 Engine 后完成镜像和 Compose 验证。
- 宿主机 3000 端口已被现有容器占用；改用 3100，未影响原项目。
- API 初始健康检查使用 HEAD 导致 unhealthy；修正为 GET 后通过。

### 未完成事项

- 还没有真实 XGBoost 模型、特征 Pipeline 或风险概率。
- 还没有文档语料、Embedding、向量索引和 Hybrid Retrieval。
- 尚未创建远程 GitHub 仓库或在线环境。
- 当前 UI 结果区只显示工程占位信息，不表示真实供应商风险。

### 下一步

进入 M2：

1. 定义供应商事件和特征数据字典。
2. 构建固定随机种子的合成数据生成器。
3. 实现 Point-in-time Feature Builder 和时间切分。
4. 训练 XGBoost 并输出 Recall、Precision 和 PR-AUC。
5. 将模型和特征贡献接入当前 Risk Engine。

---

## 2026-07-28 - 建立产品与开发基线

### 目标

在编写代码前，明确公开 Demo 的产品范围、开发顺序、技术架构、验收标准和持续记录方式。

### 输入材料

- `03_AI_ML_RAG与SRM项目深挖.md`
- `Xin_Ethan_Li_AI_Engineer_CV_0726.pdf`
- 用户提出的 Demo、GitHub、Portfolio 和在线演示目标

### 完成内容

- 完整阅读 SRM 深挖文档中的 20 个中英文技术问答。
- 阅读并视觉核对简历中 SRM 项目描述。
- 识别简历 `~85% accuracy` 与深挖文档 `85% high-risk recall` 的口径差异。
- 评估公开 Demo、GitHub 技术展示、Astro Portfolio 和在线部署的可行性。
- 创建 PRD，定义用户、场景、P0/P1/P2、指标和验收标准。
- 创建开发计划，拆分 M0–M8 和 Definition of Done。
- 创建技术架构，定义 Astro、Fastify、Python Risk Engine、离线 Pipeline 和部署 Profile。
- 创建本 Walkthrough 文档和更新规则。

### 关键决策

1. **公开 Demo 与原生产系统明确分离。** 不使用原企业数据、代码、模型和文档。
2. **采用合成数据。** 数据将带时间边界、噪声和类别不平衡，并固定随机种子。
3. **主指标使用 Recall、Precision 和 PR-AUC。** 不以 Accuracy 掩盖约 2% 高风险类别的不平衡。
4. **采用 Astro + Fastify + Python。** Astro 快速提供美观静态站点；Fastify 展示 Node.js/TypeScript API；Python 承载 XGBoost 和 RAG。
5. **公共 Demo 默认不依赖实时付费 LLM。** 默认使用 Evidence-bound Deterministic Summary，真实 Provider 作为增强功能。
6. **MVP 不开放任意 PDF 上传。** 避免恶意文件、OCR 资源消耗和隐私风险。
7. **使用两种运行 Profile。** Public Demo Profile 强调低成本和稳定；Full Local Profile 展示 PostgreSQL、Redis、Milvus 和 Ollama 边界。
8. **Portfolio 与 Demo 分仓库。** 便于 GitHub Profile 分别展示个人网站和核心技术项目。

### 环境检查

- 工作目录：`I:\projects\SRM Demo`
- 当前目录只有需求文档、简历 PDF 和临时 PDF 渲染目录。
- 当前目录不是 Git 仓库。
- 未发现 `AGENTS.md` 项目指令文件。
- 尚未安装或生成应用依赖。

### 验证

本批次只创建文档，不包含应用构建或测试。已执行以下核对：

- 四个文件均存在且可按 UTF-8 读取。
- 每份文件只有一个一级标题，章节层级有效。
- PRD、计划和架构中的 P0、P1、P2 范围一致。
- 生产指标仅作为背景或禁止误用的说明，未表述为 Demo 已实现指标。
- 开发计划和里程碑状态已与当前实际进展同步。
- 技术架构中的代码块和 Mermaid 区块已进行成对检查。

### 已知问题

- 最终域名尚未确定。
- GitHub、托管平台和 LLM Provider 尚未授权。
- Milvus Lite 与托管环境的最终资源占用需要在原型阶段验证。
- Portfolio 是否需要中英文切换尚未确定。

### 下一步

进入 M1：

1. 初始化 Git 仓库。
2. 创建 Monorepo 和基础目录。
3. 创建 Astro、Fastify 和 Python Risk Engine 骨架。
4. 增加健康检查、共享 Schema、Docker 和基础 CI。
5. 打通第一个空结果 Vertical Slice。

---

## 6. 后续记录模板

复制以下模板并放到“Walkthrough 记录”顶部：

````markdown
## YYYY-MM-DD - 本轮主题

### 目标

本轮要解决的问题和完成条件。

### 完成内容

- 实际完成的修改。

### 文件与组件

- `path/to/file`：修改目的。

### 技术决策

1. 决策、原因和权衡。

### 验证

执行命令：

```text
command
```

结果：

- 通过/失败数量。
- 关键指标。
- 视觉检查结果。

### 遇到的问题

- 问题、原因、尝试和解决方式。

### 未完成事项

- 本轮明确未完成的内容。

### 下一步

1. 下一项可执行工作。
````
