# 立方匯 APEC 专题 · 开发说明

## 2026-10-20 七语言界面

- 在简体中文、繁体中文和英文基础上增加日语 `ja`、韩语 `ko`、西班牙语 `es`、葡萄牙语 `pt`。`lib/languages.ts` 统一语言编号、原生名称及校验规则，前台切换、后台文章与译文草稿、咨询语言、搜索入口均使用此定义。
- 界面字典覆盖导航、搜索、原文回退提示、咨询表单、参考来源、AI配图标记、二维码和文字长图分享。静态预览提示跟随界面语言；切换会更新URL语言参数与本机偏好，分享或刷新保留语言。
- 原有5篇中文文章及图注不自动翻译。缺少对应译文时保留原文并用所选语言提示，后台可为7种语言分别录入并审核发布译文。公众AI生成仍关闭，不增加模型调用。
- 新增语言完整性和校验测试 `tests/languages.test.mjs`（纳入GitHub Pages发布检查），本地后台保存检查 `tests/languages-http.mjs`。

## 2026-10-20 首批图文内容

- 发布5篇APEC综合整理文章，保留17项参考来源、5张标注AI生成的场景图和2张信息图。图片压缩为本地WebP资源，不依赖外部图片服务。
- `guide.editorial` 保存图注、正文插图位置和多来源链接，沿用现有guide JSON字段，无数据库表结构变更。正文支持 `## ` 标题及编号来源跳转。
- `lib/launch-articles.json` 为此次明确授权发布的数据。首次读取内容时，将5篇记录和导入完成标记在同一个D1事务中写入；已存在的ID不会覆盖。后续编辑、下架或删除不会被重新导入。后台正文保存保留图文元数据。
- GitHub Pages的 `public-content.json` 同步包含这5篇公开文章。在线服务连接成功后仍以服务端数据为准；后台更改不会自动重新构建静态包，需同步发布快照才能让后端不可达设备看到改动。
- 文字长图导出保留全部来源，图文完整版本可通过浏览器打印/PDF保存。

## 登录与内部访问

整个网站（首页、文章、搜索、AI 与后台）使用独立账号密码验证。没有公开注册入口；不再使用 ChatGPT 用户身份授权。登录入口 `/login`，后台 `/admin`，修改密码 `/admin/security`。

服务端使用 PBKDF2-SHA256（100,000 次迭代，兼容 Workers WebCrypto）和随机盐保存密码哈希。会话令牌随机生成，数据库只存令牌哈希，Cookie 使用 HttpOnly、SameSite=Strict，线上强制 Secure。会话有效期 8 小时；退出立即撤销当前会话，修改密码立即撤销全部旧会话。登录和改密有 IP 请求限额，写入需同源。

运行配置 `SITE_VISIBILITY=internal`。Sites 外层访问设置允许打开独立登录页，应用服务端保护实际内容。请勿将 SITE_VISIBILITY 改为 public，除非明确需要公开首页、文章、搜索和问答。

初始化时配置 `ADMIN_BOOTSTRAP_USERNAME`、`ADMIN_BOOTSTRAP_HASH`、`ADMIN_BOOTSTRAP_SALT`，均存为 Sites secrets。可在私密终端运行 `node scripts/create-admin-config.mjs` 生成随机初始密码及对应盐/哈希。不得将输出提交 Git 或放入前端。初始化只插入不存在的账号，不会覆盖后台修改后的密码。

## 已实现

- 响应式首页、资讯分类搜索、文章、观察、服务、活动和联系方式。
- 简体、繁体、英文界面；文章保留原文，不伪造译文。
- 单管理员后台：新增、编辑、草稿、发布、下架、删除、推荐及联系方式。
- D1 持久化；搜索只使用已发布的非示例文章。
- DeepSeek 流式接口采用 deepseek-flash；Key 未配置时清楚提示 AI 未启用，并提供资料搜索。

## 2026-10-19 服务指引升级

