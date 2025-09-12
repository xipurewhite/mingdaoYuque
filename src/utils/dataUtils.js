/**
 * 明道云数据获取和处理工具函数
 */

import { getEnvValue as getEnvValueFromHandler } from './envHandler';
import { getConfig } from './configManager';

/**
 * 获取并处理工作表数据
 * @param {object} api - 明道云API对象
 * @param {object} config - 配置对象
 * @param {object} env - 环境变量对象
 * @returns {Promise<array>} 处理后的文档数组
 */
export async function fetchDocuments(api, config, env) {
  try {
    console.log('开始获取工作表数据...');
    
    // 获取用户配置的字段ID（统一使用 envHandler 提供的读取）
    const titleFieldId = getEnvValueFromHandler('titleFieldId');
    const contentFieldId = getEnvValueFromHandler('contentFieldId');
    const categoryFieldId = getEnvValueFromHandler('categoryFieldId');
    const parentFieldId = getEnvValueFromHandler('parent_id');
    const childrenFieldId = getEnvValueFromHandler('children');
    
    console.log('字段ID配置:', {
      titleFieldId,
      contentFieldId,
      categoryFieldId,
      parentFieldId,
      childrenFieldId
    });
    
    // 获取工作表数据（使用配置的最大记录数，且不统计总数）
    const result = await api.getFilterRows({
      worksheetId: config.worksheetId,
      viewId: config.viewId,
      pageSize: getConfig('display.maxRecords', 100),
      notGetTotal: true
    });
    
    console.log('原始数据结果:', result);
    
    if (!result || !result.data) {
      console.warn('未获取到数据');
      return [];
    }
    
    const records = result.data;
    console.log('记录数量:', records.length);
    
    // 处理数据
    const documents = records.map((record, index) => {
      try {
        // 获取标题
        const title = record[titleFieldId] || `文档${index + 1}`;
        
        // 获取富文本内容
        const content = record[contentFieldId] || '';
        
        // 获取分类信息
        let category = null;
        if (record[categoryFieldId]) {
          try {
            category = typeof record[categoryFieldId] === 'string' 
              ? JSON.parse(record[categoryFieldId]) 
              : record[categoryFieldId];
          } catch (err) {
            console.error('解析分类信息失败:', err);
          }
        }
        
        // 获取系统字段
        const createTime = record.ctime;
        const updateTime = record.utime;
        
        // 获取创建人
        let creator = '未知';
        try {
          if (record.caid) {
            const creatorData = typeof record.caid === 'string' 
              ? JSON.parse(record.caid) 
              : record.caid;
            creator = creatorData[0]?.fullname || '未知';
          }
        } catch (err) {
          console.error('解析创建人信息失败:', err);
        }
        
        // 获取最后修改人
        let lastModifier = '未知';
        try {
          if (record.uaid) {
            const modifierData = typeof record.uaid === 'string' 
              ? JSON.parse(record.uaid) 
              : record.uaid;
            lastModifier = modifierData[0]?.fullname || '未知';
          }
        } catch (err) {
          console.error('解析最后修改人信息失败:', err);
        }
        
        return {
          id: record.rowid,
          title,
          content,
          category,
          createTime,
          updateTime,
          creator,
          uaid: record.uaid, // 保留原始uaid数据
          utime: record.utime, // 保留原始utime数据
          rawRecord: record, // 保留原始记录用于调试
          // 关联记录字段
          parentId: record[parentFieldId] || null,
          children: record[childrenFieldId] || null
        };
      } catch (err) {
        console.error(`处理记录${index}失败:`, err);
        return {
          id: record.rowid || `error_${index}`,
          title: `错误记录${index + 1}`,
          content: '',
          category: null,
          createTime: '',
          updateTime: '',
          creator: '未知',
          error: err.message
        };
      }
    });
    
    console.log('处理后的文档数据:', documents);
    
    // 调试：检查第一个文档的系统字段
    if (documents.length > 0) {
      const firstDoc = documents[0];
      console.log('第一个文档的系统字段调试:', {
        uaid: firstDoc.uaid,
        utime: firstDoc.utime,
        caid: firstDoc.rawRecord?.caid,
        ctime: firstDoc.rawRecord?.ctime,
        rawRecordKeys: Object.keys(firstDoc.rawRecord || {})
      });
    }
    
    return documents;
    
  } catch (error) {
    console.error('获取文档数据失败:', error);
    throw error;
  }
}

/**
 * 基于级联选择字段构建文档分类
 * @param {array} documents - 文档数组
 * @param {string} categoryFieldId - 分类字段ID
 * @returns {object} 分类结构
 */
