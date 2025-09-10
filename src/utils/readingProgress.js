/**
 * 阅读进度管理工具函数
 */

const STORAGE_KEY = 'yuque_reader_progress';
const READING_TIME_KEY = 'yuque_reader_time';

/**
 * 保存阅读进度
 * @param {string} documentId - 文档ID
 * @param {number} scrollTop - 滚动位置
 * @param {string} activeHeadingId - 当前活跃的标题ID
 */
export function saveReadingProgress(documentId, scrollTop, activeHeadingId) {
  try {
    const progress = getReadingProgress();
    progress[documentId] = {
      scrollTop,
      activeHeadingId,
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('保存阅读进度失败:', error);
  }
}

/**
 * 获取阅读进度
 * @param {string} documentId - 文档ID
 * @returns {object|null} 阅读进度信息
 */
export function getReadingProgress(documentId = null) {
  try {
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return documentId ? progress[documentId] || null : progress;
  } catch (error) {
    console.error('获取阅读进度失败:', error);
    return documentId ? null : {};
  }
}

/**
 * 清除阅读进度
 * @param {string} documentId - 文档ID，不传则清除所有
 */
export function clearReadingProgress(documentId = null) {
  try {
    if (documentId) {
      const progress = getReadingProgress();
      delete progress[documentId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('清除阅读进度失败:', error);
  }
}

/**
 * 恢复阅读位置
 * @param {string} documentId - 文档ID
 * @param {number} defaultScrollTop - 默认滚动位置
 */
export function restoreReadingPosition(documentId, defaultScrollTop = 0) {
  const progress = getReadingProgress(documentId);
  if (progress && progress.scrollTop) {
    // 延迟恢复，确保DOM已渲染
    setTimeout(() => {
      window.scrollTo({
        top: progress.scrollTop,
        behavior: 'smooth'
      });
      
      // 如果有活跃的标题，也尝试跳转到该标题
      if (progress.activeHeadingId) {
        const element = document.getElementById(progress.activeHeadingId);
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    }, 100);
  } else if (defaultScrollTop > 0) {
    setTimeout(() => {
      window.scrollTo({
        top: defaultScrollTop,
        behavior: 'smooth'
      });
    }, 100);
  }
}

/**
 * 记录阅读时间
 * @param {string} documentId - 文档ID
 * @param {number} readingTime - 阅读时间（秒）
 */
export function recordReadingTime(documentId, readingTime) {
  try {
    const readingTimes = JSON.parse(localStorage.getItem(READING_TIME_KEY) || '{}');
    readingTimes[documentId] = (readingTimes[documentId] || 0) + readingTime;
    localStorage.setItem(READING_TIME_KEY, JSON.stringify(readingTimes));
  } catch (error) {
    console.error('记录阅读时间失败:', error);
  }
}

/**
 * 获取阅读时间
 * @param {string} documentId - 文档ID
 * @returns {number} 阅读时间（秒）
 */
export function getReadingTime(documentId) {
  try {
    const readingTimes = JSON.parse(localStorage.getItem(READING_TIME_KEY) || '{}');
    return readingTimes[documentId] || 0;
  } catch (error) {
    console.error('获取阅读时间失败:', error);
    return 0;
  }
}

/**
 * 格式化阅读时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间
 */
export function formatReadingTime(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    return `${Math.round(seconds / 60)}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
}

/**
 * 获取阅读统计
 * @returns {object} 阅读统计信息
 */
export function getReadingStats() {
  try {
    const progress = getReadingProgress();
    const readingTimes = JSON.parse(localStorage.getItem(READING_TIME_KEY) || '{}');
    
    const totalDocuments = Object.keys(progress).length;
    const totalReadingTime = Object.values(readingTimes).reduce((sum, time) => sum + time, 0);
    
    return {
      totalDocuments,
      totalReadingTime,
      averageReadingTime: totalDocuments > 0 ? totalReadingTime / totalDocuments : 0,
      formattedTotalTime: formatReadingTime(totalReadingTime),
      formattedAverageTime: formatReadingTime(totalReadingTime / totalDocuments || 0)
    };
  } catch (error) {
    console.error('获取阅读统计失败:', error);
    return {
      totalDocuments: 0,
      totalReadingTime: 0,
      averageReadingTime: 0,
      formattedTotalTime: '0秒',
      formattedAverageTime: '0秒'
    };
  }
}

/**
 * 清除所有阅读数据
 */
export function clearAllReadingData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(READING_TIME_KEY);
  } catch (error) {
    console.error('清除阅读数据失败:', error);
  }
}
