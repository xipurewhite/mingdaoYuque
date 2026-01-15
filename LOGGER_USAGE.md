# 控制台日志控制使用说明

## 概述

为了在发布版本中禁用开发调试的控制台输出，项目提供了两种方案：

1. **ConsoleWrapper（推荐，最简单）**: 无需修改现有代码，只需在入口文件导入即可
2. **Logger工具**: 需要替换所有console调用，但提供更精细的控制

## 方案一：ConsoleWrapper（推荐）

### 优点
- ✅ 无需修改任何现有代码
- ✅ 只需在入口文件添加一行导入
- ✅ 发布时只需修改一个配置项

### 使用方法

1. **在入口文件导入**（`src/index.js`）：

```javascript
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./style.less";
import "./styles/themes.css";
import "./utils/consoleWrapper"; // 添加这一行

const root = createRoot(document.querySelector("#app"));
root.render(<App />);
```

2. **发布版本时**，修改 `src/utils/consoleWrapper.js`：

```javascript
// 将此值改为 false 即可禁用所有调试日志
const ENABLE_DEBUG_LOGS = false;
```

### 工作原理

ConsoleWrapper 会包装原生的 `console` 对象，在生产模式下：
- `console.log`、`console.info`、`console.debug` 会被禁用（不输出）
- `console.warn` 和 `console.error` 会保留（仍会输出）

---

## 方案二：Logger工具

### 优点
- ✅ 提供更精细的日志级别控制
- ✅ 可以按需使用不同的日志方法
- ✅ 更好的代码可维护性

### 快速开始

### 1. 使用替换脚本（推荐）

运行以下命令自动替换所有 `console` 调用：

```bash
node scripts/replace-console.js
```

脚本会自动：
- 扫描 `src` 目录下的所有 `.js`、`.jsx`、`.ts`、`.tsx` 文件
- 将 `console.log` 替换为 `logger.debug`
- 将 `console.info` 替换为 `logger.info`
- 将 `console.warn` 替换为 `logger.warn`
- 将 `console.error` 替换为 `logger.error`
- 自动添加 `import logger from '...'` 语句

### 2. 手动使用

在需要使用日志的文件中：

```javascript
// 导入logger
import logger from './utils/logger';
// 或者从子目录导入
import logger from '../utils/logger';

// 使用logger
logger.debug('这是调试信息，生产环境不显示');
logger.info('这是信息，生产环境不显示');
logger.warn('这是警告，始终显示');
logger.error('这是错误，始终显示');
```

或者使用简化的导入方式：

```javascript
import { log, warn, error } from './utils/logger';

log('调试信息');
warn('警告信息');
error('错误信息');
```

## 日志级别

- **DEBUG** (`logger.debug`): 开发环境显示，生产环境不显示
- **INFO** (`logger.info`): 开发环境显示，生产环境不显示
- **WARN** (`logger.warn`): 始终显示
- **ERROR** (`logger.error`): 始终显示

## 生产环境判断

Logger 会自动判断是否为生产环境，判断逻辑（按优先级）：

1. 检查 `process.env.NODE_ENV === 'production'`
2. 检查全局变量 `__PRODUCTION__ === true`
3. 检查代码是否被压缩/混淆

## 手动控制生产模式

如果需要手动控制，可以修改 `src/utils/logger.js`：

```javascript
// 强制启用生产模式（禁用调试日志）
const isProduction = true;

// 或者强制启用开发模式（显示所有日志）
const isProduction = false;
```

## 注意事项

1. **替换脚本限制**: 自动替换脚本可能无法处理所有复杂情况，建议替换后检查关键文件
2. **导入路径**: 如果自动生成的导入路径不正确，请手动调整
3. **错误和警告**: 生产环境仍会显示 `warn` 和 `error` 级别的日志，这是为了便于排查问题
4. **性能**: Logger 在生产环境会跳过调试日志的执行，对性能影响极小

## 示例

### 替换前

```javascript
console.log('开始获取数据...');
console.log('参数:', params);
console.error('获取数据失败:', error);
```

### 替换后

```javascript
import logger from './utils/logger';

logger.debug('开始获取数据...');
logger.debug('参数:', params);
logger.error('获取数据失败:', error);
```

## 验证

替换完成后，可以通过以下方式验证：

1. 检查文件是否已添加 logger 导入
2. 检查 console 调用是否已替换为 logger 调用
3. 运行项目，确认功能正常
4. 构建生产版本，确认调试日志不再输出

---

## 推荐方案对比

| 特性 | ConsoleWrapper | Logger工具 |
|------|---------------|-----------|
| 修改代码量 | 只需1行导入 | 需要替换所有console调用 |
| 配置复杂度 | 简单（1个配置项） | 中等（需要理解日志级别） |
| 灵活性 | 基础（全局控制） | 高（可精细控制） |
| 适用场景 | 快速禁用调试日志 | 需要精细控制日志输出 |

**建议**: 
- 如果只是想快速禁用调试日志，使用 **ConsoleWrapper**
- 如果需要精细控制日志级别和输出，使用 **Logger工具**
