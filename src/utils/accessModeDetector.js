/**
 * 访问模式检测工具
 * 用于区分内部访问和外部分享访问
 */

/**
 * 检测当前访问模式
 * @param {object} config - 明道云配置对象
 * @param {object} env - 环境变量对象（已废弃isExternal，保留用于兼容）
 * @returns {object} 访问模式信息
 * @returns {boolean} isExternal - 是否为外部访问模式
 * @returns {string} mode - 访问模式标识 ('internal' | 'external' | 'unknown')
 * @returns {object} details - 检测详情
 */
export function detectAccessMode(config, env) {
  const details = {
    urlBased: null,
    configBased: null,
    final: null
  };

  // 方法1: 基于URL检测（包括referrer）
  const urlBased = detectFromURL();
  details.urlBased = urlBased;

  // 方法2: 基于config对象检测（主要检测shareState）
  const configBased = detectFromConfig(config);
  details.configBased = configBased;

  // 优先级：config.shareState > referrer > URL特征
  // 注意：已废弃env.isExternal，不再使用
  let finalMode = 'unknown';
  let isExternal = false;

  if (configBased.mode !== 'unknown') {
    // config对象检测（最可靠，特别是shareState）
    finalMode = configBased.mode;
    isExternal = configBased.isExternal;
    details.final = { source: 'config', ...configBased };
  } else if (urlBased.mode !== 'unknown') {
    // URL检测（包括referrer）
    finalMode = urlBased.mode;
    isExternal = urlBased.isExternal;
    details.final = { source: 'url', ...urlBased };
  } else {
    // 默认内部模式
    finalMode = 'internal';
    isExternal = false;
    details.final = { source: 'default', mode: 'internal', isExternal: false };
  }

  return {
    isExternal,
    mode: finalMode,
    details
  };
}

/**
 * 基于URL检测访问模式
 * @returns {object} 检测结果
 */
function detectFromURL() {
  try {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const referrer = document.referrer;

    // 外部分享地址特征：
    // 1. 域名包含 share.mingdao.net
    // 2. 路径包含 /public/view/
    // 3. referrer包含 share.mingdao.net（重要特征）
    const isShareDomain = hostname.includes('share.mingdao.net');
    const isPublicViewPath = pathname.includes('/public/view/');
    const isShareReferrer = referrer && referrer.includes('share.mingdao.net');

    // 内部嵌入地址特征：
    // 1. 域名是 www.mingdao.com 或主域名
    // 2. 路径包含 /embed/view/
    // 3. referrer是 www.mingdao.com（重要特征）
    const isMainDomain = hostname === 'www.mingdao.com' || hostname.includes('mingdao.com');
    const isEmbedViewPath = pathname.includes('/embed/view/');
    const isMainReferrer = referrer && (referrer.includes('www.mingdao.com') || referrer.includes('mingdao.com'));

    // 优先检查referrer（最可靠的判断依据）
    if (isShareReferrer) {
      return {
        mode: 'external',
        isExternal: true,
        reason: 'referrer包含share.mingdao.net（外部分享特征）',
        hostname,
        pathname,
        referrer
      };
    }

    if (isMainReferrer && !isShareReferrer) {
      return {
        mode: 'internal',
        isExternal: false,
        reason: 'referrer是www.mingdao.com且不包含share.mingdao.net（内部访问特征）',
        hostname,
        pathname,
        referrer
      };
    }

    // 检查URL路径和域名
    if (isShareDomain && isPublicViewPath) {
      return {
        mode: 'external',
        isExternal: true,
        reason: '检测到外部分享域名和路径',
        hostname,
        pathname
      };
    }

    if (isMainDomain && isEmbedViewPath) {
      return {
        mode: 'internal',
        isExternal: false,
        reason: '检测到内部嵌入域名和路径',
        hostname,
        pathname
      };
    }

    // 如果URL中有recordId参数，可能是内部访问
    if (searchParams.has('recordId')) {
      return {
        mode: 'internal',
        isExternal: false,
        reason: 'URL中包含recordId参数（内部访问特征）',
        hostname,
        pathname
      };
    }

    return {
      mode: 'unknown',
      isExternal: false,
      reason: '无法从URL判断访问模式',
      hostname,
      pathname,
      referrer
    };
  } catch (error) {
    console.error('URL检测失败:', error);
    return {
      mode: 'unknown',
      isExternal: false,
      reason: 'URL检测异常',
      error: error.message
    };
  }
}

