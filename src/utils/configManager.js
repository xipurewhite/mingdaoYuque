/**
 * 明道云插件配置持久化管理工具
 */

const CONFIG_STORAGE_KEY = 'yuque_reader_config';
const CONFIG_VERSION = '1.0.0';

/**
 * 配置管理器
 */
class ConfigManager {
  constructor() {
    this.config = null;
    this.defaultConfig = this.getDefaultConfig();
  }
  
  /**
   * 获取默认配置
   * @returns {object} 默认配置
   */
  getDefaultConfig() {
    return {
      version: CONFIG_VERSION,
      fields: {
        title: '',
        content: '',
        category: ''
      },
      features: {
        showSearch: true,
        showOutline: true,
        autoSaveProgress: true,
        enableKeyboardShortcuts: true
      },
      display: {
        defaultTheme: 'light',
        defaultFontSize: 16,
        maxRecords: 100
      },
      reading: {
        autoScroll: false,
        readingMode: 'normal',
        highlightCurrentLine: false
      },
      advanced: {
        enableDebug: false,
        cacheSize: 50,
        requestTimeout: 30000
      }
    };
  }
  
  /**
   * 初始化配置
   * @param {object} initialConfig - 初始配置
   * @param {object} override - 配置覆盖对象
   */
  initialize(initialConfig = {}, override = null) {
    // 从本地存储加载配置
    const savedConfig = this.loadFromStorage();
    
    // 合并配置
    this.config = this.mergeConfigs(
      this.defaultConfig,
      savedConfig,
      initialConfig
    );
    
    // 应用配置覆盖
    if (override) {
      this.config = this.applyOverride(this.config, override);
    }
    
    // 验证配置
    this.validateConfig();
    
    console.log('配置管理器初始化完成:', this.config);
  }
  
  /**
   * 合并配置对象
   * @param {...object} configs - 配置对象
   * @returns {object} 合并后的配置
   */
  mergeConfigs(...configs) {
    const result = {};
    
    configs.forEach(config => {
      if (config && typeof config === 'object') {
        Object.keys(config).forEach(key => {
          if (config[key] !== undefined && config[key] !== null) {
            if (typeof config[key] === 'object' && !Array.isArray(config[key])) {
              result[key] = this.mergeConfigs(result[key] || {}, config[key]);
            } else {
              result[key] = config[key];
            }
          }
        });
      }
    });
    
    return result;
  }
  
  /**
   * 应用配置覆盖
   * @param {object} config - 当前配置
   * @param {object} override - 覆盖配置
   * @returns {object} 应用覆盖后的配置
   */
  applyOverride(config, override) {
    if (!override || typeof override !== 'object') return config;
    
    return {
      ...config,
      fields: {
        ...config.fields,
        title: override.titleFieldId || config.fields?.title,
        content: override.contentFieldId || config.fields?.content,
        category: override.categoryFieldId || config.fields?.category
      }
    };
  }
  
