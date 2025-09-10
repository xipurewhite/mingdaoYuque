/**
 * 明道云环境变量处理工具
 */

/**
 * 环境变量处理器
 */
class EnvHandler {
  constructor() {
    this.env = null;
    this.config = null;
    this.cache = new Map();
  }
  
  /**
   * 初始化环境变量
   * @param {object} env - 环境变量对象
   * @param {object} config - 配置对象
   */
  initialize(env, config) {
    this.env = env;
    this.config = config;
    this.cache.clear();
    
    console.log('环境变量初始化完成:', {
      envKeys: Object.keys(env || {}),
      configKeys: Object.keys(config || {})
    });
  }
  
  /**
   * 获取环境变量值
   * @param {string} key - 变量名
   * @param {any} defaultValue - 默认值
   * @returns {any} 变量值
   */
  getEnvValue(key, defaultValue = null) {
    if (!this.env || !key) return defaultValue;
    
    // 检查缓存
    const cacheKey = `env_${key}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const value = this.env[key];
    let result = defaultValue;
    
    // 处理数组类型(字段选择器)
    if (Array.isArray(value)) {
      result = value.length > 0 ? value[0] : defaultValue;
    } else if (value !== undefined) {
      result = value;
    }
    
    // 缓存结果
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * 获取字段ID
   * @param {string} fieldName - 字段名称
   * @returns {string|null} 字段ID
   */
  getFieldId(fieldName) {
    return this.getEnvValue(fieldName);
  }
  
  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {any} defaultValue - 默认值
   * @returns {any} 配置值
   */
  getConfigValue(key, defaultValue = null) {
    if (!this.config || !key) return defaultValue;
    
    // 检查缓存
    const cacheKey = `config_${key}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const value = this.config[key];
    const result = value !== undefined ? value : defaultValue;
    
    // 缓存结果
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * 获取工作表ID
   * @returns {string|null}
   */
  getWorksheetId() {
    return this.getConfigValue('worksheetId');
  }
  
  /**
   * 获取视图ID
   * @returns {string|null}
   */
  getViewId() {
    return this.getConfigValue('viewId');
  }
  
  /**
   * 获取应用ID
   * @returns {string|null}
   */
  getAppId() {
    return this.getConfigValue('appId');
  }
  
  /**
   * 获取项目ID
   * @returns {string|null}
   */
  getProjectId() {
    return this.getConfigValue('projectId');
  }
  
  /**
   * 获取控件列表
   * @returns {Array} 控件数组
   */
  getControls() {
    return this.getConfigValue('controls', []);
  }
  
  /**
   * 根据字段ID获取控件信息
   * @param {string} fieldId - 字段ID
   * @returns {object|null} 控件信息
   */
  getControlById(fieldId) {
    if (!fieldId) return null;
    
    const controls = this.getControls();
    return controls.find(control => control.controlId === fieldId) || null;
  }
  
  /**
   * 根据字段名称获取控件信息
   * @param {string} fieldName - 字段名称
   * @returns {object|null} 控件信息
   */
  getControlByName(fieldName) {
    if (!fieldName) return null;
    
    const controls = this.getControls();
    return controls.find(control => control.controlName === fieldName) || null;
  }
  
  /**
   * 获取字段类型
   * @param {string} fieldId - 字段ID
   * @returns {number|null} 字段类型编号
   */
  getFieldType(fieldId) {
    const control = this.getControlById(fieldId);
    return control ? control.type : null;
  }
  
  /**
   * 获取字段名称
   * @param {string} fieldId - 字段ID
   * @returns {string|null} 字段名称
   */
  getFieldName(fieldId) {
    const control = this.getControlById(fieldId);
    return control ? control.controlName : null;
  }
  
  /**
   * 检查字段是否存在
   * @param {string} fieldId - 字段ID
   * @returns {boolean}
   */
  hasField(fieldId) {
    return this.getControlById(fieldId) !== null;
  }
  
  /**
   * 获取所有字段信息
   * @returns {Array} 字段信息数组
   */
  getAllFields() {
    const controls = this.getControls();
    return controls.map(control => ({
      id: control.controlId,
      name: control.controlName,
      type: control.type,
      options: control.options || []
    }));
  }
  
  /**
   * 根据类型筛选字段
   * @param {number} type - 字段类型编号
   * @returns {Array} 字段信息数组
   */
  getFieldsByType(type) {
    const controls = this.getControls();
    return controls
      .filter(control => control.type === type)
      .map(control => ({
        id: control.controlId,
        name: control.controlName,
        type: control.type,
        options: control.options || []
      }));
  }
  
  /**
   * 获取文本字段
   * @returns {Array} 文本字段数组
   */
  getTextFields() {
    return this.getFieldsByType(2);
  }
  
  /**
   * 获取富文本字段
   * @returns {Array} 富文本字段数组
   */
  getRichTextFields() {
    return this.getFieldsByType(41);
  }
  
  /**
   * 获取级联选择字段
   * @returns {Array} 级联选择字段数组
   */
  getCascadeFields() {
    // 级联选择字段的类型编号需要确认
    // 暂时返回空数组
    return [];
  }
  
  /**
   * 获取单选字段
   * @returns {Array} 单选字段数组
   */
  getSelectFields() {
    return this.getFieldsByType(11);
  }
  
  /**
   * 获取多选字段
   * @returns {Array} 多选字段数组
   */
  getMultiSelectFields() {
    return this.getFieldsByType(10);
  }
  
  /**
   * 获取日期字段
   * @returns {Array} 日期字段数组
   */
  getDateFields() {
    return this.getFieldsByType(15);
  }
  
  /**
   * 获取数值字段
   * @returns {Array} 数值字段数组
   */
  getNumberFields() {
    return this.getFieldsByType(6);
  }
  
  /**
   * 获取成员字段
   * @returns {Array} 成员字段数组
   */
  getUserFields() {
    return this.getFieldsByType(26);
  }
  
  /**
   * 获取部门字段
   * @returns {Array} 部门字段数组
   */
  getDepartmentFields() {
    return this.getFieldsByType(27);
  }
  
  /**
   * 获取附件字段
   * @returns {Array} 附件字段数组
   */
  getAttachmentFields() {
    return this.getFieldsByType(14);
  }
  
  /**
   * 验证环境变量完整性
   * @returns {object} 验证结果
   */
  validateEnv() {
    const errors = [];
    const warnings = [];
    
    // 检查必要的配置
    if (!this.getWorksheetId()) {
      errors.push('缺少工作表ID配置');
    }
    
    if (!this.getViewId()) {
      errors.push('缺少视图ID配置');
    }
    
    if (!this.getAppId()) {
      errors.push('缺少应用ID配置');
    }
    
    // 检查控件配置
    const controls = this.getControls();
    if (!controls || controls.length === 0) {
      errors.push('缺少字段控件配置');
    }
    
    // 检查环境变量
    if (!this.env) {
      errors.push('缺少环境变量配置');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 获取环境变量摘要
   * @returns {object} 环境变量摘要
   */
  getEnvSummary() {
    return {
      worksheetId: this.getWorksheetId(),
      viewId: this.getViewId(),
      appId: this.getAppId(),
      projectId: this.getProjectId(),
      controlsCount: this.getControls().length,
      fieldsCount: this.getAllFields().length,
      textFieldsCount: this.getTextFields().length,
      richTextFieldsCount: this.getRichTextFields().length,
      selectFieldsCount: this.getSelectFields().length,
      dateFieldsCount: this.getDateFields().length,
      userFieldsCount: this.getUserFields().length
    };
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * 重新初始化
   * @param {object} env - 新的环境变量对象
   * @param {object} config - 新的配置对象
   */
  reinitialize(env, config) {
    this.initialize(env, config);
  }
}

// 创建全局实例
export const envHandler = new EnvHandler();

/**
 * 初始化环境变量处理器
 * @param {object} env - 环境变量对象
 * @param {object} config - 配置对象
 */
export function initializeEnvHandler(env, config) {
  envHandler.initialize(env, config);
}

/**
 * 获取环境变量值
 * @param {string} key - 变量名
 * @param {any} defaultValue - 默认值
 * @returns {any} 变量值
 */
export function getEnvValue(key, defaultValue = null) {
  return envHandler.getEnvValue(key, defaultValue);
}

/**
 * 获取字段ID
 * @param {string} fieldName - 字段名称
 * @returns {string|null} 字段ID
 */
export function getFieldId(fieldName) {
  return envHandler.getFieldId(fieldName);
}

/**
 * 获取配置值
 * @param {string} key - 配置键
 * @param {any} defaultValue - 默认值
 * @returns {any} 配置值
 */
export function getConfigValue(key, defaultValue = null) {
  return envHandler.getConfigValue(key, defaultValue);
}

/**
 * 获取控件信息
 * @param {string} fieldId - 字段ID
 * @returns {object|null} 控件信息
 */
export function getControlById(fieldId) {
  return envHandler.getControlById(fieldId);
}

/**
 * 获取字段类型
 * @param {string} fieldId - 字段ID
 * @returns {number|null} 字段类型编号
 */
export function getFieldType(fieldId) {
  return envHandler.getFieldType(fieldId);
}

/**
 * 获取字段名称
 * @param {string} fieldId - 字段ID
 * @returns {string|null} 字段名称
 */
export function getFieldName(fieldId) {
  return envHandler.getFieldName(fieldId);
}

/**
 * 验证环境变量
 * @returns {object} 验证结果
 */
export function validateEnv() {
  return envHandler.validateEnv();
}

/**
 * 获取环境变量摘要
 * @returns {object} 环境变量摘要
 */
export function getEnvSummary() {
  return envHandler.getEnvSummary();
}
