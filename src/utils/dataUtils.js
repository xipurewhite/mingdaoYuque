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
 * @param {object} filterParams - 筛选条件参数（可选）
 * @returns {Promise<array>} 处理后的文档数组
 */
export async function fetchDocuments(api, config, env, filterParams = {}) {
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
    // 支持传入筛选条件参数
    // 如果配置了 parentFieldId，使用 plugin_detail_control 获取父级关联记录的详细信息
    const apiParams = {
      worksheetId: config.worksheetId,
      viewId: config.viewId,
      pageSize: getConfig('display.maxRecords', 100),
      notGetTotal: true,
      ...filterParams // 展开筛选条件参数（如sortId, isAsc, filters等）
    };
    
    // 如果配置了 parentFieldId，添加 requestParams 来获取关联字段的详细信息
    if (parentFieldId) {
      apiParams.requestParams = {
        plugin_detail_control: parentFieldId
      };
      console.log('添加 requestParams.plugin_detail_control 以获取父级关联记录详细信息:', parentFieldId);
    }
    
    console.log('调用 getFilterRows API，参数:', apiParams);
    
    const result = await api.getFilterRows(apiParams);
    
    console.log('原始数据结果:', result);
    console.log('筛选后的记录数量:', result?.data?.length || 0);
    
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
    if (!isNaN(value) && String(value).trim() !== '' && typeof value !== 'boolean') {
      console.log('关联记录字段值为数字，表示记录数量:', value);
      return [];
    }
    
    // 如果值是空字符串或 '[]'，返回空数组
    if (!value || value === '[]' || (typeof value === 'string' && value.trim() === '')) {
      return [];
    }
    
    // 尝试解析JSON
    let relations;
    if (typeof value === 'string') {
      try {
        relations = JSON.parse(value);
      } catch (e) {
        console.error('parseRelationData: JSON解析失败:', e, '原始值:', value);
        return [];
      }
    } else {
      relations = value;
    }
    
    if (!Array.isArray(relations)) {
      console.log('关联记录字段不是数组格式:', relations);
      return [];
    }
    
    // 过滤掉 undefined 和 null 项，然后映射
    return relations
      .filter(item => item != null && typeof item === 'object') // 过滤掉 undefined、null 和非对象项
      .map(item => {
        // 再次检查 item 是否存在（防御性编程）
        if (!item || typeof item !== 'object') {
          console.warn('parseRelationData: 遇到无效的关联记录项:', item);
          return null;
        }
        
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
          rowid: sourceValue.rowid || item.rowid || item.sid || '',  // 从sourcevalue获取的记录ID，如果没有则尝试其他字段
          wsid: sourceValue.wsid || '',    // 从sourcevalue获取的工作表ID
          ...item
        };
      })
      .filter(item => item != null); // 再次过滤掉 null 项（如果 map 返回了 null）
  } catch (err) {
    console.error("解析关联记录字段失败:", err);
    return [];
  }
}

/**
 * 并发控制工具：限制同时执行的异步任务数量
 * @param {number} concurrency - 最大并发数
 * @returns {function} 返回一个函数，用于执行任务
 */
function createConcurrencyLimiter(concurrency = 10) {
  let running = 0;
  const queue = [];
  
  async function run(task) {
    if (running >= concurrency) {
      // 等待队列中的任务完成
      await new Promise(resolve => queue.push(resolve));
    }
    
    running++;
    try {
      const result = await task();
      return result;
    } finally {
      running--;
      // 执行队列中的下一个任务
      if (queue.length > 0) {
        const next = queue.shift();
        next();
      }
    }
  }
  
  return run;
}

/**
 * 一次性加载所有子节点数据（不包括正文，优化版）
 * @param {object} api - 明道云API对象
 * @param {object} config - 配置对象
 * @param {string} nodeId - 节点ID
 * @param {string} childrenFieldId - 子级关联记录字段ID
 * @param {string} titleFieldId - 标题字段ID
 * @returns {Promise<array>} 子节点数组
 */
