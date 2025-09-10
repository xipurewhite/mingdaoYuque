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
    
    console.log('字段ID配置:', {
      titleFieldId,
      contentFieldId,
      categoryFieldId
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
          rawRecord: record // 保留原始记录用于调试
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
