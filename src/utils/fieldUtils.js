/**
 * 明道云字段处理工具函数
 */

/**
 * 根据字段类型获取处理函数
 * @param {number} fieldType - 字段类型编号
 * @returns {function} 处理函数
 */
export function getFieldProcessor(fieldType) {
  const processors = {
    2: value => value, // 文本
    3: value => value, // 手机/电话
    5: value => value, // 邮箱
    6: value => parseFloat(value) || 0, // 数值
    7: value => value, // 证件
    8: value => parseFloat(value) || 0, // 金额
    10: parseMultiSelect, // 多选
    11: parseSingleSelect, // 单选
    14: parseAttachments, // 附件
    15: value => value, // 日期
    19: parseSingleSelect, // 单选(另一种)
    20: parseMultiSelect, // 多选(另一种)
    22: value => value, // 分区标题
    24: parseRegion, // 地区
    25: value => value, // 大写金额
    26: parseMembers, // 成员
    27: parseDepartments, // 部门
    28: value => value, // 等级
    29: parseRelationData, // 关联表
    30: value => value, // 关联文本
    31: value => value, // 公式
    32: value => value, // 文本组合
    33: value => value, // 自动编号
    34: value => value, // 子表
    36: value => value === "1" || value === 1 || value === true, // 布尔值
    37: value => value, // 汇总
    40: parseLocation, // 定位
    41: value => value, // 富文本
    42: value => value, // 签名
    46: value => value, // 时间
    47: value => value, // 条码
    48: parseOrganizeRoles, // 组织角色
    50: parseRelationData, // 关联记录
    52: parseLocation, // 定位(另一种)
    54: parseAttachments, // 附件(另一种)
    // 级联选择字段
    'cascade': parseCascadeSelect
  };
  
  return processors[fieldType] || (value => value);
}

/**
 * 根据字段ID获取字段值
 * @param {string} fieldId - 字段ID
 * @param {object} record - 记录对象
 * @param {array} controls - 控件配置数组
 * @returns {any} 处理后的字段值
 */
export function getFieldValue(fieldId, record, controls) {
  if (!fieldId || !record) return null;
  
  // 获取原始字段值
  const rawValue = record[fieldId];
  if (rawValue === undefined) return null;
  
  // 获取字段控件定义
  const control = controls.find(ctrl => ctrl.controlId === fieldId);
  if (!control) return rawValue; // 未找到控件定义时直接返回原值
  
  // 根据控件类型进行处理
  const processor = getFieldProcessor(control.type);
  return processor(rawValue, control);
}

/**
 * 构建控件映射表
 * @param {array} controls - 控件配置数组
 * @returns {object} 控件映射表
 */
export function buildControlsMap(controls) {
  const controlsMap = {};
  controls.forEach(control => {
    controlsMap[control.controlId] = control;
  });
  return controlsMap;
}

/**
 * 获取字段类型
 * @param {string} fieldId - 字段ID
 * @param {array} controls - 控件配置数组
 * @returns {number|null} 字段类型编号
 */
export function getFieldType(fieldId, controls) {
  const control = controls.find(ctrl => ctrl.controlId === fieldId);
  return control ? control.type : null;
}

/**
 * 单选字段解析
 * @param {string|array} value - 字段值
 * @param {object} control - 控件定义
 * @returns {object} 解析结果
 */
export function parseSingleSelect(value, control) {
  try {
    if (!value) return { key: "", text: "" };
    
    // 解析选项key值
    const keys = typeof value === 'string' 
      ? JSON.parse(value) 
      : (Array.isArray(value) ? value : []);
    
    const selectedKey = keys[0] || "";
    
    // 查找选项文本
    let selectedText = "";
    if (control && control.options) {
      const option = control.options.find(opt => opt.key === selectedKey);
      selectedText = option ? option.value : "";
    }
    
    return {
      key: selectedKey,
      text: selectedText
    };
  } catch (err) {
    console.error("解析单选字段失败:", err);
    return { key: "", text: "" };
  }
}

/**
 * 多选字段解析
 * @param {string|array} value - 字段值
 * @param {object} control - 控件定义
 * @returns {array} 解析结果数组
 */