async function loadAllChildren(api, config, nodeId, childrenFieldId, titleFieldId) {
  try {
    let allChildRecords = [];
    let pageIndex = 1;
    const pageSize = 100;
    let totalCount = null; // 总数（如果API返回）
    let hasMore = true;
    
    // 先加载第一页，获取总数信息
    const firstResult = await api.getRowRelationRows({
      worksheetId: config.worksheetId,
      controlId: childrenFieldId,
      rowId: nodeId,
      pageIndex: 1,
      pageSize: pageSize,
      getWorksheet: false
    });
    
    if (!firstResult) {
      return [];
    }
    
    // 获取总数（如果API返回）
    if (firstResult.count !== undefined) {
      totalCount = firstResult.count;
      console.log(`节点 ${nodeId} 的子节点总数: ${totalCount}`);
    }
    
    // 处理第一页数据
    let childRecords = null;
    if (Array.isArray(firstResult.data)) {
      childRecords = firstResult.data;
    } else if (firstResult.data && Array.isArray(firstResult.data.data)) {
      childRecords = firstResult.data.data;
    } else if (firstResult.data && Array.isArray(firstResult.data.rows)) {
      childRecords = firstResult.data.rows;
    }
    
    if (childRecords && childRecords.length > 0) {
      allChildRecords = allChildRecords.concat(childRecords);
      
      // 如果知道总数，计算需要加载的页数
      if (totalCount !== null) {
        const totalPages = Math.ceil(totalCount / pageSize);
        if (totalPages <= 1) {
          // 只有一页，直接返回
          hasMore = false;
        } else {
          // 并行加载剩余页面
          const remainingPages = [];
          for (let i = 2; i <= totalPages; i++) {
            remainingPages.push(i);
          }
          
          // 并行加载所有剩余页面（控制并发数）
          const concurrencyLimiter = createConcurrencyLimiter(5); // 每页并发数限制为5
          const pagePromises = remainingPages.map(pageIndex => 
            concurrencyLimiter(async () => {
              const result = await api.getRowRelationRows({
                worksheetId: config.worksheetId,
                controlId: childrenFieldId,
                rowId: nodeId,
                pageIndex: pageIndex,
                pageSize: pageSize,
                getWorksheet: false
              });
              
              if (!result) return [];
              
              // 处理不同格式的返回数据
              let records = null;
              if (Array.isArray(result.data)) {
                records = result.data;
              } else if (result.data && Array.isArray(result.data.data)) {
                records = result.data.data;
              } else if (result.data && Array.isArray(result.data.rows)) {
                records = result.data.rows;
              }
              
              return records || [];
            })
          );
          
          const remainingResults = await Promise.all(pagePromises);
          remainingResults.forEach(records => {
            if (records && records.length > 0) {
              allChildRecords = allChildRecords.concat(records);
            }
          });
          
          hasMore = false;
        }
      } else {
        // 不知道总数，使用原来的串行分页方式（但只作为后备方案）
        pageIndex = 2;
        while (hasMore) {
          const result = await api.getRowRelationRows({
            worksheetId: config.worksheetId,
            controlId: childrenFieldId,
            rowId: nodeId,
            pageIndex: pageIndex,
            pageSize: pageSize,
            getWorksheet: false
          });
          
          if (!result) break;
          
          let records = null;
          if (Array.isArray(result.data)) {
            records = result.data;
          } else if (result.data && Array.isArray(result.data.data)) {
            records = result.data.data;
          } else if (result.data && Array.isArray(result.data.rows)) {
            records = result.data.rows;
          }
          
          if (records && records.length > 0) {
            allChildRecords = allChildRecords.concat(records);
            if (records.length < pageSize) {
              hasMore = false;
            } else {
              pageIndex++;
            }
          } else {
            hasMore = false;
          }
        }
      }
    }
    
    // 转换为节点格式（不包括正文）
    return allChildRecords.map(record => {
      const rowid = record.rowid || record.sid || '';
      let title = '';
      
      // 优化：优先使用最可能的位置获取标题
      if (titleFieldId && record[titleFieldId]) {
        title = record[titleFieldId];
      } else if (record.title) {
        title = record.title;
      } else if (record.name) {
        title = record.name;
      } else if (record.sourcevalue) {
        try {
          const sv = typeof record.sourcevalue === 'string' ? JSON.parse(record.sourcevalue) : record.sourcevalue;
          if (titleFieldId && sv[titleFieldId]) {
            title = sv[titleFieldId];
          } else if (sv.title) {
            title = sv.title;
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      return {
        rowid: rowid,
        title: title || '无标题',
        rawRecord: record
      };
    });
  } catch (error) {
    console.error('加载子节点失败:', error);
    return [];
  }
}

/**
 * 构建完整的树状结构（一次性加载所有数据，不包括正文）
 * @param {array} documents - 初始文档数组
 * @param {string} parentFieldId - 父级关联记录字段ID
 * @param {string} childrenFieldId - 子级关联记录字段ID
 * @param {object} api - 明道云API对象
 * @param {object} config - 配置对象
 * @param {string} titleFieldId - 标题字段ID
 * @returns {Promise<object>} 树状结构
 */
export async function buildCompleteRelationTree(documents, parentFieldId, childrenFieldId, api, config, titleFieldId) {
  console.log('开始构建完整树状结构（一次性加载所有数据）...');
  
  // 参数验证
  if (!documents || !Array.isArray(documents)) {
    console.error('documents参数无效');
    return { nodeMap: new Map(), rootNodes: [], orphanNodes: [] };
  }
  
  if (!parentFieldId || !childrenFieldId) {
    console.error('关联记录字段ID无效');
    return { nodeMap: new Map(), rootNodes: [], orphanNodes: [] };
  }
  
  // 创建节点映射表
  const nodeMap = new Map();
  const allDocuments = [...documents]; // 所有文档的集合（包括初始文档和后续加载的子节点）
  const processedNodeIds = new Set(); // 已处理的节点ID集合
  
  // 第一遍：处理初始文档
  documents.forEach((doc) => {
    if (!doc || !doc.id) return;
    
    const node = {
      id: doc.id,
      title: doc.title || '无标题',
      content: doc.content || '',
      parentId: null,
      children: [],
      level: 0,
      hasChildren: false,
      rawDocument: doc,
      rawRecord: doc.rawRecord || doc
    };
    
    // 解析父级关联记录
    if (doc.rawRecord && doc.rawRecord[parentFieldId]) {
      const parentRelations = parseRelationData(doc.rawRecord[parentFieldId]);
      if (parentRelations.length > 0 && parentRelations[0]) {
        const parentRowId = parentRelations[0].rowid || parentRelations[0].sid || '';
        if (parentRowId && typeof parentRowId === 'string' && parentRowId.trim() !== '') {
          node.parentId = parentRowId;
        }
      }
    }
    
    // 检查是否有子节点
    if (doc.rawRecord && doc.rawRecord[childrenFieldId]) {
      const rawValue = doc.rawRecord[childrenFieldId];
      if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
        node.hasChildren = true;
      } else {
        const childrenRelations = parseRelationData(rawValue);
        node.hasChildren = childrenRelations.length > 0;
      }
    }
    
    nodeMap.set(doc.id, node);
    processedNodeIds.add(doc.id);
  });
  
  // 第二遍：按层级并行加载所有子节点（优化版）
  // 使用并发控制，按层级加载，同一层级的节点并行处理
  
  // 创建并发控制器（限制同时进行的API调用数量）
  const concurrencyLimiter = createConcurrencyLimiter(15); // 最多同时15个请求
  
  // 按层级加载节点的函数
  async function loadNodesByLevel(nodeIds) {
    if (!nodeIds || nodeIds.length === 0) return [];
    
      // 并行加载所有节点的子节点（使用并发控制）
      const loadPromises = nodeIds.map(nodeId => 
        concurrencyLimiter(async () => {
          const node = nodeMap.get(nodeId);
          if (!node || !node.hasChildren) return { nodeId, childNodes: [] };
          
          try {
            // 加载子节点
            const childNodes = await loadAllChildren(api, config, nodeId, childrenFieldId, titleFieldId);
            return { nodeId, childNodes };
          } catch (error) {
            console.error(`加载节点 ${nodeId} 的子节点失败:`, error);
            return { nodeId, childNodes: [] };
          }
        })
      );
      
      const results = await Promise.all(loadPromises);
      return results.filter(result => result !== null && result !== undefined);
  }
  
  // 处理加载结果，创建节点对象
  function processChildNodes(nodeId, childNodes) {
    const node = nodeMap.get(nodeId);
    if (!node) return [];
    
    const nextLevelNodeIds = [];
    
    for (const childNode of childNodes) {
      const childId = childNode.rowid;
      if (!childId) continue;
      
      // 如果节点已存在，更新其 parentId（确保父子关系正确）
      if (nodeMap.has(childId)) {
        const existingNode = nodeMap.get(childId);
        if (!existingNode.parentId || existingNode.parentId !== nodeId) {
          existingNode.parentId = nodeId;
        }
        if (!node.children.includes(childId)) {
          node.children.push(childId);
        }
        continue;
      }
      
      // 新节点，添加到处理集合
      if (processedNodeIds.has(childId)) continue;
      processedNodeIds.add(childId);
      
      // 创建子节点
      const childDoc = {
        id: childId,
        title: childNode.title,
        content: '', // 不包括正文
        rawRecord: childNode.rawRecord
      };
      
      const childNodeObj = {
        id: childId,
        title: childNode.title,
        content: '',
        parentId: nodeId,
        children: [],
        level: 0, // 稍后会重新计算
        hasChildren: false,
        rawDocument: childDoc,
        rawRecord: childNode.rawRecord
      };
      
      // 检查子节点是否还有子节点
      if (childNode.rawRecord && childNode.rawRecord[childrenFieldId]) {
        const rawValue = childNode.rawRecord[childrenFieldId];
        if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
          childNodeObj.hasChildren = true;
        } else {
          const childrenRelations = parseRelationData(rawValue);
          childNodeObj.hasChildren = childrenRelations.length > 0;
        }
      }
      
      nodeMap.set(childId, childNodeObj);
      node.children.push(childId);
      allDocuments.push(childDoc);
      
      // 如果子节点还有子节点，收集到下一层级
      if (childNodeObj.hasChildren) {
        nextLevelNodeIds.push(childId);
      }
    }
    
    return nextLevelNodeIds;
  }
  
  // 按层级加载：从根节点开始，逐层向下加载
  let currentLevelNodeIds = [];
  
  // 收集第一层（根节点）中需要加载子节点的节点
  for (const doc of documents) {
    if (doc && doc.id && nodeMap.has(doc.id)) {
      const node = nodeMap.get(doc.id);
      if (node.hasChildren) {
        currentLevelNodeIds.push(doc.id);
      }
    }
  }
  
  // 逐层加载
  while (currentLevelNodeIds.length > 0) {
    console.log(`开始加载第 ${currentLevelNodeIds.length} 个节点的子节点（并行）...`);
    
    // 并行加载当前层级所有节点的子节点
    const loadResults = await loadNodesByLevel(currentLevelNodeIds);
    
    // 处理加载结果，收集下一层级的节点ID
    const nextLevelNodeIds = [];
    for (const result of loadResults) {
      if (!result || !result.nodeId) continue;
      const { nodeId, childNodes = [] } = result;
      const nextLevelIds = processChildNodes(nodeId, childNodes);
      nextLevelNodeIds.push(...nextLevelIds);
    }
    
    // 移动到下一层级
    currentLevelNodeIds = nextLevelNodeIds;
    
    console.log(`当前层级加载完成，下一层级节点数: ${currentLevelNodeIds.length}`);
  }
  
  // 第三遍：根据 parentId 重新建立父子关系（确保一致性）
  nodeMap.forEach(node => {
    node.children = []; // 清空，重新构建
  });
  
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId);
      if (!parentNode.children.includes(node.id)) {
        parentNode.children.push(node.id);
      }
      parentNode.hasChildren = true;
      node.level = parentNode.level + 1;
    }
  });
  
  // 计算所有节点的层级（从根节点开始）
  function calculateLevels(nodeId, currentLevel) {
    const node = nodeMap.get(nodeId);
    if (!node) return;
    
    node.level = currentLevel;
    node.children.forEach(childId => {
      calculateLevels(childId, currentLevel + 1);
    });
  }
  
  // 收集根节点：只有没有 parentId 的节点才是根节点
  // 同时确保该节点不在任何其他节点的 children 中
  const nodesInTree = new Set(); // 记录所有已经在树中的节点（作为子节点）
  
  // 先标记所有作为子节点的节点
  nodeMap.forEach(node => {
    node.children.forEach(childId => {
      nodesInTree.add(childId);
    });
  });
  
  const rootNodes = [];
  const orphanNodes = [];
  
  nodeMap.forEach(node => {
    // 只有同时满足以下条件的节点才是根节点：
    // 1. 没有 parentId（或 parentId 无效）
    // 2. 不在任何其他节点的 children 中
    if (!node.parentId && !nodesInTree.has(node.id)) {
      rootNodes.push(node);
      calculateLevels(node.id, 0);
    } else if (node.parentId && !nodeMap.has(node.parentId)) {
      // 父节点不存在，标记为孤儿节点
      orphanNodes.push(node);
      // 如果该节点不在其他节点的 children 中，可以作为根节点
      if (!nodesInTree.has(node.id)) {
        node.parentId = null;
        rootNodes.push(node);
        calculateLevels(node.id, 0);
      }
    } else if (!node.parentId && nodesInTree.has(node.id)) {
      // 这个节点没有 parentId，但在其他节点的 children 中，说明数据不一致
      // 这种情况不应该作为根节点，应该保持其父子关系
      console.warn(`节点 ${node.title} (${node.id}) 没有 parentId 但在其他节点的 children 中，保持其父子关系`);
    }
  });
  
  console.log('完整树状结构构建完成:', {
    根节点数量: rootNodes.length,
    节点总数: nodeMap.size,
    未分类节点数: orphanNodes.length
  });
  
  return {
    nodeMap,
    rootNodes,
    orphanNodes,
    errors: [],
    buildTime: new Date().toISOString()
  };
}