/**
 * 基于config对象检测访问模式
 * @param {object} config - 明道云配置对象
 * @returns {object} 检测结果
 */
function detectFromConfig(config) {
  if (!config) {
    return {
      mode: 'unknown',
      isExternal: false,
      reason: 'config对象不存在'
    };
  }

  try {
    // 检查config.shareState - 外部分享通常会有shareState
    // 关键判断：如果shareState存在且包含isPublicView: true或shareId，则为外部访问
    if (config.shareState) {
      const hasShareId = config.shareState.shareId || config.shareState.id;
      const isPublicView = config.shareState.isPublicView === true;
      
      // 如果shareState是空对象，可能是内部访问
      const isEmptyObject = Object.keys(config.shareState).length === 0;
      
      if (isEmptyObject) {
        return {
          mode: 'internal',
          isExternal: false,
          reason: 'config.shareState是空对象（内部访问特征）',
          shareState: config.shareState
        };
      }
      
      // 如果包含shareId或isPublicView为true，则为外部访问
      if (hasShareId || isPublicView) {
        return {
          mode: 'external',
          isExternal: true,
          reason: 'config.shareState存在且包含shareId或isPublicView为true',
          shareState: config.shareState
        };
      }
    }

    // 检查config.query - 外部分享可能有特殊查询参数
    if (config.query) {
      // 如果query中有shareId或share相关字段，可能是外部访问
      if (config.query.shareId || config.query.share) {
        return {
          mode: 'external',
          isExternal: true,
          reason: 'config.query中包含shareId或share字段',
          query: config.query
        };
      }

      // 如果query中有recordId，可能是内部访问
      if (config.query.recordId || config.query.rowId) {
        return {
          mode: 'internal',
          isExternal: false,
          reason: 'config.query中包含recordId或rowId（内部访问特征）',
          query: config.query
        };
      }
    }

    // 检查config中是否有明确的分享标识
    if (config.isShare !== undefined) {
      return {
        mode: config.isShare ? 'external' : 'internal',
        isExternal: config.isShare,
        reason: 'config.isShare明确标识',
        isShare: config.isShare
      };
    }

    // 检查config中是否有明确的访问模式标识
    if (config.accessMode) {
      const isExternal = config.accessMode === 'external' || config.accessMode === 'share';
      return {
        mode: isExternal ? 'external' : 'internal',
        isExternal,
        reason: 'config.accessMode明确标识',
        accessMode: config.accessMode
      };
    }

    return {
      mode: 'unknown',
      isExternal: false,
      reason: 'config对象中未找到明确的访问模式标识'
    };
  } catch (error) {
    console.error('config检测失败:', error);
    return {
      mode: 'unknown',
      isExternal: false,
      reason: 'config检测异常',
      error: error.message
    };
  }
}

/**
 * 基于env配置检测访问模式（已废弃）
 * @deprecated 不再使用env.isExternal判断，改为使用config.shareState和referrer
 * @param {object} env - 环境变量对象
 * @returns {object} 检测结果
 */
function detectFromEnv(env) {
  // 已废弃：不再使用env.isExternal进行检测
  return {
    mode: 'unknown',
    isExternal: false,
    reason: 'env.isExternal已废弃，使用config.shareState和referrer判断'
  };
}

/**
 * 获取详细的访问模式信息（用于调试）
 * @param {object} config - 明道云配置对象
 * @param {object} env - 环境变量对象（已废弃isExternal）
 * @returns {object} 详细信息
 */
export function getAccessModeDetails(config, env) {
  const detection = detectAccessMode(config, env);
  
  return {
    ...detection,
    url: {
      href: window.location.href,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer
    },
    config: {
      hasShareState: !!config?.shareState,
      shareState: config?.shareState,
      shareStateIsEmpty: config?.shareState && Object.keys(config.shareState).length === 0,
      shareStateHasShareId: !!(config?.shareState?.shareId || config?.shareState?.id),
      shareStateIsPublicView: config?.shareState?.isPublicView === true,
      hasQuery: !!config?.query,
      query: config?.query,
      hasRecordId: !!(config?.recordId || config?.rowId),
      recordId: config?.recordId || config?.rowId,
      isShare: config?.isShare,
      accessMode: config?.accessMode
    },
    env: {
      hasIsExternal: env?.isExternal !== undefined,
      isExternal: env?.isExternal,
      note: 'env.isExternal已废弃，不再用于检测'
    }
  };
}
