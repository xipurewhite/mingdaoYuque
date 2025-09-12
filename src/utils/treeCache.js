/**
 * 树状结构缓存管理器
 */

class TreeCacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // 过期时间
    this.defaultTTL = 5 * 60 * 1000; // 默认5分钟过期
  }
  
  /**
   * 生成缓存键
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @param {string} type - 缓存类型
   * @param {string} key - 具体键
   * @returns {string} 缓存键
   */
  generateKey(worksheetId, viewId, type, key) {
    return `${worksheetId}_${viewId}_${type}_${key}`;
  }
  
  /**
   * 设置缓存
   * @param {string} cacheKey - 缓存键
   * @param {any} data - 缓存数据
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(cacheKey, data, ttl = this.defaultTTL) {
    this.cache.set(cacheKey, data);
    this.ttl.set(cacheKey, Date.now() + ttl);
  }
  
  /**
   * 获取缓存
   * @param {string} cacheKey - 缓存键
   * @returns {any|null} 缓存数据
   */
  get(cacheKey) {
    const expireTime = this.ttl.get(cacheKey);
    if (!expireTime || Date.now() > expireTime) {
      this.delete(cacheKey);
      return null;
    }
    return this.cache.get(cacheKey) || null;
  }
  
  /**
   * 删除缓存
   * @param {string} cacheKey - 缓存键
   */
  delete(cacheKey) {
    this.cache.delete(cacheKey);
    this.ttl.delete(cacheKey);
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    for (const [key, expireTime] of this.ttl.entries()) {
      if (now > expireTime) {
        this.delete(key);
      }
    }
  }
  
  /**
   * 缓存树状结构
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @param {object} treeData - 树状结构数据
   * @param {number} ttl - 过期时间
   */
  cacheTreeStructure(worksheetId, viewId, treeData, ttl = this.defaultTTL) {
    const key = this.generateKey(worksheetId, viewId, 'tree', 'structure');
    this.set(key, treeData, ttl);
  }
  
  /**
   * 获取缓存的树状结构
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @returns {object|null} 树状结构数据
   */
  getCachedTreeStructure(worksheetId, viewId) {
    const key = this.generateKey(worksheetId, viewId, 'tree', 'structure');
    return this.get(key);
  }
  
  /**
   * 缓存子节点数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} nodeId - 节点ID
   * @param {array} children - 子节点数据
   * @param {number} ttl - 过期时间
   */
  cacheChildren(worksheetId, nodeId, children, ttl = this.defaultTTL) {
    const key = this.generateKey(worksheetId, 'children', 'node', nodeId);
    this.set(key, children, ttl);
  }
  
  /**
   * 获取缓存的子节点数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} nodeId - 节点ID
   * @returns {array|null} 子节点数据
   */
  getCachedChildren(worksheetId, nodeId) {
    const key = this.generateKey(worksheetId, 'children', 'node', nodeId);
    return this.get(key);
  }
  
  /**
   * 缓存文档数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @param {object} document - 文档数据
   * @param {number} ttl - 过期时间
   */
  cacheDocument(worksheetId, documentId, document, ttl = this.defaultTTL) {
    const key = this.generateKey(worksheetId, 'document', 'data', documentId);
    this.set(key, document, ttl);
  }
  
  /**
   * 获取缓存的文档数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @returns {object|null} 文档数据
   */
  getCachedDocument(worksheetId, documentId) {
    const key = this.generateKey(worksheetId, 'document', 'data', documentId);
    return this.get(key);
  }
  
  /**
   * 缓存展开状态
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @param {object} expandedState - 展开状态
   * @param {number} ttl - 过期时间
   */
  cacheExpandedState(worksheetId, viewId, expandedState, ttl = 24 * 60 * 60 * 1000) { // 24小时
    const key = this.generateKey(worksheetId, viewId, 'expanded', 'state');
    this.set(key, expandedState, ttl);
  }
  
  /**
   * 获取缓存的展开状态
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @returns {object|null} 展开状态
   */
  getCachedExpandedState(worksheetId, viewId) {
    const key = this.generateKey(worksheetId, viewId, 'expanded', 'state');
    return this.get(key);
  }
  
  /**
   * 基于数据更新时间判断缓存是否有效
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID
   * @param {string} lastUpdateTime - 最后更新时间
   * @returns {boolean} 缓存是否有效
   */
  isCacheValid(worksheetId, viewId, lastUpdateTime) {
    const cachedData = this.getCachedTreeStructure(worksheetId, viewId);
    if (!cachedData || !cachedData.lastUpdateTime) {
      return false;
    }
    
    return new Date(cachedData.lastUpdateTime) >= new Date(lastUpdateTime);
  }
  
  /**
   * 获取缓存统计信息
   * @returns {object} 缓存统计
   */
  getStats() {
    this.cleanup(); // 清理过期缓存
    
    return {
      totalEntries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }
  
  /**
   * 估算内存使用量
   * @returns {number} 估算的内存使用量（字节）
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // 字符串长度 * 2字节
      totalSize += JSON.stringify(value).length * 2; // JSON字符串长度 * 2字节
    }
    return totalSize;
  }
  
  /**
   * 获取最旧的缓存条目
   * @returns {object|null} 最旧的缓存条目信息
   */
  getOldestEntry() {
    let oldestTime = Infinity;
    let oldestKey = null;
    
    for (const [key, expireTime] of this.ttl.entries()) {
      const createTime = expireTime - this.defaultTTL;
      if (createTime < oldestTime) {
        oldestTime = createTime;
        oldestKey = key;
      }
    }
    
    return oldestKey ? {
      key: oldestKey,
      createTime: new Date(oldestTime),
      expireTime: new Date(this.ttl.get(oldestKey))
    } : null;
  }
  
  /**
   * 获取最新的缓存条目
   * @returns {object|null} 最新的缓存条目信息
   */
  getNewestEntry() {
    let newestTime = 0;
    let newestKey = null;
    
    for (const [key, expireTime] of this.ttl.entries()) {
      const createTime = expireTime - this.defaultTTL;
      if (createTime > newestTime) {
        newestTime = createTime;
        newestKey = key;
      }
    }
    
    return newestKey ? {
      key: newestKey,
      createTime: new Date(newestTime),
      expireTime: new Date(this.ttl.get(newestKey))
    } : null;
  }
}

// 创建全局缓存管理器实例
export const treeCache = new TreeCacheManager();

// 定期清理过期缓存（每5分钟）
setInterval(() => {
  treeCache.cleanup();
}, 5 * 60 * 1000);

export default treeCache;
