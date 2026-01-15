/**
 * 日志工具
 * 在开发环境输出日志，在生产环境禁用调试日志（保留error和warn）
 * 
 * 使用方法：
 * import logger from './utils/logger';
 * logger.debug('调试信息');  // 开发环境显示，生产环境不显示
 * logger.warn('警告信息');   // 始终显示
 * logger.error('错误信息');  // 始终显示
 * 
 * 或者使用简化的导入：
 * import { log, warn, error } from './utils/logger';
 * log('调试信息');
 */

/**
 * 生产模式配置
 * 设置为 true 时，禁用所有调试日志（只保留 warn 和 error）
 * 设置为 false 时，显示所有日志
 * 
 * 发布版本时，请将此值改为 true
 */
const FORCE_PRODUCTION_MODE = false;

// 判断是否为生产环境
const isProduction = (() => {
  // 如果强制设置了生产模式，直接返回
  if (FORCE_PRODUCTION_MODE) {
    return true;
  }
  
  // 优先检查环境变量
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') {
    return true;
  }
  
  // 检查全局变量（可以在构建时注入）
  if (typeof __PRODUCTION__ !== 'undefined') {
    return __PRODUCTION__ === true;
  }
  
  // 检查代码是否被压缩（通过函数名长度判断，简单但有效）
  // 如果代码被压缩，函数名通常很短
  try {
    const testFunc = function veryLongFunctionNameToTestIfCodeIsMinified() {};
    const isMinified = testFunc.name.length < 20;
    if (isMinified) return true;
  } catch (e) {
    // 忽略错误
  }
  
  // 默认开发环境
  return false;
})();

/**
 * 日志级别枚举
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * 当前日志级别（生产环境只显示WARN和ERROR）
 */
const currentLogLevel = isProduction ? LogLevel.WARN : LogLevel.DEBUG;

/**
 * 日志工具类
 */
class Logger {
  /**
   * 调试日志（开发环境显示）
   */
  debug(...args) {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.log(...args);
    }
  }

  /**
   * 信息日志（开发环境显示）
   */
  info(...args) {
    if (currentLogLevel <= LogLevel.INFO) {
      console.info(...args);
    }
  }

  /**
   * 警告日志（始终显示）
   */
  warn(...args) {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(...args);
    }
  }

  /**
   * 错误日志（始终显示）
   */
  error(...args) {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(...args);
    }
  }

  /**
   * 日志分组（开发环境显示）
   */
  group(...args) {
    if (!isProduction) {
      console.group(...args);
    }
  }

  /**
   * 结束日志分组（开发环境显示）
   */
  groupEnd() {
    if (!isProduction) {
      console.groupEnd();
    }
  }

  /**
   * 表格日志（开发环境显示）
   */
  table(...args) {
    if (!isProduction) {
      console.table(...args);
    }
  }
}

// 创建默认logger实例
const logger = new Logger();

// 导出默认logger实例和类
export default logger;
export { Logger };

// 为了兼容性，也导出常用的日志方法
export const log = (...args) => logger.debug(...args);
export const info = (...args) => logger.info(...args);
export const warn = (...args) => logger.warn(...args);
export const error = (...args) => logger.error(...args);