export function buildDocumentCategories(documents, categoryFieldId) {
  const categories = {};
  
  documents.forEach(doc => {
    if (!doc.category) {
      // 没有分类的文档放到"未分类"中
      if (!categories['未分类']) {
        categories['未分类'] = {
          name: '未分类',
          documents: []
        };
      }
      categories['未分类'].documents.push(doc);
      return;
    }
    
    const { level1, level2, level3 } = doc.category;
    
    // 构建层级结构
    if (!categories[level1]) {
      categories[level1] = {
        name: level1,
        children: {},
        documents: []
      };
    }
    
    if (level2 && !categories[level1].children[level2]) {
      categories[level1].children[level2] = {
        name: level2,
        children: {},
        documents: []
      };
    }
    
    if (level3 && level2) {
      if (!categories[level1].children[level2].children[level3]) {
        categories[level1].children[level2].children[level3] = {
          name: level3,
          documents: []
        };
      }
      categories[level1].children[level2].children[level3].documents.push(doc);
    } else if (level2) {
      categories[level1].children[level2].documents.push(doc);
    } else {
      // 只有一级分类
      categories[level1].documents.push(doc);
    }
  });
  
  return categories;
}

/**
 * 解析富文本内容生成大纲
 * @param {string} richTextContent - 富文本内容
 * @returns {array} 大纲数组
 */
export function generateOutline(richTextContent) {
  try {
    if (!richTextContent) return [];
    
    const outline = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(richTextContent, 'text/html');
    
    // 查找所有标题标签
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1)); // h1=1, h2=2, etc.
      const text = heading.textContent.trim();
      const id = `heading-${index}`;
      
      // 为标题添加ID以便跳转
      heading.id = id;
      
      outline.push({
        id,
        level,
        text,
        element: heading
      });
    });
    
    return outline;
  } catch (err) {
    console.error('生成大纲失败:', err);
    return [];
  }
}

/**
 * 为富文本内容中的标题添加ID
 * @param {string} richTextContent - 富文本内容
 * @returns {string} 添加了ID的HTML内容
 */
export function addHeadingIds(richTextContent) {
  try {
    if (!richTextContent) return '';
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(richTextContent, 'text/html');
    
    // 查找所有标题标签
    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
    });
    
    // 返回修改后的HTML
    return doc.body.innerHTML;
  } catch (err) {
    console.error('添加标题ID失败:', err);
    return richTextContent;
  }
}

/**
 * 安全处理HTML内容
 * @param {string} content - HTML内容
 * @returns {string} 安全的HTML内容
 */
export function sanitizeHTML(content) {
  if (!content) return '';
  
  // 简单的XSS防护，实际项目中建议使用DOMPurify
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (err) {
    console.error('日期格式化失败:', err);
    return dateString;
  }
}

/**
 * 搜索文档
 * @param {array} documents - 文档数组
 * @param {string} keyword - 搜索关键词
 * @returns {array} 搜索结果
 */
export function searchDocuments(documents, keyword) {
  if (!keyword || !keyword.trim()) return documents;
  
  const lowerKeyword = keyword.toLowerCase();
  
  return documents.filter(doc => {
    // 搜索标题
    if (doc.title && doc.title.toLowerCase().includes(lowerKeyword)) {
      return true;
    }
    
    // 搜索内容
    if (doc.content && doc.content.toLowerCase().includes(lowerKeyword)) {
      return true;
    }
    
    return false;
  });
}

/**
 * 解析关联记录字段数据
 * @param {any} value - 关联记录字段值
 * @returns {array} 解析后的关联记录数组
 */
export function parseRelationData(value) {
  try {
    // 如果值是数字，表示关联记录数量，返回空数组（没有具体记录）
    if (!isNaN(value) && String(value).trim() !== '') {
      console.log('关联记录字段值为数字，表示记录数量:', value);
      return [];
    }
    
    // 尝试解析JSON
    if (!value) return [];
    const relations = typeof value === 'string' ? JSON.parse(value) : value;
    
    if (!Array.isArray(relations)) {
      console.log('关联记录字段不是数组格式:', relations);
      return [];
    }
    
    return relations.map(item => {
      let sourceValue = {};
      
      if (item.sourcevalue) {
        try {
          sourceValue = typeof item.sourcevalue === 'string' 
            ? JSON.parse(item.sourcevalue) 
            : item.sourcevalue;
        } catch (e) {
          console.error("解析sourcevalue失败:", e);
        }
      }
      
      return {
        sid: item.sid || '',        // 关联记录ID
        name: item.name || '',      // 关联记录名称
        link: item.link || '',      // 关联记录链接
        rowid: sourceValue.rowid || '',  // 从sourcevalue获取的记录ID
        wsid: sourceValue.wsid || '',    // 从sourcevalue获取的工作表ID
        ...item
      };
    });
  } catch (err) {
    console.error("解析关联记录字段失败:", err);
    return [];
  }
}

