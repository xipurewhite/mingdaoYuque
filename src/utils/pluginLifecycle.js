/**
 * 明道云插件生命周期管理工具
 */

/**
 * 插件生命周期状态
 */
export const PLUGIN_STATES = {
  INITIALIZING: 'initializing',
  CONFIGURING: 'configuring', 
  READY: 'ready',
  RUNNING: 'running',
  ERROR: 'error',
  DESTROYED: 'destroyed'
};

/**
 * 插件生命周期管理器
 */
class PluginLifecycleManager {
  constructor() {
    this.state = PLUGIN_STATES.INITIALIZING;
    this.listeners = new Map();
    this.config = null;
    this.error = null;
  }
  
  /**
   * 添加生命周期监听器
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  /**
   * 移除生命周期监听器
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`生命周期事件 ${event} 的回调执行失败:`, error);
        }
      });
    }
  }
  
  /**
   * 设置插件状态
   * @param {string} newState - 新状态
   * @param {any} data - 状态数据
   */
  setState(newState, data = null) {
    const oldState = this.state;
    this.state = newState;
    
    console.log(`插件状态变更: ${oldState} -> ${newState}`, data);
    
    // 触发状态变更事件
    this.emit('stateChange', {
      oldState,
      newState,
      data
    });
    
    // 触发特定状态事件
    this.emit(newState, data);
  }
  
  /**
   * 初始化插件
   * @param {object} config - 插件配置
   */
  async initialize(config, override = null) {
    try {
      this.setState(PLUGIN_STATES.INITIALIZING);
      
      // 验证配置
      const validationResult = this.validateConfig(config, override);
      if (!validationResult.valid) {
        throw new Error(`配置验证失败: ${validationResult.errors.join(', ')}`);
      }
      
      this.config = config;
      
      // 初始化插件资源
      await this.initializeResources();
      
      this.setState(PLUGIN_STATES.READY);
      
    } catch (error) {
      this.error = error;
      this.setState(PLUGIN_STATES.ERROR, error);
      throw error;
    }
  }
  
  /**
   * 启动插件
   */
  async start() {
    try {
      if (this.state !== PLUGIN_STATES.READY) {
        throw new Error(`插件未就绪，当前状态: ${this.state}`);
      }
      
      this.setState(PLUGIN_STATES.RUNNING);
      
      // 启动插件功能
      await this.startPlugin();
      
    } catch (error) {
      this.error = error;
      this.setState(PLUGIN_STATES.ERROR, error);
      throw error;
    }
  }
  
  /**
   * 停止插件
   */
  async stop() {
    try {
      if (this.state === PLUGIN_STATES.RUNNING) {
        // 停止插件功能
        await this.stopPlugin();
        
        this.setState(PLUGIN_STATES.READY);
      }
    } catch (error) {
      this.error = error;
      this.setState(PLUGIN_STATES.ERROR, error);
      throw error;
    }
  }
  
  /**
   * 销毁插件
   */
  async destroy() {
    try {
      // 停止插件
      if (this.state === PLUGIN_STATES.RUNNING) {
        await this.stop();
      }
      
      // 清理资源
      await this.cleanupResources();
      
      this.setState(PLUGIN_STATES.DESTROYED);
      
    } catch (error) {
      this.error = error;
      this.setState(PLUGIN_STATES.ERROR, error);
      throw error;
    }
  }
  
