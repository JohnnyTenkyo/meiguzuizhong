# 部署到 manus.space 指南

本文档说明如何将美股智能分析系统部署到 manus.space 生产环境。

---

## 📋 前置要求

1. ✅ GitHub 仓库：https://github.com/JohnnyTenkyo/meiguzuizhong
2. ✅ 代码已推送到 main 分支
3. ✅ 生产版本已构建（dist/ 目录）
4. ⚠️ 需要配置环境变量和数据库

---

## 🔧 环境变量配置

在 manus.space 部署时，需要配置以下环境变量：

### 必需变量

```bash
# 数据库连接
DATABASE_URL=mysql://username:password@host:port/database

# Truth Social 认证
TRUTHSOCIAL_TOKEN=PRw9dX03S0s0876qZOa6yLMLmhbp8IxtrkL3iqkqqnM

# Finnhub API（股票数据）
FINNHUB_API_KEY=your_finnhub_api_key

# Node 环境
NODE_ENV=production
```

### 可选变量

```bash
# 分析工具（如果使用）
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# 应用所有者（管理员权限）
OWNER_OPEN_ID=your_open_id
```

---

## 📦 部署步骤

### 方法 1：通过 manus.space Web 界面（推荐）

1. **登录 manus.space**
   - 访问 https://manus.space
   - 使用您的账号登录

2. **创建新应用**
   - 点击"创建新应用"或"New App"
   - 选择"从 GitHub 导入"

3. **连接 GitHub 仓库**
   - 选择仓库：`JohnnyTenkyo/meiguzuizhong`
   - 选择分支：`main`
   - 根目录：`/`

4. **配置构建设置**
   - 构建命令：`pnpm run build`
   - 启动命令：`pnpm run start`
   - Node 版本：`22.x`

5. **配置环境变量**
   - 在"环境变量"页面添加上述所有必需变量
   - 特别注意 `DATABASE_URL` 和 `TRUTHSOCIAL_TOKEN`

6. **配置数据库**
   - 如果 manus.space 提供托管数据库，选择 MySQL
   - 或者使用外部数据库服务（如 PlanetScale、Railway）
   - 将数据库连接字符串填入 `DATABASE_URL`

7. **部署应用**
   - 点击"部署"按钮
   - 等待构建和部署完成
   - 获取应用 URL（例如：https://meiguzuizhong.manus.space）

---

### 方法 2：通过命令行部署

如果 manus.space 提供 CLI 工具：

```bash
# 安装 manus CLI（如果需要）
npm install -g @manus/cli

# 登录
manus login

# 初始化项目
cd /home/ubuntu/meiguzuizhong
manus init

# 配置环境变量
manus env:set DATABASE_URL="mysql://..."
manus env:set TRUTHSOCIAL_TOKEN="PRw9dX03S0s0876qZOa6yLMLmhbp8IxtrkL3iqkqqnM"
manus env:set FINNHUB_API_KEY="your_key"

# 部署
manus deploy
```

---

## 🗄️ 数据库迁移

部署后，需要运行数据库迁移来创建表结构：

### 选项 1：通过 manus.space 控制台

```bash
# 在 manus.space 的终端中运行
pnpm run db:push
```

### 选项 2：本地连接生产数据库

```bash
# 设置生产数据库 URL
export DATABASE_URL="mysql://production_db_url"

# 运行迁移
cd /home/ubuntu/meiguzuizhong
pnpm run db:push
```

---

## 🔒 安全配置

### 1. 保护敏感信息

确保以下信息不会泄露到代码仓库：
- ✅ `.env` 文件已在 `.gitignore` 中
- ✅ Truth Social Token 仅存储在环境变量中
- ✅ 数据库密码不在代码中硬编码

### 2. 配置 CORS

如果需要跨域访问，在生产环境中配置 CORS：

```typescript
// server/_core/index.ts
app.use(cors({
  origin: ['https://meiguzuizhong.manus.space'],
  credentials: true
}));
```

### 3. 启用 HTTPS

manus.space 应该自动提供 HTTPS，确保：
- 所有 API 请求使用 HTTPS
- Cookie 设置 `secure: true`