/**
 * 构建基于关联记录的树状结构
 * @param {array} documents - 文档数组
 * @param {string} parentFieldId - 父级关联记录字段ID
 * @param {string} childrenFieldId - 子级关联记录字段ID
 * @returns {object} 树状结构
 */
export function buildRelationTree(documents, parentFieldId, childrenFieldId) {
  console.log('开始构建关联记录树状结构...');
  console.log('参数:', { documentsCount: documents.length, parentFieldId, childrenFieldId });
  
  // 参数验证
  if (!documents || !Array.isArray(documents)) {
    console.error('documents参数无效:', documents);
    return { nodeMap: new Map(), rootNodes: [], orphanNodes: [] };
  }
  
  if (!parentFieldId || !childrenFieldId) {
    console.error('关联记录字段ID无效:', { parentFieldId, childrenFieldId });
    return { nodeMap: new Map(), rootNodes: [], orphanNodes: [] };
  }
  
  // 创建节点映射表
  const nodeMap = new Map();
  const rootNodes = [];
  const orphanNodes = [];
  const errors = [];
  
  // 第一遍：创建所有节点
  documents.forEach((doc, index) => {
    try {
      // 验证文档数据
      if (!doc || !doc.id) {
        errors.push(`文档${index}缺少必要字段: id`);
        return;
      }
      
      const node = {
        id: doc.id,
        title: doc.title || '无标题',
        content: doc.content || '',
        parentId: null,
        children: [],
        level: 0,
        isExpanded: false,
        isLoaded: false,
        hasChildren: false,
        rawDocument: doc
      };
      
      // 解析父级关联记录
      if (doc.rawRecord && doc.rawRecord[parentFieldId]) {
        try {
          const parentRelations = parseRelationData(doc.rawRecord[parentFieldId]);
          if (parentRelations.length > 0) {
            // 取第一个父级作为父节点
            node.parentId = parentRelations[0].rowid;
          }
        } catch (err) {
          errors.push(`解析文档${doc.id}的父级关联记录失败: ${err.message}`);
        }
      }
      
      // 解析子级关联记录
      if (doc.rawRecord && doc.rawRecord[childrenFieldId]) {
        try {
          const childrenRelations = parseRelationData(doc.rawRecord[childrenFieldId]);
          node.hasChildren = childrenRelations.length > 0;
          node.children = childrenRelations.map(child => child.rowid);
        } catch (err) {
          errors.push(`解析文档${doc.id}的子级关联记录失败: ${err.message}`);
        }
      }
      
      nodeMap.set(doc.id, node);
    } catch (err) {
      errors.push(`处理文档${index}失败: ${err.message}`);
    }
  });
  
  console.log('节点映射表创建完成，节点数量:', nodeMap.size);
  
  // 第二遍：建立父子关系
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId);
      parentNode.children.push(node.id);
      parentNode.hasChildren = true;
      node.level = parentNode.level + 1;
    } else if (node.parentId) {
      // 父节点不存在，标记为孤儿节点
      orphanNodes.push(node);
      node.parentId = null;
    } else {
      // 没有父节点，是根节点
      rootNodes.push(node);
    }
  });
  
  // 处理孤儿节点
  if (orphanNodes.length > 0) {
    console.log('发现孤儿节点:', orphanNodes.length);
    const orphanGroup = {
      id: 'orphan-group',
      title: '未分类文档',
      children: orphanNodes.map(node => node.id),
      level: 0,
      isExpanded: false,
      isLoaded: true,
      hasChildren: orphanNodes.length > 0,
      isGroup: true
    };
    rootNodes.push(orphanGroup);
  }
  
  // 记录错误信息
  if (errors.length > 0) {
    console.warn('构建树状结构时发现错误:', errors);
  }
  
  console.log('树状结构构建完成:', {
    rootNodes: rootNodes.length,
    totalNodes: nodeMap.size,
    orphanNodes: orphanNodes.length,
    errors: errors.length
  });
  
  return {
    nodeMap,
    rootNodes,
    orphanNodes,
    errors,
    buildTime: new Date().toISOString()
  };
}

/**
 * 懒加载子节点
 * @param {object} api - 明道云API对象
 * @param {object} config - 配置对象
 * @param {string} nodeId - 节点ID
 * @param {string} childrenFieldId - 子级关联记录字段ID
 * @returns {Promise<array>} 子节点数组
 */
