# FFk 理发店管理系统 - Windows 桌面版构建与使用指南

## 📋 目录

1. [环境准备](#环境准备)
2. [GitHub 配置](#github-配置)
3. [构建流程](#构建流程)
4. [安装与使用](#安装与使用)
5. [版本更新](#版本更新)
6. [常见问题](#常见问题)

---

## 🔧 环境准备

### 本地开发环境（仅用于测试）

如果需要本地构建和测试，需要安装：

- **Node.js 18+**（下载：https://nodejs.org/）
- **Rust**（下载：https://rustup.rs/）
- **Git**（下载：https://git-scm.com/）

安装完成后，在项目目录运行：

```bash
npm install
npm run tauri dev  # 启动开发版本
npm run tauri build  # 本地构建（生成 dist 文件夹）
```

> ⚠️ **重要**：按照项目要求，本地**不需要**安装 VS Build Tools 或运行 `npm run dist`，所有构建全部通过 GitHub Actions 完成。

---

## 🔐 GitHub 配置

### 步骤 1：推送代码到 GitHub

使用 GitHub Desktop 或命令行推送代码：

```bash
git add .
git commit -m "Initial commit: Add Tauri desktop app configuration"
git push origin main
```

### 步骤 2：添加 GitHub Secrets

GitHub Actions 需要环境变量才能成功构建。按以下步骤添加：

1. **进入 GitHub 仓库**
   - 打开仓库主页 → Settings → Secrets and variables → Actions

2. **添加以下 Secret（3 个）**

   | 名称 | 值 | 获取方式 |
   |------|-----|---------|
   | `VITE_SUPABASE_URL` | `https://xweeutzonpebdaijmbof.supabase.co` | 项目 `.env` 文件 |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | 项目 `.env` 文件 |
   | `GITHUB_TOKEN` | **自动提供** | 无需手动添加 |

3. **添加方法**
   - 点击 "New repository secret"
   - Name 输入上表中的名称
   - Value 输入对应的值
   - 点击 "Add secret"

---

## 🚀 构建流程

### 方式 1：手动触发构建（推荐）

1. **进入 GitHub Actions**
   - 仓库主页 → Actions 标签页
   - 左侧选择 "Build Windows MSI" workflow

2. **手动触发构建**
   - 点击 "Run workflow" 按钮
   - 选择分支（通常是 `main`）
   - 点击 "Run workflow"

3. **等待构建完成**
   - 构建通常需要 5-10 分钟
   - 可在 workflow 列表中查看构建日志

### 方式 2：自动触发构建（推荐用于正式发布）

**创建版本标签（Tag）**，自动触发构建并发布：

```bash
# 方式 A：GitHub Desktop
1. 进入 Repository → Create Release Draft
2. 输入版本号（如 v1.0.0）
3. 点击 Publish release

# 方式 B：命令行
git tag v1.0.0
git push origin v1.0.0
```

> 📌 版本号格式必须为 `v*`（如 `v1.0.0`、`v1.1.0`），GitHub Actions 会自动识别并构建。

---

## 📥 安装与使用

### 下载 MSI 安装包

1. **进入 GitHub Releases**
   - 仓库主页 → Releases 标签页
   - 找到最新发布的版本

2. **下载安装包**
   - 点击 "FFk v1.0.0" 等发布标题
   - 在 Assets 部分找到 `FFk_1.0.0_x64_en-US.msi` 文件
   - 点击下载

### 安装应用

1. **双击 MSI 文件** → 按提示完成安装
2. **选择安装位置**（默认 Program Files）
3. **安装完成** → 自动生成桌面快捷方式

### 启动应用

- **桌面快捷方式**：双击 "FFk" 快捷方式
- **开始菜单**：搜索 "FFk" 并点击启动
- **命令行**：`"C:\Program Files\FFk\FFk.exe"`

### 应用功能

- 完整的会员管理、收银、预约等功能
- 自动连接云端数据库，数据实时同步
- 支持离线操作（短期缓存）

---

## 🔄 版本更新

### 更新步骤

1. **开发新功能** → 在本地测试
2. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Feature: Add new feature"
   git push origin main
   ```
3. **创建新版本标签**
   ```bash
   git tag v1.1.0
   git push origin v1.1.0
   ```
4. **等待 GitHub Actions 构建**（5-10 分钟）
5. **从 Releases 下载新版本 MSI**
6. **用户卸载旧版本** → **安装新版本**

### 版本号规范

按照语义化版本（Semantic Versioning）：

- `v1.0.0` → 主版本（Major）：重大功能或破坏性更改
- `v1.1.0` → 次版本（Minor）：新增功能
- `v1.0.1` → 补丁版本（Patch）：问题修复

---

## 🐛 常见问题

### Q1: 如何验证 GitHub Secrets 是否正确配置？

**A:** 进入 GitHub Actions 的 workflow 日志：
- 如果看到 "Build Tauri app" 步骤成功（✓），则配置正确
- 如果显示错误信息，检查 Secrets 值是否正确复制

### Q2: 构建失败如何排查？

**A:** 查看 GitHub Actions 日志：
1. 点击失败的 workflow run
2. 展开 "Build Tauri app" 步骤
3. 查看错误信息，常见原因：
   - Secrets 配置错误 → 重新检查 `.env` 值
   - 网络问题 → 重新运行 workflow
   - 代码错误 → 修复代码后重新推送

### Q3: MSI 安装包可以直接发给用户吗？

**A:** 可以。用户可以：
- 直接双击 MSI 文件安装
- 无需 Node.js、Rust 等开发工具
- 应用自动启动并连接云端数据库

### Q4: 如何实现自动更新？

**A:** 当前版本支持手动更新。如需自动更新功能，可在后续版本添加：
- Tauri 内置的 `updater` 模块
- 自动检测新版本并提示用户下载

### Q5: 支持 macOS 或 Linux 吗？

**A:** 当前 GitHub Actions 只配置了 Windows 构建。如需支持其他系统：
1. 修改 `.github/workflows/build.yml`
2. 添加 `runs-on: macos-latest` 或 `runs-on: ubuntu-latest`
3. 调整 bundle targets（`dmg` 或 `deb`）

---

## 📞 技术支持

如遇问题，检查以下内容：

1. **GitHub Actions 日志** → 查看具体错误信息
2. **项目 `.env` 文件** → 确保 Supabase 凭证正确
3. **Windows 系统** → 建议使用 Windows 10 或更高版本
4. **网络连接** → 确保能访问 GitHub 和云端数据库

---

## 📚 相关文件说明

| 文件 | 用途 |
|------|------|
| `.github/workflows/build.yml` | GitHub Actions 自动化构建脚本 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置（窗口、图标、打包设置） |
| `src-tauri/Cargo.toml` | Rust 依赖配置 |
| `src-tauri/src/main.rs` | Rust 入口程序 |
| `src-tauri/icons/` | 应用图标（ICO、PNG 等） |

---

祝你使用愉快！🎉