/**
 * 构建基于关联记录的树状结构（简化版，不加载子节点详情）
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
  
  // 测试数据：用于调试
  const testNodes = ['层级测试A', '层级测试A_1', '层级测试A_2', '层级测试A_3'];
  
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
        originalChildrenFromField: [], // 保存从 childrenFieldId 解析出来的原始子节点ID列表
        level: 0,
        isExpanded: false,
        isLoaded: false,
        hasChildren: false,
        rawDocument: doc,
        rawRecord: doc.rawRecord || doc // 确保 rawRecord 也被保存，用于获取创建时间等系统字段
      };
      
      // 解析父级关联记录
      if (doc.rawRecord && doc.rawRecord[parentFieldId]) {
        try {
          const parentRelations = parseRelationData(doc.rawRecord[parentFieldId]);
          if (parentRelations.length > 0 && parentRelations[0]) {
            // 取第一个父级作为父节点
            const parentRowId = parentRelations[0].rowid || parentRelations[0].sid || '';
            // 验证 parentRowId 是否有效
            if (parentRowId && typeof parentRowId === 'string' && parentRowId.trim() !== '') {
              node.parentId = parentRowId;
            }
          }
        } catch (err) {
          errors.push(`解析文档${doc.id}的父级关联记录失败: ${err.message}`);
        }
      }
      
      // 解析子级关联记录
      if (doc.rawRecord && doc.rawRecord[childrenFieldId]) {
        try {
          const rawValue = doc.rawRecord[childrenFieldId];
          // 如果值是数字，表示有子节点但需要通过懒加载获取
          if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
            node.hasChildren = true;
            // 数字类型时，originalChildrenFromField 为空，需要通过懒加载获取
            node.originalChildrenFromField = [];
          } else {
            // 尝试解析为关联记录数组
            const childrenRelations = parseRelationData(rawValue);
            // 过滤出有效的 rowid
            node.originalChildrenFromField = childrenRelations
              .map(child => child?.rowid || child?.sid || '')
              .filter(rowid => rowid && typeof rowid === 'string' && rowid.trim() !== '');
            node.children = [...node.originalChildrenFromField]; // 先保存，后续会根据 parentId 重新构建
            node.hasChildren = node.originalChildrenFromField.length > 0;
          }
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
  
  // 反向查找：如果节点的 parentId 为空，但其他节点的 originalChildrenFromField 包含该节点ID，则设置 parentId
  console.log('开始反向查找父节点关系...');
  let reverseLookupCount = 0;
  const isTestData = Array.from(nodeMap.values()).some(node => testNodes.some(testName => node.title && node.title.includes(testName)));
  
  nodeMap.forEach(node => {
    // 如果节点已经有 parentId，跳过
    if (node.parentId) {
      return;
    }
    
    const isTestNode = isTestData && testNodes.some(testName => node.title && node.title.includes(testName));
    
    // 遍历所有其他节点，查找其 originalChildrenFromField 是否包含当前节点ID
    nodeMap.forEach((otherNode) => {
      if (otherNode.id === node.id) {
        return; // 跳过自己
      }
      
      // 检查 otherNode 的 originalChildrenFromField 是否包含当前节点ID
      if (otherNode.originalChildrenFromField && otherNode.originalChildrenFromField.includes(node.id)) {
        // 找到了！otherNode 的 originalChildrenFromField 包含当前节点ID，说明 otherNode 是当前节点的父节点
        node.parentId = otherNode.id;
        reverseLookupCount++;
        if (isTestNode) {
          console.log(`[测试节点] 反向查找：节点 ${node.title} (${node.id}) 的父节点是 ${otherNode.title} (${otherNode.id})`);
        } else {
          console.log(`反向查找：节点 ${node.title} (${node.id}) 的父节点是 ${otherNode.title} (${otherNode.id})`);
        }
      }
    });
    
    if (isTestNode && !node.parentId) {
      console.log(`[测试节点] 反向查找：节点 ${node.title} (${node.id}) 未找到父节点，originalChildrenFromField:`, node.originalChildrenFromField);
    }
  });
  console.log(`反向查找完成，找到 ${reverseLookupCount} 个父节点关系`);
  
  // 清空所有节点的 children 数组，准备根据 parentId 重新构建
  nodeMap.forEach(node => {
    node.children = [];
    node.hasChildren = false;
    node.level = 0;
  });
  
  // 第二遍：根据 parentId 建立父子关系
  
  nodeMap.forEach(node => {
    const isTestNode = isTestData && testNodes.some(testName => node.title && node.title.includes(testName));
    
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parentNode = nodeMap.get(node.parentId);
      // 将节点添加到父节点的 children 中
      if (!parentNode.children.includes(node.id)) {
        parentNode.children.push(node.id);
      }
      parentNode.hasChildren = true;
      node.level = parentNode.level + 1;
      
      if (isTestNode) {
        console.log(`[测试节点] 建立父子关系：${node.title} (${node.id}) -> ${parentNode.title} (${parentNode.id}), level: ${node.level}`);
      }
    } else if (node.parentId) {
      // 父节点不存在，标记为孤儿节点
      if (isTestNode) {
        console.warn(`[测试节点] 父节点不存在：${node.title} (${node.id}) 的父节点 ${node.parentId} 不在 nodeMap 中`);
      }
      orphanNodes.push(node);
      node.parentId = null;
    } else {
      // 没有 parentId
      if (isTestNode) {
        console.log(`[测试节点] 没有 parentId：${node.title} (${node.id}) 将被添加到根节点`);
      }
    }
  });
  
  // 收集根节点：只有没有 parentId 的节点才是根节点
  // 同时确保该节点不在任何其他节点的 children 中
  const nodesInTree = new Set(); // 记录所有已经在树中的节点（作为子节点）
  
  // 先标记所有作为子节点的节点
  nodeMap.forEach(node => {
    node.children.forEach(childId => {
      nodesInTree.add(childId);
    });
  });
  
  nodeMap.forEach(node => {
    // 只有同时满足以下条件的节点才是根节点：
    // 1. 没有 parentId
    // 2. 不在任何其他节点的 children 中
    if (!node.parentId && !nodesInTree.has(node.id)) {
      rootNodes.push(node);
      const isTestNode = isTestData && testNodes.some(testName => node.title && node.title.includes(testName));
      if (isTestNode) {
        console.log(`[测试节点] 添加到根节点：${node.title} (${node.id}), children:`, node.children);
      }
    } else if (!node.parentId && nodesInTree.has(node.id)) {
      // 这个节点没有 parentId，但在其他节点的 children 中，说明数据不一致
      console.warn(`节点 ${node.title} (${node.id}) 没有 parentId 但在其他节点的 children 中，可能是数据不一致`);
    }
  });
  
  // 根据原始 childrenFieldId 数据设置 hasChildren（用于懒加载）
  nodeMap.forEach(node => {
    const doc = node.rawDocument;
    if (doc && doc.rawRecord && doc.rawRecord[childrenFieldId]) {
      try {
        const rawValue = doc.rawRecord[childrenFieldId];
        // 如果值是数字且大于0，表示有子节点（需要通过懒加载获取）
        if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
          node.hasChildren = true;
        } else {
          // 尝试解析为关联记录数组
          const childrenRelations = parseRelationData(rawValue);
          if (childrenRelations.length > 0) {
            node.hasChildren = true;
          }
        }
      } catch (err) {
        // 忽略解析错误
      }
    }
    // 如果已经有子节点（从 parentId 关系建立的），也设置 hasChildren
    if (node.children.length > 0) {
      node.hasChildren = true;
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
  
  // 对根节点进行排序：按照创建时间排序，确保最早创建的根节点排在前面
  // 排序规则：1. 非分组节点优先 2. 按创建时间排序（最早的在前）
  rootNodes.sort((a, b) => {
    // 分组节点排在最后
    if (a.isGroup && !b.isGroup) return 1;
    if (!a.isGroup && b.isGroup) return -1;
    
    // 获取创建时间（从 rawDocument 中获取）
    const getCreateTime = (node) => {
      // 优先从 rawDocument.createTime 获取
      if (node.rawDocument && node.rawDocument.createTime) {
        return node.rawDocument.createTime;
      }
      // 如果 rawDocument 有 rawRecord，从 rawRecord.ctime 获取
      if (node.rawDocument && node.rawDocument.rawRecord && node.rawDocument.rawRecord.ctime) {
        return node.rawDocument.rawRecord.ctime;
      }
      // 兼容旧版本：从 rawRecord 获取
      if (node.rawRecord && node.rawRecord.ctime) {
        return node.rawRecord.ctime;
      }
      return '';
    };
    
    const timeA = getCreateTime(a);
    const timeB = getCreateTime(b);
    
    // 如果都有创建时间，按时间排序（最早的在前）
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    
    // 如果只有一个有创建时间，有时间的排在前面
    if (timeA && !timeB) return -1;
    if (!timeA && timeB) return 1;
    
    // 如果都没有创建时间，按标题排序作为备选
    const titleA = (a.title || '').trim();
    const titleB = (b.title || '').trim();
    return titleA.localeCompare(titleB, 'zh-CN', { numeric: true, sensitivity: 'base' });
  });
  
  console.log('根节点排序完成，前5个根节点:', rootNodes.slice(0, 5).map(n => {
    const createTime = n.rawDocument?.createTime || n.rawDocument?.rawRecord?.ctime || n.rawRecord?.ctime || '无';
    return {
      title: n.title,
      id: n.id,
      isGroup: n.isGroup,
      hasChildren: n.hasChildren,
      createTime: createTime,
      hasRawDocument: !!n.rawDocument,
      hasRawRecord: !!(n.rawDocument?.rawRecord || n.rawRecord)
    };
  }));
  
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
    
    // 收集所有子节点（支持分页加载）
    let allChildRecords = [];
    let pageIndex = 1;
    const pageSize = 100;
    let hasMore = true;
    let totalCount = 0;
    
    // 循环加载所有页，直到没有更多数据
    while (hasMore) {
      const result = await api.getRowRelationRows({
        worksheetId: config.worksheetId,
        controlId: childrenFieldId,
        rowId: nodeId,
        pageIndex: pageIndex,
        pageSize: pageSize,
        getWorksheet: false
      });
      
      console.log(`懒加载结果 (第${pageIndex}页):`, result);
      console.log(`懒加载结果详情 (第${pageIndex}页):`, {
        resultCode: result?.resultCode,
        hasData: !!result?.data,
        dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
        dataLength: Array.isArray(result?.data) ? result.data.length : 'N/A',
        count: result?.count,
        totalCount: result?.count || 0,
        isSingleRow: result?.isSingleRow,
        resultKeys: result ? Object.keys(result) : [],
        resultDataStructure: result?.data ? {
          isArray: Array.isArray(result.data),
          hasData: !!result.data.data,
          dataIsArray: Array.isArray(result.data.data),
          dataLength: Array.isArray(result.data.data) ? result.data.data.length : 'N/A'
        } : null
      });
      
      if (!result) {
        throw new Error('API返回结果为空');
      }
      
      // 记录总数（从第一页获取）
      if (pageIndex === 1) {
        totalCount = result.count || 0;
        console.log('子节点总数:', totalCount);
      }
      
      // 检查不同的数据格式
      let childRecords = null;
      
      // 格式1: result.data 是数组（直接格式）
      if (Array.isArray(result.data)) {
        if (result.data.length > 0) {
          childRecords = result.data;
          console.log(`使用 result.data (数组格式, 第${pageIndex}页), 数量:`, childRecords.length);
        } else {
          console.log(`result.data 是空数组 (第${pageIndex}页)`);
        }
      }
      // 格式2: result.data.data 是数组（嵌套结构）
      else if (result.data && result.data.data) {
        if (Array.isArray(result.data.data)) {
          if (result.data.data.length > 0) {
            childRecords = result.data.data;
            console.log(`使用 result.data.data (嵌套数组格式, 第${pageIndex}页), 数量:`, childRecords.length);
          } else {
            console.log(`result.data.data 是空数组 (第${pageIndex}页)`);
          }
        } else {
          console.log(`result.data.data 不是数组 (第${pageIndex}页):`, typeof result.data.data);
        }
      }
      // 格式3: result.data 是对象，尝试查找其他可能的数据字段
      else if (result.data && typeof result.data === 'object') {
        console.log(`result.data 是对象 (第${pageIndex}页)，查找数据字段:`, Object.keys(result.data));
        // 尝试查找 rows 字段
        if (Array.isArray(result.data.rows) && result.data.rows.length > 0) {
          childRecords = result.data.rows;
          console.log(`使用 result.data.rows (第${pageIndex}页), 数量:`, childRecords.length);
        } else if (Array.isArray(result.data.records) && result.data.records.length > 0) {
          childRecords = result.data.records;
          console.log(`使用 result.data.records (第${pageIndex}页), 数量:`, childRecords.length);
        } else if (Array.isArray(result.data.list) && result.data.list.length > 0) {
          childRecords = result.data.list;
          console.log(`使用 result.data.list (第${pageIndex}页), 数量:`, childRecords.length);
        }
      }
      // 格式4: 检查 result 根级别的其他字段
      if (!childRecords) {
        console.warn(`API返回但未找到标准数据字段 (第${pageIndex}页)，尝试查找根级别字段:`, Object.keys(result));
        if (Array.isArray(result.rows) && result.rows.length > 0) {
          childRecords = result.rows;
          console.log(`使用 result.rows (第${pageIndex}页), 数量:`, childRecords.length);
        } else if (Array.isArray(result.records) && result.records.length > 0) {
          childRecords = result.records;
          console.log(`使用 result.records (第${pageIndex}页), 数量:`, childRecords.length);
        } else if (Array.isArray(result.list) && result.list.length > 0) {
          childRecords = result.list;
          console.log(`使用 result.list (第${pageIndex}页), 数量:`, childRecords.length);
        }
      }
      
      // 如果仍然没有找到数据，打印完整的 result 对象用于调试
      if (!childRecords) {
        console.warn(`API返回但未找到数据 (第${pageIndex}页)，打印完整返回对象:`, {
          result: result,
          resultStringified: JSON.stringify(result, null, 2),
          resultCode: result?.resultCode,
          count: result?.count,
          totalCount,
          dataType: typeof result?.data,
          dataIsArray: Array.isArray(result?.data),
          dataLength: Array.isArray(result?.data) ? result.data.length : 'N/A',
          dataKeys: result?.data && typeof result.data === 'object' ? Object.keys(result.data) : [],
          allResultKeys: result ? Object.keys(result) : []
        });
      }
      
      // 如果仍然没有找到数据，但 count > 0，记录详细信息
      if (!childRecords && (result.count > 0 || totalCount > 0)) {
        console.error(`API返回 count > 0 (${result.count || totalCount}) 但无法找到数据 (第${pageIndex}页):`, {
          resultStructure: result,
          dataType: typeof result.data,
          dataKeys: result.data ? Object.keys(result.data) : [],
          allResultKeys: Object.keys(result)
        });
      }
      
      // 如果获取到了子节点，添加到总列表中
      if (childRecords && childRecords.length > 0) {
        allChildRecords = allChildRecords.concat(childRecords);
        console.log(`第${pageIndex}页加载了 ${childRecords.length} 个子节点, 累计: ${allChildRecords.length}`);
        
        // 判断是否还有更多数据
        // 如果当前页返回的数据少于 pageSize，说明是最后一页
        // 或者累计数量已达到总数
        if (childRecords.length < pageSize || (totalCount > 0 && allChildRecords.length >= totalCount)) {
          hasMore = false;
          console.log(`已加载所有子节点，共 ${allChildRecords.length} 个`);
        } else {
          pageIndex++;
          console.log(`继续加载第 ${pageIndex} 页...`);
        }
      } else {
        // 没有获取到数据，停止加载
        hasMore = false;
        console.log(`第${pageIndex}页没有数据，停止加载`);
      }
    }
    
    if (allChildRecords.length === 0) {
      console.log('节点没有子节点或无法解析子节点数据:', {
        totalCount,
        pagesLoaded: pageIndex - 1
      });
      return [];
    }
    
    const pagesLoaded = allChildRecords.length > 0 ? pageIndex : 0;
    console.log(`懒加载完成，共加载 ${pagesLoaded} 页，总计 ${allChildRecords.length} 个子节点`);
    
    // 使用所有收集到的子节点
    const childRecords = allChildRecords;
    
    // 读取标题/内容字段ID，用于映射显示名称
    const titleFieldId = getEnvValueFromHandler('titleFieldId');
    const contentFieldId = getEnvValueFromHandler('contentFieldId');
    if (!Array.isArray(childRecords)) {
      throw new Error('子节点数据格式不正确');
    }
    
    // 注意：childrenFieldId 参数是用于获取子节点的关联记录字段ID
    // 子节点的子级关联记录字段ID应该与父节点的子级关联记录字段ID相同
    // 所以这里直接使用传入的 childrenFieldId 参数来检查子节点是否还有子节点
    
    console.log(`开始处理 ${childRecords.length} 个子节点记录`);
    
    // 对每个子节点调用 getRowDetail 获取完整记录，以便检查是否有子节点
    // 注意：这会增加 API 调用次数，但可以确保正确检测子节点是否有子节点
    const childNodesWithDetails = await Promise.all(
      childRecords.map(async (record, index) => {
        if (!record || !record.rowid) {
          return { record, index, detail: null };
        }
        
        try {
          // 调用 getRowDetail 获取完整记录
          const detailResult = await api.getRowDetail({
            appId: config.appId,
            worksheetId: config.worksheetId,
            viewId: config.viewId,
            rowId: record.rowid,
            getTemplate: false
          });
          
          let detailRecord = null;
          if (detailResult && detailResult.data) {
            detailRecord = detailResult.data;
          } else if (detailResult && detailResult.rowData) {
            try {
              detailRecord = JSON.parse(detailResult.rowData);
            } catch (e) {
              console.warn(`解析子节点 ${record.rowid} 的详情失败:`, e);
            }
          }
          
          return { record, index, detail: detailRecord };
        } catch (err) {
          console.warn(`获取子节点 ${record.rowid} 的详情失败:`, err);
          return { record, index, detail: null };
        }
      })
    );
    
    const childNodes = childNodesWithDetails.map(({ record, index, detail }) => {
      try {
        console.log(`处理子节点 ${index + 1}/${childRecords.length}:`, {
          hasRecord: !!record,
          rowid: record?.rowid,
          recordKeys: record ? Object.keys(record) : [],
          hasSourcevalue: !!record?.sourcevalue
        });
        
        if (!record || !record.rowid) {
          console.error(`子节点${index}缺少rowid字段:`, record);
          throw new Error(`子节点${index}缺少rowid字段`);
        }
        
        // 优先使用 detail 记录（通过 getRowDetail 获取的完整记录），如果没有则使用 record
        const recordForTitle = detail || record;
        
        // 优先从返回的记录中按字段ID读取标题/内容
        let nodeTitle = (titleFieldId && recordForTitle[titleFieldId]) || recordForTitle.title || '';
        let nodeContent = (contentFieldId && recordForTitle[contentFieldId]) || recordForTitle.content || '';
        
        console.log(`子节点 ${index + 1} 初始标题/内容:`, {
          rowid: record.rowid,
          titleFieldId,
          titleFromField: titleFieldId ? recordForTitle[titleFieldId] : undefined,
          titleFromRecord: recordForTitle.title,
          nodeTitle,
          contentFieldId,
          contentFromField: contentFieldId ? recordForTitle[contentFieldId] : undefined,
          nodeContent,
          hasDetail: !!detail
        });
        
        // 兼容某些接口把完整数据放在 sourcevalue 中的情况
        if ((!nodeTitle || nodeTitle === '') && recordForTitle.sourcevalue) {
          try {
            const sv = typeof recordForTitle.sourcevalue === 'string' ? JSON.parse(recordForTitle.sourcevalue) : recordForTitle.sourcevalue;
            console.log(`子节点 ${index + 1} 从 sourcevalue 解析:`, {
              rowid: record.rowid,
              hasTitleField: !!(sv && titleFieldId && sv[titleFieldId]),
              hasContentField: !!(sv && contentFieldId && sv[contentFieldId]),
              sourcevalueKeys: sv ? Object.keys(sv) : []
            });
            if (sv && titleFieldId && sv[titleFieldId]) nodeTitle = sv[titleFieldId];
            if (sv && contentFieldId && sv[contentFieldId]) nodeContent = sv[contentFieldId];
          } catch (err) {
            console.warn(`子节点 ${index + 1} 解析 sourcevalue 失败:`, err);
          }
        }
        
        if (!nodeTitle || nodeTitle === '') nodeTitle = '无标题';
        if (!nodeContent) nodeContent = '';
        
        // 检查子节点是否还有子节点（通过关联记录字段）
        // 使用传入的 childrenFieldId 参数来检查子节点的子级关联记录
        // 优先使用 detail 记录（通过 getRowDetail 获取的完整记录），如果没有则使用 record
        const recordToCheck = detail || record;
        
        let hasChildrenValue = false;
        let childrenIds = [];
        
        // 添加详细的调试信息
        console.log(`子节点 ${index + 1} (${record.rowid}) 开始检查是否有子节点:`, {
          childrenFieldId,
          hasChildrenFieldId: !!childrenFieldId,
          hasDetail: !!detail,
          recordKeys: record ? Object.keys(record) : [],
          detailKeys: detail ? Object.keys(detail) : [],
          recordHasField: childrenFieldId ? (recordToCheck[childrenFieldId] !== undefined) : false,
          fieldValue: childrenFieldId ? recordToCheck[childrenFieldId] : undefined,
          fieldValueType: childrenFieldId ? typeof recordToCheck[childrenFieldId] : undefined,
          hasSourcevalue: !!recordToCheck.sourcevalue
        });
        
        // 方法1: 直接从 recordToCheck 中读取
        if (childrenFieldId && recordToCheck[childrenFieldId] !== undefined && recordToCheck[childrenFieldId] !== null && recordToCheck[childrenFieldId] !== '') {
          const rawValue = recordToCheck[childrenFieldId];
          
          // 如果值是数字，表示关联记录数量（有子节点但具体记录需要通过懒加载获取）
          if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
            hasChildrenValue = true;
            childrenIds = []; // 具体子节点ID需要通过懒加载获取
            console.log(`子节点 ${index + 1} (${record.rowid}) 从 record[childrenFieldId] 检查子级: 值为数字 ${rawValue}，表示有子节点`);
          } else {
            // 尝试解析为关联记录数组
            try {
              const childrenRelations = parseRelationData(rawValue);
              hasChildrenValue = childrenRelations.length > 0;
              childrenIds = childrenRelations.map(child => child.rowid);
              console.log(`子节点 ${index + 1} (${record.rowid}) 从 record[childrenFieldId] 检查子级:`, {
                childrenFieldId,
                rawValue: rawValue,
                rawValueType: typeof rawValue,
                relationsCount: childrenRelations.length,
                hasChildren: hasChildrenValue
              });
            } catch (err) {
              console.warn(`解析子节点${record.rowid}的子级关联记录失败:`, err);
            }
          }
        }
        
        // 方法2: 从 sourcevalue 中读取
        if (!hasChildrenValue && recordToCheck.sourcevalue) {
          try {
            const sv = typeof recordToCheck.sourcevalue === 'string' ? JSON.parse(recordToCheck.sourcevalue) : recordToCheck.sourcevalue;
            if (sv && childrenFieldId && sv[childrenFieldId] !== undefined && sv[childrenFieldId] !== null && sv[childrenFieldId] !== '') {
              const rawValue = sv[childrenFieldId];
              
              // 如果值是数字，表示关联记录数量（有子节点但具体记录需要通过懒加载获取）
              if (!isNaN(rawValue) && String(rawValue).trim() !== '' && Number(rawValue) > 0) {
                hasChildrenValue = true;
                childrenIds = []; // 具体子节点ID需要通过懒加载获取
                console.log(`子节点 ${index + 1} (${record.rowid}) 从 sourcevalue 检查子级: 值为数字 ${rawValue}，表示有子节点`);
              } else {
                // 尝试解析为关联记录数组
                const childrenRelations = parseRelationData(rawValue);
                hasChildrenValue = childrenRelations.length > 0;
                childrenIds = childrenRelations.map(child => child.rowid);
                console.log(`子节点 ${index + 1} (${record.rowid}) 从 sourcevalue 检查子级:`, {
                  childrenFieldId,
                  rawValue: rawValue,
                  rawValueType: typeof rawValue,
                  relationsCount: childrenRelations.length,
                  hasChildren: hasChildrenValue
                });
              }
            } else {
              console.log(`子节点 ${index + 1} (${record.rowid}) sourcevalue 中没有找到子级关联记录字段:`, {
                hasSv: !!sv,
                hasChildrenFieldId: !!childrenFieldId,
                fieldValue: sv && childrenFieldId ? sv[childrenFieldId] : undefined,
                svKeys: sv ? Object.keys(sv) : []
              });
            }
          } catch (err) {
            console.warn(`子节点 ${index + 1} 从 sourcevalue 解析子级关联记录失败:`, err);
          }
        }
        
        // 如果两种方法都没有检测到子节点信息，输出警告
        if (!hasChildrenValue && childrenFieldId) {
          console.warn(`子节点 ${index + 1} (${record.rowid}) 未检测到子节点信息:`, {
            childrenFieldId,
            recordHasField: recordToCheck[childrenFieldId] !== undefined,
            fieldValue: recordToCheck[childrenFieldId],
            hasSourcevalue: !!recordToCheck.sourcevalue,
            recordKeys: Object.keys(recordToCheck),
            hasDetail: !!detail
          });
        }
        
        const childNode = {
          id: record.rowid,
          title: nodeTitle,
          content: nodeContent,
          parentId: nodeId,
          children: childrenIds,
          level: 0, // 将在构建时计算
          isExpanded: false,
          isLoaded: false,
          hasChildren: hasChildrenValue,
          rawRecord: detail || record // 优先使用 detail（完整记录），如果没有则使用 record
        };
        
        console.log(`子节点 ${index + 1} 处理完成:`, {
          id: childNode.id,
          title: childNode.title,
          hasChildren: childNode.hasChildren,
          hasChildrenType: typeof childNode.hasChildren,
          childrenCount: childNode.children.length,
          childrenIds: childNode.children,
          childrenFieldId: childrenFieldId,
          检测过程: {
            方法1检查: childrenFieldId && record[childrenFieldId] !== undefined && record[childrenFieldId] !== null && record[childrenFieldId] !== '',
            方法2检查: !hasChildrenValue && record.sourcevalue,
            最终结果: hasChildrenValue
          }
        });
        
        return childNode;
      } catch (err) {
        console.error(`处理子节点${index}失败:`, err, record);
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
    }).filter(node => {
      // 过滤掉错误节点（可选，根据需求决定是否显示错误节点）
      if (node.id && node.id.startsWith('error_')) {
        console.warn('过滤掉错误节点:', node.id);
        return false;
      }
      return true;
    });
    
    console.log(`子节点处理完成，有效节点数量: ${childNodes.length}/${childRecords.length}`, {
      nodeIds: childNodes.map(n => n.id),
      nodeTitles: childNodes.map(n => n.title)
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
