# 立方匯 · APEC 深圳机遇

APEC 专题网站，包含三语界面、资讯和文章、单管理员内容后台、资料检索及待配置的 DeepSeek 流式问答接口。

线上地址：https://lifanghui-apec-hub.jazzymoon32.chatgpt.site/

## 功能

- 整个网站使用独立账号密码登录，无需 ChatGPT 账号。
- 管理员可发布文章、保存草稿、维护联系方式、退出登录和修改密码。
- 简体中文、繁体中文和英文界面。
- D1 数据库存储；只检索已发布的非示例资料。
- DeepSeek Key 未配置时明确提示 AI 未启用，保留资料检索。

## 本地运行

需要 Node.js 22.13+ 和 pnpm 11.25。

```powershell
pnpm install --frozen-lockfile
node scripts/setup-auth-test.mjs
pnpm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_wild_talisman.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_nebulous_lady_vermin.sql
pnpm run dev
```

本地测试凭据位于自动生成且忽略提交的 `outputs/auth-test.json`。登录 `/login`，管理后台 `/admin`，修改密码 `/admin/security`。

## 验证

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --test --test-isolation=none tests/content.test.mjs tests/password.test.mjs
# 启动本地服务器后执行：
node tests/http-smoke.mjs
```

## 部署与配置

技术栈为 React 19、Vinext、Cloudflare Workers 和 D1。GitHub 仓库用于源码管理；GitHub Pages 仅部署静态前端，登录、数据库和 AI 接口继续由独立后端运行。

当前线上网站通过 Sites 托管。仓库中的 `.openai/hosting.json` 保留现有部署项目和数据库绑定。迁移到其他托管平台时，需要单独配置 Workers、D1、数据库迁移及运行环境。

运行环境变量名称见 `.dev.vars.example`，初始化账号和密码哈希流程见 [DEVELOPMENT.md](DEVELOPMENT.md)。API Key、管理员初始密码、本地环境文件和数据库均不随源码上传。线上数据库内容与管理员凭据需要独立管理。

示例内容均有标识，不进入 AI 资料库。正式内容、联系方式与品牌素材待审核补充。

## GitHub Pages

仓库已更名为 `annovice-star/HEX-code`。目标地址：`https://annovice-star.github.io/HEX-code/`。

`pnpm run build:pages` 构建前端；`.github/workflows/pages.yml` 在 main 更新时自动构建并发布 `pages-dist/`。在仓库 Settings → Pages 中选择 GitHub Actions 后生效。私有仓库需具备 Pages 使用权限。

后台运行环境配置 `PAGES_ORIGIN=https://annovice-star.github.io`。具体的会话令牌、跨域控制和哈希路由说明见 DEVELOPMENT.md。真实业务数据不会写入 GitHub 静态资源。