- 首页改为按需求浏览：了解深圳、企业落地、人才与工作、区域与创新。保留既有内容分类值，兼容原有文章。
- 每篇内容可填写适用对象、步骤、准备清单、注意事项和最多 20 组固定问答；搜索覆盖指引字段和问答。
- 同主题使用 `guide.groupId` 关联简体、繁体、英文版本；缺译时展示原文并提示，不调用机器翻译。后台新建译文只生成空白草稿。
- 支持复制主题链接、本地生成二维码、下载排版长图和浏览器打印/PDF。链接沿用全站登录要求；下载图片可独立转发。超长内容分图导出，浏览器可能要求允许多文件下载。
- 提供一般咨询及关联主题的咨询表单。记录持久保存在 D1 `inquiries`，仅管理员可查看并更新待处理、已联系、已完成状态。需要明确勾选同意；不自动发送邮件，管理员需定期查看。
- 后台支持来源、核验日期、复核日期和待更新筛选；标记已核验需填写来源、链接和核验日期。复核提醒不会自动改文、发布或发通知。
- **公众模型生成在 `lib/features.ts` 明确关闭**。即使配置 DeepSeek Key 也不会开放 `/api/chat`；浏览、问答、搜索、二维码和长图不消耗模型 token。
- 无真实资料时展示明确标识的三语言模板；模板不作为真实政策或服务承诺，不接收主题业务咨询。可使用一般咨询。
- 数据库追加迁移 `0002_wet_ultragirl.sql`，不修改既有迁移。
- 二维码使用本地随代码发布的 MIT 开源模块 `vendor/qrcode-generator`，不向第三方二维码服务发送链接。

新增检查：`node tests/guides-http.mjs`（只允许 localhost，创建本地测试资料和咨询记录）。跨域检查 `node tests/pages-api.mjs` 默认使用生产模式本地 8787，须配置 `PAGES_ORIGIN`。

## 本地运行与验证

Node 22.13+，pnpm 11.25。首次 `pnpm install --frozen-lockfile`。

1. `node scripts/setup-auth-test.mjs` 创建仅本地使用的随机测试账号配置（`.dev.vars`、`outputs/auth-test.json` 均忽略提交），保留已有 DeepSeek 配置。
2. `pnpm run build` 生成 D1 配置。
3. 按顺序对本地数据库应用尚未运行的迁移：

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wild_talisman.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nebulous_lady_vermin.sql
pnpm run dev
```

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none tests/content.test.mjs tests/password.test.mjs
node tests/http-smoke.mjs
```

集成测试只接受 localhost，创建临时文章并清理；测试改密、会话撤销后恢复本地测试密码。AI 未配置场景需要空的本地 DEEPSEEK_API_KEY。请勿对线上执行测试清理或重置。

## DeepSeek 与内容

在本地 `.dev.vars` 或 Sites secret 中配置 `DEEPSEEK_API_KEY`；托管环境更新后需要部署。不要在聊天、前端或 Git 中保存 Key。密钥配置不等于已验证模型权限、余额和输出质量，仍需实际验证。

展示的设计示例均有标识，不进入知识库。正式资讯、服务内容、品牌素材、联系方式待审核补充。首版采用关键词与同义词检索；未实现向量库、自动采集、机器翻译、附件上传、活动报名或深知政策查询。同篇多语言关联需后续完善。

数据库迁移部署后保持不变，后续调整追加迁移。

## GitHub Pages 前端

目标仓库 `annovice-star/HEX-code`，地址 `https://annovice-star.github.io/HEX-code/`。`github-pages/` 是独立静态入口，复用现有首页和后台组件。`pnpm run build:pages` 生成 `pages-dist/`，GitHub Actions 工作流只发布这个目录。仓库 Settings → Pages 需选择 GitHub Actions；私有仓库需支持 Pages 的 GitHub 付费方案。不要为了发布页面将业务源码仓库自动改为公开。

Pages 仅承载前端资源；内容和管理数据通过现有 Workers/D1 后端获取。后端运行环境配置 `PAGES_ORIGIN=https://annovice-star.github.io`。跨域仅放行该精确来源，登录返回随机会话令牌，前端仅在当前标签页的 sessionStorage 中保存；API 使用 Authorization，避免依赖第三方 Cookie。令牌复用既有 8 小时有效期、数据库哈希和改密版本撤销机制。退出后立即撤销令牌。

网页静态包中不包含真实业务内容、管理员密码或 API Key。打开新标签页可能需要重新登录。站内文章和后台预览在当前标签页打开，避免丢失登录状态。

前端采用哈希路由，如 `/HEX-code/#/admin`，刷新不会触发 Pages 404。部署基础路径通过 `VITE_PAGES_BASE` 指定，后端通过 `VITE_API_ORIGIN` 指定；这两个值均为公开地址，不是密钥。

本地生产后端启动后可用 `node tests/pages-api.mjs` 检查精确来源预检、跨域登录、匿名拦截、令牌篡改和退出撤销。本地测试用 `.dev.vars` 应配置上述 PAGES_ORIGIN，且 `.dev.vars` 需位于 Wrangler 配置所在目录。此测试文件只用于本地，不要对线上运行清理或改密测试。
