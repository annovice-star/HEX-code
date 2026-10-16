# 立方匯 APEC 专题 · 开发说明

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