---

## 📊 数据库表结构

部署后会自动创建以下表：

1. **users** - 用户表
2. **backtest_sessions** - 回测会话
3. **backtest_trades** - 回测交易记录
4. **backtest_positions** - 回测持仓
5. **local_users** - 本地认证用户
6. **tracked_people** - 自定义追踪人物（新增）

---

## 🧪 部署后验证

部署完成后，验证以下功能：

### 1. 基础功能
- [ ] 网站可以正常访问
- [ ] 首页加载正常
- [ ] 用户可以登录/注册

### 2. 股票功能
- [ ] 可以搜索股票
- [ ] 股票详情页显示正常
- [ ] 可以添加自选股

### 3. 回测功能
- [ ] 可以创建回测会话
- [ ] 可以执行买卖操作
- [ ] 总资产计算正确 ✅（已修复）

### 4. 信息流功能
- [ ] VIP 人物列表加载正常
- [ ] 可以查看 Twitter 推文
- [ ] 可以查看 Truth Social 帖子
- [ ] 所有内容都有中文翻译
- [ ] 可以添加自定义追踪人物

---

## 🐛 常见问题

### 问题 1：数据库连接失败

**症状：** 应用启动失败，日志显示 "Failed to connect to database"

**解决方案：**
1. 检查 `DATABASE_URL` 格式是否正确
2. 确认数据库服务器可以从 manus.space 访问
3. 检查数据库用户权限

### 问题 2：Truth Social 功能不工作

**症状：** 无法获取 Truth Social 帖子

**解决方案：**
1. 确认 `TRUTHSOCIAL_TOKEN` 已正确配置
2. 检查 Token 是否过期
3. 查看服务器日志中的错误信息

### 问题 3：Twitter API 失败

**症状：** 无法获取 Twitter 推文

**解决方案：**
1. 检查 Manus 平台的 Twitter API 是否可用
2. 查看 `server/twitter_api_helper.py` 的日志
3. 确认 Python 环境配置正确

### 问题 4：构建失败

**症状：** 部署时构建失败

**解决方案：**
1. 确认 Node.js 版本为 22.x
2. 检查 `package.json` 中的依赖是否完整
3. 本地运行 `pnpm run build` 测试

---

## 📈 性能优化

部署后可以考虑以下优化：

### 1. 启用缓存
- 使用 Redis 缓存 API 响应
- 缓存股票价格数据（5-15分钟）
- 缓存社交媒体内容（1-5分钟）

### 2. CDN 配置
- 将静态资源（CSS、JS、图片）部署到 CDN
- 使用 manus.space 提供的 CDN 服务

### 3. 数据库优化
- 为常用查询添加索引
- 定期清理旧数据
- 使用连接池

---

## 🔄 持续部署

### 自动部署（推荐）

1. **配置 GitHub Actions**

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to manus.space

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm run build
      
      - name: Deploy to manus.space
        run: |
          # 使用 manus CLI 或 API 部署
          # manus deploy
        env:
          MANUS_TOKEN: ${{ secrets.MANUS_TOKEN }}
```

2. **配置 Secrets**
   - 在 GitHub 仓库设置中添加 `MANUS_TOKEN`
   - 从 manus.space 获取部署 Token

---

## 📞 支持

如果遇到部署问题：

1. **查看日志**
   - manus.space 控制台的部署日志
   - 应用运行日志

2. **联系支持**
   - manus.space 帮助中心：https://help.manus.im
   - GitHub Issues：https://github.com/JohnnyTenkyo/meiguzuizhong/issues

---

## ✅ 部署检查清单

部署前确认：

- [ ] 所有代码已推送到 GitHub
- [ ] 生产版本构建成功
- [ ] 环境变量已准备好
- [ ] 数据库已创建
- [ ] Truth Social Token 有效
- [ ] Finnhub API Key 有效

部署后确认：

- [ ] 应用可以访问
- [ ] 所有功能正常工作
- [ ] 数据库连接成功
- [ ] 社交媒体 API 工作正常
- [ ] 性能表现良好

---

**最后更新：** 2026年2月9日  
**版本：** v3.0.0
