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
| 当前阶段   | M1 已完成，等待进入 M2   |
| 当前版本   | 0.1.0                    |
| Git 仓库   | 已初始化，分支为 main    |
| 应用代码   | 三服务工程骨架已创建     |
| 本地运行   | Native 与 Compose 已验证 |
| 在线环境   | 尚未创建                 |
| 下一里程碑 | M2 - 数据与模型          |

## 4. 里程碑状态

| 里程碑                | 状态        | 说明                             |
| --------------------- | ----------- | -------------------------------- |
| M0 文档与范围基线     | Complete    | 四份基线文档已创建并完成交叉核对 |
| M1 仓库与工程骨架     | Complete    | Web → API → Risk Engine 已验证   |
| M2 数据与模型         | Not Started | —                                |
| M3 RAG 检索           | Not Started | —                                |
| M4 API Vertical Slice | Not Started | —                                |
| M5 Demo UI            | Not Started | —                                |
| M6 质量与安全         | Not Started | —                                |
| M7 GitHub 与上线      | Not Started | —                                |
| M8 Portfolio          | Not Started | —                                |

---

## 5. Walkthrough 记录

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
