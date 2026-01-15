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
   * @param {string} viewId - 视图ID（可选，用于区分不同视图的缓存）
   */
  cacheChildren(worksheetId, nodeId, children, ttl = this.defaultTTL, viewId = null) {
    // 如果提供了 viewId，使用 viewId 区分不同视图的缓存
    // 否则使用 'children' 作为占位符（保持向后兼容）
    const keyViewId = viewId || 'children';
    const key = this.generateKey(worksheetId, keyViewId, 'node', nodeId);
    this.set(key, children, ttl);
    console.log(`[缓存] 缓存子节点: ${key}, 数量: ${children.length}, TTL: ${ttl}ms`);
  }
  
  /**
   * 获取缓存的子节点数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} nodeId - 节点ID
   * @param {string} viewId - 视图ID（可选，用于区分不同视图的缓存）
   * @returns {array|null} 子节点数据
   */
  getCachedChildren(worksheetId, nodeId, viewId = null) {
    // 如果提供了 viewId，使用 viewId 查找缓存
    // 否则使用 'children' 作为占位符（保持向后兼容）
    const keyViewId = viewId || 'children';
    const key = this.generateKey(worksheetId, keyViewId, 'node', nodeId);
    const cached = this.get(key);
    if (cached) {
      console.log(`[缓存] 命中子节点缓存: ${key}, 数量: ${cached.length}`);
    }
    return cached;
  }
  
  /**
   * 清除特定节点的子节点缓存
   * @param {string} worksheetId - 工作表ID
   * @param {string} nodeId - 节点ID
   * @param {string} viewId - 视图ID（可选）
   */
  clearNodeChildrenCache(worksheetId, nodeId, viewId = null) {
    // 如果提供了 viewId，只清除该视图的缓存
    if (viewId) {
      const key = this.generateKey(worksheetId, viewId, 'node', nodeId);
      if (this.cache.has(key)) {
        this.delete(key);
        console.log(`[缓存] 清除节点子节点缓存: ${key}`);
      }
    } else {
      // 如果没有提供 viewId，清除所有可能的子节点缓存（包括使用 'children' 作为占位符的）
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        // 匹配格式: worksheetId_*_node_nodeId
        if (key.startsWith(`${worksheetId}_`) && key.endsWith(`_node_${nodeId}`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.delete(key);
        console.log(`[缓存] 清除节点子节点缓存: ${key}`);
      });
    }
  }
  
  /**
   * 缓存文档数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @param {object} document - 文档数据
   * @param {number} ttl - 过期时间
   * @param {string} viewId - 视图ID（可选，用于区分不同视图的缓存）
   */
  cacheDocument(worksheetId, documentId, document, ttl = this.defaultTTL, viewId = null) {
    // 如果提供了 viewId，使用 viewId 区分不同视图的缓存
    // 否则使用 'document' 作为占位符（保持向后兼容）
    const keyViewId = viewId || 'document';
    const key = this.generateKey(worksheetId, keyViewId, 'data', documentId);
    this.set(key, document, ttl);
    console.log(`[缓存] 缓存文档: ${key}, TTL: ${ttl}ms`);
  }
  
  /**
   * 获取缓存的文档数据
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @param {string} viewId - 视图ID（可选，用于区分不同视图的缓存）
   * @returns {object|null} 文档数据
   */
  getCachedDocument(worksheetId, documentId, viewId = null) {
    // 如果提供了 viewId，使用 viewId 查找缓存
    // 否则使用 'document' 作为占位符（保持向后兼容）
    const keyViewId = viewId || 'document';
    const key = this.generateKey(worksheetId, keyViewId, 'data', documentId);
    const cached = this.get(key);
    if (cached) {
      console.log(`[缓存] 命中文档缓存: ${key}`);
    }
    return cached;
  }
  
  /**
   * 清除特定文档的缓存
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @param {string} viewId - 视图ID（可选）
   */
  clearDocumentCache(worksheetId, documentId, viewId = null) {
    // 如果提供了 viewId，只清除该视图的缓存
    if (viewId) {
      const key = this.generateKey(worksheetId, viewId, 'data', documentId);
      if (this.cache.has(key)) {
        this.delete(key);
        console.log(`[缓存] 清除文档缓存: ${key}`);
      }
    } else {
      // 如果没有提供 viewId，清除所有可能的文档缓存（包括使用 'document' 作为占位符的）
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        // 匹配格式: worksheetId_*_data_documentId
        if (key.startsWith(`${worksheetId}_`) && key.endsWith(`_data_${documentId}`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => {
        this.delete(key);
        console.log(`[缓存] 清除文档缓存: ${key}`);
      });
    }
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
   * @param {string|Date} lastUpdateTime - 最后更新时间（可以是字符串或Date对象）
   * @param {object} options - 选项对象
   * @param {boolean} options.checkDocumentTimes - 是否检查每个文档的更新时间（默认: false，只检查整体更新时间）
   * @param {array} options.documents - 文档数组（当 checkDocumentTimes 为 true 时必需）
   * @returns {boolean} 缓存是否有效
   */
  isCacheValid(worksheetId, viewId, lastUpdateTime, options = {}) {
    const { checkDocumentTimes = false, documents = [] } = options;
    const cachedData = this.getCachedTreeStructure(worksheetId, viewId);
    
    if (!cachedData || !cachedData.lastUpdateTime) {
      console.log('[缓存验证] 没有缓存的树状结构或没有更新时间');
      return false;
    }
    
    // 如果提供了最后更新时间，检查缓存时间是否早于数据更新时间
    if (lastUpdateTime) {
      const cachedTime = new Date(cachedData.lastUpdateTime);
      const dataTime = new Date(lastUpdateTime);
      
      if (cachedTime < dataTime) {
        console.log('[缓存验证] 缓存时间早于数据更新时间，缓存无效:', {
          cachedTime: cachedTime.toISOString(),
          dataTime: dataTime.toISOString()
        });
        return false;
      }
    }
    
    // 如果启用检查每个文档的更新时间，逐一对比
    if (checkDocumentTimes && documents && documents.length > 0 && cachedData.nodeMap) {
      const nodeMap = cachedData.nodeMap;
      let allDocumentsValid = true;
      
      for (const doc of documents) {
        if (!doc || !doc.id) continue;
        
        const cachedNode = nodeMap.get(doc.id);
        if (!cachedNode) {
          // 文档不在缓存中，缓存可能不完整
          console.log(`[缓存验证] 文档 ${doc.id} 不在缓存中，缓存可能不完整`);
          allDocumentsValid = false;
          break;
        }
        
        // 检查文档的更新时间（如果有）
        if (doc.updateTime || doc.utime) {
          const docUpdateTime = new Date(doc.updateTime || doc.utime);
          const cachedDocTime = cachedNode.rawDocument?.utime || cachedNode.rawRecord?.utime;
          
          if (cachedDocTime) {
            const cachedTime = new Date(cachedDocTime);
            if (cachedTime < docUpdateTime) {
              console.log(`[缓存验证] 文档 ${doc.id} 的缓存时间早于实际更新时间，缓存无效:`, {
                cachedTime: cachedTime.toISOString(),
                docUpdateTime: docUpdateTime.toISOString()
              });
              allDocumentsValid = false;
              break;
            }
          }
        }
      }
      
      if (!allDocumentsValid) {
        return false;
      }
    }
    
    console.log('[缓存验证] 缓存有效');
    return true;
  }

  /**
   * 清除指定工作表的所有相关缓存
   * @param {string} worksheetId - 工作表ID
   * @param {string} viewId - 视图ID（可选）
   * @param {object} options - 选项对象
   * @param {boolean} options.includeChildren - 是否清除子节点缓存（默认: true）
   * @param {boolean} options.includeDocuments - 是否清除文档缓存（默认: true）
   * @param {boolean} options.includeTreeStructure - 是否清除树状结构缓存（默认: true）
   * @param {boolean} options.includeExpandedState - 是否清除展开状态缓存（默认: false）
   */
  clearWorksheetCache(worksheetId, viewId = null, options = {}) {
    if (!worksheetId) {
      console.warn('[缓存] clearWorksheetCache: worksheetId 为空');
      return;
    }
    
    const {
      includeChildren = true,
      includeDocuments = true,
      includeTreeStructure = true,
      includeExpandedState = false
    } = options;
    
    const keysToDelete = [];
    
    // 遍历所有缓存键
    for (const key of this.cache.keys()) {
      let shouldDelete = false;
      
      if (viewId) {
        // 如果指定了 viewId，清除该视图的缓存和该工作表的相关缓存
        // 视图缓存格式: worksheetId_viewId_type_key
        // 子节点缓存格式: worksheetId_*_node_nodeId (包括 worksheetId_children_node_nodeId 和 worksheetId_viewId_node_nodeId)
        // 文档缓存格式: worksheetId_*_data_documentId (包括 worksheetId_document_data_documentId 和 worksheetId_viewId_data_documentId)
        
        // 清除该视图的所有缓存
        if (key.startsWith(`${worksheetId}_${viewId}_`)) {
          shouldDelete = true;
        }
        
        // 清除子节点缓存（如果启用）
        if (includeChildren && key.startsWith(`${worksheetId}_`) && key.includes('_node_')) {
          shouldDelete = true;
        }
        
        // 清除文档缓存（如果启用）
        if (includeDocuments && key.startsWith(`${worksheetId}_`) && key.includes('_data_')) {
          shouldDelete = true;
        }
      } else {
        // 如果未指定 viewId，清除所有该工作表的缓存
        if (key.startsWith(`${worksheetId}_`)) {
          shouldDelete = true;
        }
      }
      
      // 根据选项决定是否清除特定类型的缓存
      if (shouldDelete) {
        // 树状结构缓存
        if (!includeTreeStructure && key.includes('_tree_structure')) {
          shouldDelete = false;
        }
        // 展开状态缓存
        if (!includeExpandedState && key.includes('_expanded_state')) {
          shouldDelete = false;
        }
        // 子节点缓存
        if (!includeChildren && key.includes('_node_')) {
          shouldDelete = false;
        }
        // 文档缓存
        if (!includeDocuments && key.includes('_data_') && !key.includes('_tree_') && !key.includes('_expanded_')) {
          shouldDelete = false;
        }
      }
      
      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }
    
    // 删除匹配的缓存
    keysToDelete.forEach(key => {
      this.delete(key);
    });
    
    console.log(`[缓存] 已清除 ${keysToDelete.length} 个缓存条目（工作表ID: ${worksheetId}${viewId ? `, 视图ID: ${viewId}` : ''}）`, {
      includeChildren,
      includeDocuments,
      includeTreeStructure,
      includeExpandedState
    });
    if (keysToDelete.length > 0 && keysToDelete.length <= 20) {
      console.log('[缓存] 清除的缓存键:', keysToDelete);
    } else if (keysToDelete.length > 20) {
      console.log(`[缓存] 清除的缓存键（前20个）:`, keysToDelete.slice(0, 20), `... (共${keysToDelete.length}个)`);
    }
  }
  
  /**
   * 清除特定文档的所有相关缓存（包括文档本身、父节点的子节点缓存、树状结构缓存）
   * @param {string} worksheetId - 工作表ID
   * @param {string} documentId - 文档ID
   * @param {string} viewId - 视图ID（可选）
   * @param {object} options - 选项对象
   * @param {boolean} options.clearParentChildrenCache - 是否清除父节点的子节点缓存（默认: true）
   * @param {boolean} options.clearTreeStructure - 是否清除树状结构缓存（默认: true）
   */
  clearDocumentRelatedCache(worksheetId, documentId, viewId = null, options = {}) {
    if (!worksheetId || !documentId) {
      console.warn('[缓存] clearDocumentRelatedCache: worksheetId 或 documentId 为空');
      return;
    }
    
    const {
      clearParentChildrenCache = true,
      clearTreeStructure = true
    } = options;
    
    const keysToDelete = [];
    
    // 清除文档本身的缓存
    if (viewId) {
      const docKey = this.generateKey(worksheetId, viewId, 'data', documentId);
      if (this.cache.has(docKey)) {
        keysToDelete.push(docKey);
      }
    } else {
      // 清除所有可能的文档缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${worksheetId}_`) && key.endsWith(`_data_${documentId}`)) {
          keysToDelete.push(key);
        }
      }
    }
    
    // 清除父节点的子节点缓存（如果启用）
    if (clearParentChildrenCache) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${worksheetId}_`) && key.includes('_node_')) {
          const cachedChildren = this.cache.get(key);
          if (Array.isArray(cachedChildren)) {
            // 检查缓存的子节点中是否包含该文档
            const hasDocument = cachedChildren.some(child => child.id === documentId);
            if (hasDocument) {
              keysToDelete.push(key);
              console.log(`[缓存] 清除父节点的子节点缓存（包含文档 ${documentId}）: ${key}`);
            }
          }
        }
      }
    }
    
    // 清除树状结构缓存（如果启用）
    if (clearTreeStructure) {
      if (viewId) {
        const treeKey = this.generateKey(worksheetId, viewId, 'tree', 'structure');
        if (this.cache.has(treeKey)) {
          keysToDelete.push(treeKey);
        }
      } else {
        // 清除所有可能的树状结构缓存
        for (const key of this.cache.keys()) {
          if (key.startsWith(`${worksheetId}_`) && key.includes('_tree_structure')) {
            keysToDelete.push(key);
          }
        }
      }
    }
    
    // 删除匹配的缓存
    keysToDelete.forEach(key => {
      this.delete(key);
    });
    
    console.log(`[缓存] 已清除文档 ${documentId} 的相关缓存，共 ${keysToDelete.length} 个缓存条目`, {
      worksheetId,
      viewId,
      clearParentChildrenCache,
      clearTreeStructure
    });
    if (keysToDelete.length > 0 && keysToDelete.length <= 10) {
      console.log('[缓存] 清除的缓存键:', keysToDelete);
    } else if (keysToDelete.length > 10) {
      console.log(`[缓存] 清除的缓存键（前10个）:`, keysToDelete.slice(0, 10), `... (共${keysToDelete.length}个)`);
    }
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