  /**
   * 验证配置
   * @returns {object} 验证结果
   */
  validateConfig() {
    const errors = [];
    const warnings = [];
    
    // 验证必填字段
    if (!this.config.fields.title) {
      errors.push('缺少文档标题字段配置');
    }
    
    if (!this.config.fields.content) {
      errors.push('缺少文档内容字段配置');
    }
    
    // 验证数值范围
    if (this.config.display.maxRecords < 1 || this.config.display.maxRecords > 1000) {
      errors.push('最大记录数必须在1-1000之间');
    }
    
    if (this.config.display.defaultFontSize < 12 || this.config.display.defaultFontSize > 24) {
      errors.push('默认字体大小必须在12-24px之间');
    }
    
    // 验证主题
    if (!['light', 'dark'].includes(this.config.display.defaultTheme)) {
      errors.push('默认主题必须是light或dark');
    }
    
    // 验证阅读模式
    if (!['normal', 'focus', 'night'].includes(this.config.reading.readingMode)) {
      errors.push('阅读模式必须是normal、focus或night');
    }
    
    if (errors.length > 0) {
      console.error('配置验证失败:', errors);
      throw new Error(`配置验证失败: ${errors.join(', ')}`);
    }
    
    if (warnings.length > 0) {
      console.warn('配置验证警告:', warnings);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 获取配置值
   * @param {string} path - 配置路径，如 'fields.title' 或 'display.defaultTheme'
   * @param {any} defaultValue - 默认值
   * @returns {any} 配置值
   */
  get(path, defaultValue = null) {
    if (!this.config) {
      return defaultValue;
    }
    
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }
  
  /**
   * 设置配置值
   * @param {string} path - 配置路径
   * @param {any} value - 配置值
   */
  set(path, value) {
    if (!this.config) {
      this.config = { ...this.defaultConfig };
    }
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    
    // 自动保存
    this.saveToStorage();
  }
  
  /**
   * 获取字段配置
   * @returns {object} 字段配置
   */
  getFields() {
    return this.get('fields', {});
  }
  
  /**
   * 设置字段配置
   * @param {object} fields - 字段配置
   */
  setFields(fields) {
    this.set('fields', fields);
  }
  
  /**
   * 获取功能配置
   * @returns {object} 功能配置
   */
  getFeatures() {
    return this.get('features', {});
  }
  
  /**
   * 设置功能配置
   * @param {object} features - 功能配置
   */
  setFeatures(features) {
    this.set('features', features);
  }
  
  /**
   * 获取显示配置
   * @returns {object} 显示配置
   */
  getDisplay() {
    return this.get('display', {});
  }
  
  /**
   * 设置显示配置
   * @param {object} display - 显示配置
   */
  setDisplay(display) {
    this.set('display', display);
  }
  
  /**
   * 获取阅读配置
   * @returns {object} 阅读配置
   */
  getReading() {
    return this.get('reading', {});
  }
  
  /**
   * 设置阅读配置
   * @param {object} reading - 阅读配置
   */
  setReading(reading) {
    this.set('reading', reading);
  }
  
  /**
   * 获取高级配置
   * @returns {object} 高级配置
   */
  getAdvanced() {
    return this.get('advanced', {});
  }
  
  /**
   * 设置高级配置
   * @param {object} advanced - 高级配置
   */
  setAdvanced(advanced) {
    this.set('advanced', advanced);
  }
  
  /**
   * 获取完整配置
   * @returns {object} 完整配置
   */
  getAll() {
    return this.config ? { ...this.config } : { ...this.defaultConfig };
  }
  
  /**
   * 设置完整配置
   * @param {object} config - 完整配置
   */
  setAll(config) {
    this.config = this.mergeConfigs(this.defaultConfig, config);
    this.validateConfig();
    this.saveToStorage();
  }
  
  /**
   * 重置配置为默认值
   */
  reset() {
    this.config = { ...this.defaultConfig };
    this.saveToStorage();
  }
  
  /**
   * 从本地存储加载配置
   * @returns {object} 配置对象
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        
        // 检查版本兼容性
        if (this.isVersionCompatible(config.version)) {
          return config;
        } else {
          console.warn('配置版本不兼容，使用默认配置');
          return {};
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
    
    return {};
  }
  
  /**
   * 保存配置到本地存储
   */
  saveToStorage() {
    try {
      if (this.config) {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  }
  
  /**
   * 检查版本兼容性
   * @param {string} version - 版本号
   * @returns {boolean} 是否兼容
   */
  isVersionCompatible(version) {
    if (!version) return false;
    
    // 简单的版本兼容性检查
    const currentMajor = CONFIG_VERSION.split('.')[0];
    const configMajor = version.split('.')[0];
    
    return currentMajor === configMajor;
  }
  
  /**
   * 导出配置
   * @returns {string} 配置JSON字符串
   */
  export() {
    return JSON.stringify(this.getAll(), null, 2);
  }
  
  /**
   * 导入配置
   * @param {string} configJson - 配置JSON字符串
   * @returns {boolean} 是否导入成功
   */
  import(configJson) {
    try {
      const config = JSON.parse(configJson);
      this.setAll(config);
      return true;
    } catch (error) {
      console.error('导入配置失败:', error);
      return false;
    }
  }
  
  /**
   * 清除所有配置
   */
  clear() {
    this.config = { ...this.defaultConfig };
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }
  
  /**
   * 获取配置摘要
   * @returns {object} 配置摘要
   */
  getSummary() {
    const fields = this.getFields();
    const features = this.getFeatures();
    const display = this.getDisplay();
    
    return {
      version: this.get('version'),
      hasTitleField: !!fields.title,
      hasContentField: !!fields.content,
      hasCategoryField: !!fields.category,
      showSearch: features.showSearch,
      showOutline: features.showOutline,
      defaultTheme: display.defaultTheme,
      defaultFontSize: display.defaultFontSize,
      maxRecords: display.maxRecords
    };
  }
}

// 创建全局实例
export const configManager = new ConfigManager();

/**
 * 初始化配置管理器
 * @param {object} initialConfig - 初始配置
 * @param {object} override - 配置覆盖对象
 */
export function initializeConfigManager(initialConfig = {}, override = null) {
  configManager.initialize(initialConfig, override);
}

/**
 * 获取配置值
 * @param {string} path - 配置路径
 * @param {any} defaultValue - 默认值
 * @returns {any} 配置值
 */
export function getConfig(path, defaultValue = null) {
  return configManager.get(path, defaultValue);
}

/**
 * 设置配置值
 * @param {string} path - 配置路径
 * @param {any} value - 配置值
 */
export function setConfig(path, value) {
  configManager.set(path, value);
}

/**
 * 获取字段配置
 * @returns {object} 字段配置
 */
export function getFieldsConfig() {
  return configManager.getFields();
}

/**
 * 设置字段配置
 * @param {object} fields - 字段配置
 */
export function setFieldsConfig(fields) {
  configManager.setFields(fields);
}

/**
 * 获取功能配置
 * @returns {object} 功能配置
 */
export function getFeaturesConfig() {
  return configManager.getFeatures();
}

/**
 * 设置功能配置
 * @param {object} features - 功能配置
 */
export function setFeaturesConfig(features) {
  configManager.setFeatures(features);
}

/**
 * 获取显示配置
 * @returns {object} 显示配置
 */
export function getDisplayConfig() {
  return configManager.getDisplay();
}

/**
 * 设置显示配置
 * @param {object} display - 显示配置
 */
export function setDisplayConfig(display) {
  configManager.setDisplay(display);
}

/**
 * 获取完整配置
 * @returns {object} 完整配置
 */
export function getAllConfig() {
  return configManager.getAll();
}

/**
 * 设置完整配置
 * @param {object} config - 完整配置
 */
export function setAllConfig(config) {
  configManager.setAll(config);
}

/**
 * 重置配置
 */
export function resetConfig() {
  configManager.reset();
}

/**
 * 导出配置
 * @returns {string} 配置JSON字符串
 */
export function exportConfig() {
  return configManager.export();
}

/**
 * 导入配置
 * @param {string} configJson - 配置JSON字符串
 * @returns {boolean} 是否导入成功
 */
export function importConfig(configJson) {
  return configManager.import(configJson);
}

/**
 * 获取配置摘要
 * @returns {object} 配置摘要
 */
export function getConfigSummary() {
  return configManager.getSummary();
}