export function parseMultiSelect(value, control) {
  try {
    if (!value) return [];
    
    // 解析选项key值数组
    const keys = typeof value === 'string' 
      ? JSON.parse(value) 
      : (Array.isArray(value) ? value : []);
    
    // 查找选项文本
    const result = [];
    if (control && control.options) {
      keys.forEach(key => {
        const option = control.options.find(opt => opt.key === key);
        if (option) {
          result.push({
            key: key,
            text: option.value
          });
        }
      });
    } else {
      // 没有控件信息时，只返回key
      keys.forEach(key => {
        result.push({ key, text: "" });
      });
    }
    
    return result;
  } catch (err) {
    console.error("解析多选字段失败:", err);
    return [];
  }
}

/**
 * 级联选择字段解析
 * @param {string|object} value - 字段值
 * @returns {object|null} 解析结果
 */
export function parseCascadeSelect(value) {
  try {
    if (!value) return null;
    
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    
    return {
      level1: data.level1 || '',
      level2: data.level2 || '',
      level3: data.level3 || '',
      fullPath: data.fullPath || '',
      raw: data
    };
  } catch (err) {
    console.error("解析级联选择字段失败:", err);
    return null;
  }
}

/**
 * 成员字段解析
 * @param {string|array} value - 字段值
 * @returns {array} 成员数组
 */
export function parseMembers(value) {
  try {
    if (!value) return [];
    return typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
  } catch (err) {
    console.error("解析成员字段失败:", err);
    return [];
  }
}

/**
 * 部门字段解析
 * @param {string|array} value - 字段值
 * @returns {array} 部门数组
 */
export function parseDepartments(value) {
  try {
    if (!value) return [];
    return typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
  } catch (err) {
    console.error("解析部门字段失败:", err);
    return [];
  }
}

/**
 * 组织角色字段解析
 * @param {string|array} value - 字段值
 * @returns {array} 角色数组
 */
export function parseOrganizeRoles(value) {
  try {
    if (!value) return [];
    return typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
  } catch (err) {
    console.error("解析组织角色字段失败:", err);
    return [];
  }
}

/**
 * 附件字段解析
 * @param {string|array} value - 字段值
 * @returns {array} 附件数组
 */
export function parseAttachments(value) {
  try {
    if (!value) return [];
    return typeof value === 'string' ? JSON.parse(value) : (Array.isArray(value) ? value : []);
  } catch (err) {
    console.error("解析附件字段失败:", err);
    return [];
  }
}

/**
 * 定位字段解析
 * @param {string|object} value - 字段值
 * @returns {object} 定位信息
 */
export function parseLocation(value) {
  try {
    if (!value) return { x: 0, y: 0, address: "", title: "" };
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (err) {
    console.error("解析定位字段失败:", err);
    return { x: 0, y: 0, address: "", title: "" };
  }
}

/**
 * 地区字段解析
 * @param {string|object} value - 字段值
 * @returns {object} 地区信息
 */
export function parseRegion(value) {
  try {
    if (!value) return { province: "", city: "", district: "" };
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (err) {
    console.error("解析地区字段失败:", err);
    return { province: "", city: "", district: "" };
  }
}

/**
 * 关联记录字段解析
 * @param {string|number|array} value - 字段值
 * @returns {array|number} 解析结果
 */
export function parseRelationData(value) {
  try {
    // 如果值是数字，表示关联记录数量
    if (!isNaN(value) && String(value).trim() !== '') {
      return Number(value);
    }
    
    // 尝试解析JSON
    if (!value) return [];
    const relations = typeof value === 'string' ? JSON.parse(value) : value;
    
    if (!Array.isArray(relations)) return [];
    
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
 * 安全获取env中的配置项
 * @param {object} env - 环境变量对象
 * @param {string} key - 配置项key
 * @param {any} defaultValue - 默认值
 * @returns {any} 配置项值
 */
export function getEnvValue(env, key, defaultValue = null) {
  if (!env || !key) return defaultValue;
  
  const value = env[key];
  
  // 处理数组类型(字段选择器)
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : defaultValue;
  }
  
  // 处理普通值
  return value !== undefined ? value : defaultValue;
}