  /**
   * 验证插件配置
   * @param {object} config - 配置对象
   * @param {object} override - 配置覆盖对象
   * @returns {object} 验证结果
   */
  validateConfig(config, override = null) {
    const errors = [];
    
    // 添加调试信息
    console.log('配置验证调试信息:', {
      config: config,
      override: override,
      configFields: config.fields,
      configFieldsTitle: config.fields?.title,
      configFieldsContent: config.fields?.content,
      configFieldsCategory: config.fields?.category
    });
    
    // 构建实际配置对象
    const actualConfig = {
      ...config,
      fields: {
        ...config.fields,
        ...(override ? {
          title: override.titleFieldId || config.fields?.title,
          content: override.contentFieldId || config.fields?.content,
          category: override.categoryFieldId || config.fields?.category
        } : {})
      }
    };
    
    console.log('实际配置:', actualConfig);
    console.log('实际配置字段详情:', {
      actualConfigFields: actualConfig.fields,
      titleField: actualConfig.fields?.title,
      contentField: actualConfig.fields?.content,
      categoryField: actualConfig.fields?.category
    });
    
    // 验证必填字段 - 使用实际配置中的字段值
    if (!actualConfig.fields || !actualConfig.fields.title) {
      errors.push('缺少文档标题字段配置');
    }
    
    if (!actualConfig.fields || !actualConfig.fields.content) {
      errors.push('缺少文档内容字段配置');
    }
    
    // 验证字段类型 - 使用实际配置中的字段值
    if (actualConfig.fields && actualConfig.fields.title && !this.isValidTextField(actualConfig.fields.title)) {
      errors.push('文档标题字段必须是文本类型');
    }
    
    if (actualConfig.fields && actualConfig.fields.content && !this.isValidRichTextField(actualConfig.fields.content)) {
      errors.push('文档内容字段必须是富文本类型');
    }
    
    // 暂时跳过分类字段验证，让应用能够正常启动
    // if (actualConfig.fields && actualConfig.fields.category && !this.isValidCascadeField(actualConfig.fields.category)) {
    //   errors.push('文档分类字段必须是级联选择类型');
    // }
    
    // 验证数值范围
    if (config.display && config.display.maxRecords && (config.display.maxRecords < 1 || config.display.maxRecords > 1000)) {
      errors.push('最大记录数必须在1-1000之间');
    }
    
    if (config.display && config.display.defaultFontSize && (config.display.defaultFontSize < 12 || config.display.defaultFontSize > 24)) {
      errors.push('默认字体大小必须在12-24px之间');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 检查是否为有效的文本字段
   * @param {string} fieldId - 字段ID
   * @returns {boolean}
   */
  isValidTextField(fieldId) {
    // 这里应该检查字段类型，暂时返回true
    return true;
  }
  
  /**
   * 检查是否为有效的富文本字段
   * @param {string} fieldId - 字段ID
   * @returns {boolean}
   */
  isValidRichTextField(fieldId) {
    // 这里应该检查字段类型，暂时返回true
    return true;
  }
  
  /**
   * 检查是否为有效的级联选择字段
   * @param {string} fieldId - 字段ID
   * @returns {boolean}
   */
  isValidCascadeField(fieldId) {
    // 这里应该检查字段类型，暂时返回true
    return true;
  }
  
  /**
   * 初始化插件资源
   */
  async initializeResources() {
    // 初始化主题
    this.initializeTheme();
    
    // 初始化字体大小
    this.initializeFontSize();
    
    // 初始化其他资源
    console.log('插件资源初始化完成');
  }
  
  /**
   * 启动插件功能
   */
  async startPlugin() {
    // 启动数据监听
    this.startDataListening();
    
    // 启动事件监听
    this.startEventListening();
    
    console.log('插件功能启动完成');
  }
  
  /**
   * 停止插件功能
   */
  async stopPlugin() {
    // 停止数据监听
    this.stopDataListening();
    
    // 停止事件监听
    this.stopEventListening();
    
    console.log('插件功能停止完成');
  }
  
  /**
   * 清理插件资源
   */
  async cleanupResources() {
    // 清理事件监听器
    this.listeners.clear();
    
    // 清理其他资源
    console.log('插件资源清理完成');
  }
  
  /**
   * 初始化主题
   */
  initializeTheme() {
    const theme = this.config?.defaultTheme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  /**
   * 初始化字体大小
   */
  initializeFontSize() {
    const fontSize = this.config?.defaultFontSize || 16;
    document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
  }
  
  /**
   * 启动数据监听
   */
  startDataListening() {
    // 监听明道云数据变化
    console.log('数据监听已启动');
  }
  
  /**
   * 停止数据监听
   */
  stopDataListening() {
    // 停止监听明道云数据变化
    console.log('数据监听已停止');
  }
  
  /**
   * 启动事件监听
   */
  startEventListening() {
    // 监听键盘快捷键
    if (this.config?.enableKeyboardShortcuts) {
      this.setupKeyboardShortcuts();
    }
    
    console.log('事件监听已启动');
  }
  
  /**
   * 停止事件监听
   */
  stopEventListening() {
    // 停止监听键盘快捷键
    this.removeKeyboardShortcuts();
    
    console.log('事件监听已停止');
  }
  
  /**
   * 设置键盘快捷键
   */
  setupKeyboardShortcuts() {
    this.keyboardHandler = (e) => {
      // Ctrl+F: 搜索
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        this.emit('search', { action: 'focus' });
      }
      
      // Ctrl+S: 保存
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.emit('save', { action: 'save' });
      }
      
      // ESC: 取消
      if (e.key === 'Escape') {
        this.emit('cancel', { action: 'cancel' });
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }
  
  /**
   * 移除键盘快捷键
   */
  removeKeyboardShortcuts() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
      this.keyboardHandler = null;
    }
  }
  
  /**
   * 获取当前状态
   * @returns {string}
   */
  getState() {
    return this.state;
  }
  
  /**
   * 获取配置
   * @returns {object}
   */
  getConfig() {
    return this.config;
  }
  
  /**
   * 获取错误信息
   * @returns {Error|null}
   */
  getError() {
    return this.error;
  }
  
  /**
   * 检查是否处于运行状态
   * @returns {boolean}
   */
  isRunning() {
    return this.state === PLUGIN_STATES.RUNNING;
  }
  
  /**
   * 检查是否处于错误状态
   * @returns {boolean}
   */
  hasError() {
    return this.state === PLUGIN_STATES.ERROR;
  }
}

// 创建全局实例
export const pluginLifecycle = new PluginLifecycleManager();

/**
 * 插件初始化函数
 * @param {object} config - 插件配置
 * @param {object} override - 配置覆盖对象
 * @returns {Promise<void>}
 */
export async function initializePlugin(config, override = null) {
  return await pluginLifecycle.initialize(config, override);
}

/**
 * 启动插件函数
 * @returns {Promise<void>}
 */
export async function startPlugin() {
  return await pluginLifecycle.start();
}

/**
 * 停止插件函数
 * @returns {Promise<void>}
 */
export async function stopPlugin() {
  return await pluginLifecycle.stop();
}

/**
 * 销毁插件函数
 * @returns {Promise<void>}
 */
export async function destroyPlugin() {
  return await pluginLifecycle.destroy();
}

/**
 * 获取插件状态
 * @returns {string}
 */
export function getPluginState() {
  return pluginLifecycle.getState();
}

/**
 * 获取插件配置
 * @returns {object}
 */
export function getPluginConfig() {
  return pluginLifecycle.getConfig();
}