export async function loadChildNodes(api, config, nodeId, childrenFieldId) {
  try {
    // 参数验证
    if (!api || !config || !nodeId || !childrenFieldId) {
      throw new Error('懒加载参数不完整');
    }
    
    if (!config.worksheetId) {
      throw new Error('缺少工作表ID配置');
    }
    
    console.log('开始懒加载子节点:', { nodeId, childrenFieldId });
    
    const result = await api.getRowRelationRows({
      worksheetId: config.worksheetId,
      controlId: childrenFieldId,
      rowId: nodeId,
      pageIndex: 1,
      pageSize: 100,
      getWorksheet: false
    });
    
    console.log('懒加载结果:', result);
    
    if (!result) {
      throw new Error('API返回结果为空');
    }
    
    if (!result.data) {
      console.log('节点没有子节点');
      return [];
    }
    
    const childRecords = result.data;
    
    // 读取标题/内容字段ID，用于映射显示名称
    const titleFieldId = getEnvValueFromHandler('titleFieldId');
    const contentFieldId = getEnvValueFromHandler('contentFieldId');
    if (!Array.isArray(childRecords)) {
      throw new Error('子节点数据格式不正确');
    }
    
    const childNodes = childRecords.map((record, index) => {
      try {
        if (!record || !record.rowid) {
          throw new Error(`子节点${index}缺少rowid字段`);
        }
        
        // 优先从返回的记录中按字段ID读取标题/内容
        let nodeTitle = (titleFieldId && record[titleFieldId]) || record.title || '';
        let nodeContent = (contentFieldId && record[contentFieldId]) || record.content || '';
        
        // 兼容某些接口把完整数据放在 sourcevalue 中的情况
        if ((!nodeTitle || nodeTitle === '') && record.sourcevalue) {
          try {
            const sv = typeof record.sourcevalue === 'string' ? JSON.parse(record.sourcevalue) : record.sourcevalue;
            if (sv && titleFieldId && sv[titleFieldId]) nodeTitle = sv[titleFieldId];
            if (sv && contentFieldId && sv[contentFieldId]) nodeContent = sv[contentFieldId];
          } catch (_) {}
        }
        
        if (!nodeTitle || nodeTitle === '') nodeTitle = '无标题';
        if (!nodeContent) nodeContent = '';
        
        return {
          id: record.rowid,
          title: nodeTitle,
          content: nodeContent,
          parentId: nodeId,
          children: [],
          level: 0, // 将在构建时计算
          isExpanded: false,
          isLoaded: false,
          hasChildren: false,
          rawRecord: record
        };
      } catch (err) {
        console.error(`处理子节点${index}失败:`, err);
        return {
          id: `error_${index}`,
          title: `错误节点${index + 1}`,
          content: '',
          parentId: nodeId,
          children: [],
          level: 0,
          isExpanded: false,
          isLoaded: false,
          hasChildren: false,
          error: err.message
        };
      }
    });
    
    console.log('懒加载完成，子节点数量:', childNodes.length);
    return childNodes;
    
  } catch (error) {
    console.error('懒加载子节点失败:', error);
    
    // 返回错误节点而不是空数组，让用户知道发生了什么
    return [{
      id: 'load_error',
      title: '加载失败',
      content: `无法加载子节点: ${error.message}`,
      parentId: nodeId,
      children: [],
      level: 0,
      isExpanded: false,
      isLoaded: false,
      hasChildren: false,
      isError: true,
      error: error.message
    }];
  }
}

/**
 * 检测循环引用
 * @param {Map} nodeMap - 节点映射表
 * @returns {array} 循环引用列表
 */
export function detectCircularReferences(nodeMap) {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];
  
  function dfs(nodeId, path) {
    if (recursionStack.has(nodeId)) {
      // 发现循环
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart);
      cycles.push(cycle);
      return;
    }
    
    if (visited.has(nodeId)) {
      return;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (node && node.parentId) {
      dfs(node.parentId, [...path, nodeId]);
    }
    
    recursionStack.delete(nodeId);
  }
  
  nodeMap.forEach((node, nodeId) => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  });
  
  return cycles;
}

/**
 * 获取文档统计信息
 * @param {array} documents - 文档数组
 * @returns {object} 统计信息
 */
export function getDocumentStats(documents) {
  const stats = {
    total: documents.length,
    withContent: documents.filter(doc => doc.content && doc.content.trim()).length,
    withCategory: documents.filter(doc => doc.category).length,
    categories: new Set()
  };
  
  documents.forEach(doc => {
    if (doc.category && doc.category.level1) {
      stats.categories.add(doc.category.level1);
    }
  });
  
  stats.categoryCount = stats.categories.size;
  
  return stats;
}
