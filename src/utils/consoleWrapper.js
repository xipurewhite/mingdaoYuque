/**
 * Console包装器
 * 可以在不修改现有代码的情况下控制console输出
 * 
 * 使用方法：在入口文件（index.js）顶部导入此文件
 * import './utils/consoleWrapper';
 * 
 * 然后修改下面的 ENABLE_DEBUG_LOGS 来控制是否输出调试日志
 */

/**
 * 是否启用调试日志
 * 发布版本时，请将此值改为 false
 */
const ENABLE_DEBUG_LOGS = false;

// 保存原始的console方法
const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  group: console.group.bind(console),
  groupEnd: console.groupEnd.bind(console),
  table: console.table.bind(console)
};

// 包装console方法
if (!ENABLE_DEBUG_LOGS) {
  // 生产模式：禁用调试日志，保留警告和错误
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  // warn 和 error 保留
  // console.warn 和 console.error 保持不变
} else {
  // 开发模式：保持原样
  // 或者可以在这里添加额外的开发工具
}

// 导出原始console（如果需要）
export { originalConsole };
