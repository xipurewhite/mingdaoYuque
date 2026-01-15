import React, { useEffect, useState, useCallback, useRef } from "react";
import { env, config, api, md_emitter } from "mdye";
import Layout from "./components/Layout";
import TreeNavigation from "./components/TreeNavigation";
import RelationTreeNavigation from "./components/RelationTreeNavigation";
import RichTextRenderer from "./components/RichTextRenderer";
import DocumentOutline from "./components/DocumentOutline";
import SearchBar from "./components/SearchBar";
import SettingsPanel from "./components/SettingsPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import ChildDocumentsTable from "./components/ChildDocumentsTable";
import { fetchDocuments, buildDocumentCategories } from "./utils/dataUtils";
import { getReadingStats } from "./utils/readingProgress";
import { initializePlugin, startPlugin, getPluginState } from "./utils/pluginLifecycle";
import { initializeEnvHandler, validateEnv } from "./utils/envHandler";
import { initializeConfigManager, getConfigSummary, getAllConfig } from "./utils/configManager";
import { detectAccessMode, getAccessModeDetails } from "./utils/accessModeDetector";

// 主应用组件

// 获取字段类型名称
function getFieldTypeName(type) {
  const typeMap = {
    2: '文本字段',
    3: '手机/电话',
    5: '邮箱字段',
    6: '数值字段',
    8: '金额字段',
    10: '多选字段',
    11: '单选字段',
    14: '附件字段',
    15: '日期字段',
    19: '单选字段',
    20: '多选字段',
    22: '分区标题',
    24: '地区字段',
    25: '大写金额',
    26: '成员字段',
    27: '部门字段',
    28: '等级字段',
    29: '关联表字段',
    30: '关联文本字段',
    31: '公式字段',
    32: '文本组合字段',
    33: '自动编号字段',
    34: '子表字段',
    36: '检查项字段',
    37: '汇总字段',
    40: '定位字段',
    41: '富文本字段',
    42: '签名字段',
    46: '时间字段',
    47: '条码字段',
    48: '组织角色字段',
    50: '关联记录字段',
    52: '定位字段',
    54: '附件字段',
    'cascade': '级联选择字段'
  };
  return typeMap[type] || '未知字段';
}

export default function App() {
  // 状态管理
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [readingStats, setReadingStats] = useState(null);
  const [pluginState, setPluginState] = useState('initializing');
  const [configSummary, setConfigSummary] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);
  
  // 关联记录树状导航相关状态
  const [useRelationTree, setUseRelationTree] = useState(false);
  const [relationTreeData, setRelationTreeData] = useState(null);

  // 分享功能状态
  // 使用访问模式检测工具自动判断内部/外部访问模式
  // 优先级：config.shareState > referrer > URL特征
  // 注意：已废弃env.isExternal，改为使用config.shareState和referrer判断
  const accessModeDetection = config ? detectAccessMode(config, env) : { isExternal: false, mode: 'internal', details: {} };
  const isExternalMode = accessModeDetection.isExternal;
  
  // 输出详细的调试信息（URL、Config、Env）
  useEffect(() => {
    console.log('========== 详细调试信息 ==========');
    
    // 1. 详细URL信息
    console.log('【URL信息】');
    console.log('完整URL:', window.location.href);
    console.log('协议:', window.location.protocol);
    console.log('主机名:', window.location.hostname);
    console.log('端口:', window.location.port || '(默认)');
    console.log('路径:', window.location.pathname);
    console.log('查询参数:', window.location.search);
    console.log('Hash:', window.location.hash);
    console.log('来源页面:', document.referrer || '(无)');
    console.log('完整URL对象:', {
      href: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
      host: window.location.host,
      hostname: window.location.hostname,
      port: window.location.port,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer
    });
    
    // 解析URL参数
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlParams = {};
      searchParams.forEach((value, key) => {
        urlParams[key] = value;
      });
      console.log('解析后的URL参数:', urlParams);
      
      // 如果hash中有参数
      if (window.location.hash.includes('?')) {
        const hashSearch = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashSearch);
        const hashParamsObj = {};
        hashParams.forEach((value, key) => {
          hashParamsObj[key] = value;
        });
        console.log('Hash中的参数:', hashParamsObj);
      }
    } catch (e) {
      console.error('解析URL参数失败:', e);
    }
    
    console.log(''); // 空行分隔
    
    // 2. 详细Config信息
    console.log('【Config信息】');
    if (config) {
      console.log('Config对象（完整）:', config);
      console.log('Config对象（JSON字符串）:', JSON.stringify(config, null, 2));
      console.log('Config对象键列表:', Object.keys(config));
      
      // 详细输出config的各个字段
      console.log('Config详细字段:');
      console.log('  - appId:', config.appId);
      console.log('  - projectId:', config.projectId);
      console.log('  - worksheetId:', config.worksheetId);
      console.log('  - viewId:', config.viewId);
      console.log('  - recordId:', config.recordId);
      console.log('  - rowId:', config.rowId);
      console.log('  - isShare:', config.isShare);
      console.log('  - accessMode:', config.accessMode);
      
      // query对象
      if (config.query) {
        console.log('  - query对象:', config.query);
        console.log('  - query对象（JSON）:', JSON.stringify(config.query, null, 2));
        console.log('  - query.recordId:', config.query.recordId);
        console.log('  - query.rowId:', config.query.rowId);
        console.log('  - query.shareId:', config.query.shareId);
        console.log('  - query.share:', config.query.share);
      } else {
        console.log('  - query: (不存在)');
      }
      
      // shareState对象
      if (config.shareState) {
        console.log('  - shareState对象:', config.shareState);
        console.log('  - shareState对象（JSON）:', JSON.stringify(config.shareState, null, 2));
        console.log('  - shareState.shareId:', config.shareState.shareId);
        console.log('  - shareState.id:', config.shareState.id);
        console.log('  - shareState.recordId:', config.shareState.recordId);
        console.log('  - shareState.rowId:', config.shareState.rowId);
      } else {
        console.log('  - shareState: (不存在)');
      }
      
      // filters对象
      if (config.filters) {
        console.log('  - filters对象:', config.filters);
        console.log('  - filters对象（JSON）:', JSON.stringify(config.filters, null, 2));
      } else {
        console.log('  - filters: (不存在)');
      }
      
      // view对象
      if (config.view) {
        console.log('  - view对象:', config.view);
        console.log('  - view对象（JSON）:', JSON.stringify(config.view, null, 2));
      } else {
        console.log('  - view: (不存在)');
      }
      
      // controls数组
      if (config.controls) {
        console.log('  - controls数组长度:', config.controls.length);
        console.log('  - controls数组（前3个）:', config.controls.slice(0, 3));
      } else {
        console.log('  - controls: (不存在)');
      }
    } else {
      console.log('Config对象: (不存在)');
    }
    
    console.log(''); // 空行分隔
    
    // 3. 详细Env信息
    console.log('【Env信息】');
    if (env) {
      console.log('Env对象（完整）:', env);
      console.log('Env对象（JSON字符串）:', JSON.stringify(env, null, 2));
      console.log('Env对象键列表:', Object.keys(env));
      
      // 详细输出env的各个字段
      console.log('Env详细字段:');
      Object.keys(env).forEach(key => {
        const value = env[key];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        console.log(`  - ${key}:`, value, `(类型: ${valueType})`);
        
        // 如果是数组，显示详细信息
        if (Array.isArray(value)) {
          console.log(`    - ${key}数组长度:`, value.length);
          console.log(`    - ${key}数组内容:`, value);
          if (value.length > 0) {
            console.log(`    - ${key}[0]:`, value[0]);
          }
        }
      });
      
      // 特别关注isExternal字段
      console.log('  - isExternal (原始值):', env.isExternal);
      console.log('  - isExternal (类型):', typeof env.isExternal);
      console.log('  - isExternal (是否等于true):', env.isExternal === true);
      console.log('  - isExternal (是否等于"true"):', env.isExternal === 'true');
      console.log('  - isExternal (是否等于1):', env.isExternal === 1);
    } else {
      console.log('Env对象: (不存在)');
    }
    
    console.log(''); // 空行分隔
    
    // 4. 访问模式检测结果
    if (config) {
      const details = getAccessModeDetails(config, env);
      console.log('【访问模式检测结果】');
      console.log('最终判断:', {
        isExternal: isExternalMode,
        mode: accessModeDetection.mode,
        source: accessModeDetection.details.final?.source || 'unknown'
      });
      console.log('检测详情:', accessModeDetection.details);
      console.log('完整检测信息:', details);
    }
    
    console.log('====================================');
  }, [config, env, isExternalMode, accessModeDetection]);
  const [initialRecordId, setInitialRecordId] = useState(null);
  // 标记是否已经完成初始文档选中（用于内部模式，避免用户切换文档后被重新选中）
  const hasInitialSelectedRef = useRef(false);
  // 标记文档是否不存在（用于内部分享链接访问时）
  const [documentNotFound, setDocumentNotFound] = useState(false);
  
  // 初始化时解析 URL 参数（仅用于获取recordId，不再用于判断外部模式）
  useEffect(() => {
    try {
      // 兼容两种URL参数获取方式，优先使用 hash router 下的参数
      let searchParams = new URLSearchParams(window.location.search);
      
      // 如果使用 HashRouter，参数可能在 hash 中
      if (window.location.hash.includes('?')) {
        const hashSearch = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashSearch);
        
        // 合并参数
        hashParams.forEach((value, key) => {
          searchParams.append(key, value);
        });
      }
      
      const recordId = searchParams.get('recordId');

      console.log('========== URL参数解析 ==========');
      console.log('recordId:', recordId);
      console.log('完整URL:', window.location.href);
      console.log('search:', window.location.search);
      console.log('hash:', window.location.hash);
      console.log('referrer:', document.referrer);
      console.log('isExternalMode:', isExternalMode);
      
      // 尝试从referrer获取recordId（如果是iframe）
      let referrerRecordId = null;
      if (!recordId && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          referrerRecordId = referrerUrl.searchParams.get('recordId');
          if (referrerRecordId) {
            console.log('从document.referrer获取recordId:', referrerRecordId);
            recordId = referrerRecordId;
          }
        } catch (e) {
          console.warn('解析document.referrer失败:', e);
        }
      }
      
      console.log('================================');

      if (recordId) {
        setInitialRecordId(recordId);
        console.log('检测到初始文档ID:', recordId);
        
        // 外部模式：如果已经有recordId且API和config已就绪，立即触发文档加载
        if (isExternalMode && api && config) {
          console.log('外部模式：检测到recordId，立即触发文档加载');
          // 使用setTimeout确保状态更新后再加载
          setTimeout(() => {
            loadDocuments();
          }, 0);
        }
      } else if (isExternalMode) {
        console.warn('外部模式：未检测到recordId参数');
      }
    } catch (e) {
      console.error('URL参数解析失败:', e);
    }
  }, [isExternalMode, api, config, loadDocuments]);

  // 自动选中分享的文档
  useEffect(() => {
    console.log('========== 自动选中文档useEffect ==========');
    console.log('documents.length:', documents.length);
    console.log('initialRecordId:', initialRecordId);
    console.log('selectedDocument:', selectedDocument?.id, selectedDocument?.title);
    console.log('isExternalMode:', isExternalMode);
    console.log('hasInitialSelectedRef.current:', hasInitialSelectedRef.current);
    
    // 外部模式：如果存在recordId，始终选中对应的文档（不能切换）
    if (isExternalMode && documents.length > 0 && initialRecordId) {
      console.log('外部模式：尝试在文档列表中查找recordId:', initialRecordId);
      const doc = documents.find(d => d.id === initialRecordId);
      if (doc) {
        // 外部模式：始终确保选中指定的文档
        if (!selectedDocument || selectedDocument.id !== initialRecordId) {
          console.log('外部模式：找到并选中指定文档:', doc.title, 'ID:', doc.id);
          setSelectedDocument(doc);
        } else {
          console.log('外部模式：文档已选中，无需重复设置');
        }
      } else {
        console.warn('外部模式：未在文档列表中找到指定文档ID:', initialRecordId);
        console.warn('文档列表IDs（全部）:', documents.map(d => d.id));
      }
    }
    // 内部模式：如果存在recordId，只在初始化时选中一次，之后允许用户切换
    else if (!isExternalMode && documents.length > 0 && initialRecordId && !hasInitialSelectedRef.current) {
      console.log('内部模式：尝试在文档列表中查找recordId（仅初始化）:', initialRecordId);
      console.log('文档列表IDs（前10个）:', documents.slice(0, 10).map(d => d.id));
      const doc = documents.find(d => d.id === initialRecordId);
      if (doc) {
        // 只在没有选中文档时才选中（初始化）
        if (!selectedDocument) {
          console.log('内部模式：找到并选中初始文档:', doc.title, 'ID:', doc.id);
          setSelectedDocument(doc);
          hasInitialSelectedRef.current = true; // 标记已完成初始选中
        } else {
          console.log('内部模式：已有选中文档，跳过初始选中');
          hasInitialSelectedRef.current = true; // 标记已完成初始选中
        }
      } else {
        console.warn('内部模式：未在文档列表中找到指定文档ID:', initialRecordId);
        console.warn('文档列表IDs（全部）:', documents.map(d => d.id));
        hasInitialSelectedRef.current = true; // 即使没找到也标记，避免重复查找
      }
    }
    // 内部模式：如果没有recordId，不自动选择文档，让用户手动选择
    // （已移除自动选择第一个文档的逻辑）
    console.log('==========================================');
  }, [documents, initialRecordId, selectedDocument, isExternalMode, useRelationTree, relationTreeData, categories]);
  
  // 添加调试信息
  console.log('App组件渲染，当前状态:', {
    documentsCount: documents.length,
    categoriesCount: Object.keys(categories).length,
    selectedDocument: selectedDocument?.title,
    loading,
    error
  });
  
  // 获取文档数据
  const loadDocuments = useCallback(async (filterParams = {}, recordIdParam = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // 优先使用传入的recordIdParam，否则使用initialRecordId状态
      const targetRecordId = recordIdParam !== null ? recordIdParam : initialRecordId;
      
      console.log('开始加载文档数据...', filterParams ? '使用筛选条件:' : '', filterParams);
      console.log('配置信息:', { config, env, isExternalMode, initialRecordId, recordIdParam, targetRecordId });
      
      let docs = [];
      
      // 外部模式：只加载指定的recordId文档，不加载其他文档
      if (isExternalMode) {
        if (!targetRecordId) {
          console.warn('外部模式：targetRecordId为空，将显示"文档不存在"');
          console.warn('调试信息:', { recordIdParam, initialRecordId, targetRecordId });
          // 不设置error，而是设置一个空文档列表，让UI正常显示，正文部分会显示"文档不存在"
          setDocuments([]);
          setSelectedDocument(null);
          setLoading(false);
          return;
        }
        
        console.log('外部模式：只加载指定文档，recordId:', targetRecordId);
        try {
          // 使用getRowDetail获取单个文档详情
          const result = await api.getRowDetail({
            appId: config.appId,
            worksheetId: config.worksheetId,
            viewId: config.viewId,
            rowId: targetRecordId,
            getTemplate: false
          });
          
          console.log('getRowDetail API调用结果:', result);
          
          // 处理不同的返回数据格式
          let record = null;
          if (result && result.data) {
            record = result.data;
          } else if (result && result.rowData) {
            try {
              record = typeof result.rowData === 'string' ? JSON.parse(result.rowData) : result.rowData;
            } catch (parseError) {
              console.error('解析rowData失败:', parseError);
              throw new Error('无法解析返回的数据格式');
            }
          } else {
            console.warn('getRowDetail返回的数据格式不正确:', result);
            // 检查是否是文档不存在的情况
            if (result && (result.resultCode === 0 || result.state === 0 || result.error)) {
              throw new Error('DOCUMENT_NOT_FOUND');
            }
            throw new Error('API返回数据格式不正确');
          }
          
          if (record && record.rowid) {
            // 获取字段ID配置
            const titleFieldId = env.titleFieldId?.[0];
            const contentFieldId = env.contentFieldId?.[0];
            
            // 构建文档对象
            const doc = {
              id: record.rowid || targetRecordId,
              title: record[titleFieldId] || '未命名文档',
              content: record[contentFieldId] || '',
              createTime: record.ctime || '',
              updateTime: record.utime || '',
              rawRecord: record
            };
            
            // 解析创建人和修改人信息
            try {
              if (record.caid) {
                const creatorData = typeof record.caid === 'string' ? JSON.parse(record.caid) : record.caid;
                doc.creator = creatorData[0]?.fullname || '未知';
              }
              if (record.uaid) {
                const modifierData = typeof record.uaid === 'string' ? JSON.parse(record.uaid) : record.uaid;
                doc.lastModifier = modifierData[0]?.fullname || '未知';
                doc.uaid = record.uaid;
              }
            } catch (err) {
              console.error('解析用户信息失败:', err);
            }
            
            docs = [doc];
            console.log('========== 外部模式：成功加载指定文档 ==========');
            console.log('recordId:', initialRecordId);
            console.log('文档信息:', {
              id: doc.id,
              title: doc.title,
              contentLength: doc.content?.length || 0,
              hasContent: !!(doc.content && doc.content.trim()),
              createTime: doc.createTime,
              updateTime: doc.updateTime,
              creator: doc.creator,
              lastModifier: doc.lastModifier
            });
            console.log('字段配置:', {
              titleFieldId: titleFieldId,
              contentFieldId: contentFieldId
            });
            console.log('原始记录字段:', {
              recordKeys: Object.keys(record || {}),
              hasRowid: !!record.rowid,
              contentFieldValue: record[contentFieldId] ? (typeof record[contentFieldId] === 'string' ? record[contentFieldId].substring(0, 100) + '...' : record[contentFieldId]) : null
            });
            console.log('==========================================');
          } else {
            console.warn('外部模式：未找到指定文档', initialRecordId);
            throw new Error('DOCUMENT_NOT_FOUND');
          }
        } catch (err) {
          console.error('========== 外部模式：加载指定文档失败 ==========');
          console.error('recordId:', initialRecordId);
          console.error('错误信息:', err);
          console.error('==========================================');
          // 如果是文档不存在，设置特殊错误信息
          const errorMessage = err.message || err.toString() || '';
          if (errorMessage === 'DOCUMENT_NOT_FOUND' || 
              errorMessage.includes('不存在') || 
              errorMessage.includes('not found') ||
              errorMessage.includes('Not Found') ||
              errorMessage.includes('404')) {
            setError('DOCUMENT_NOT_FOUND');
            // 确保不选中任何文档
            setSelectedDocument(null);
          } else {
            setError(`加载文档失败: ${errorMessage}`);
          }
          docs = [];
        }
      } else {
        // 正常模式：加载所有文档
        docs = await fetchDocuments(api, config, env, filterParams);
        console.log('获取到的文档:', docs);
      }
      
      setDocuments(docs);
      
      // 外部模式：不计算树形导航结构
      let treeData = null;
      let cats = null;
      let useRelationTreeFlag = false;
      
      if (isExternalMode) {
        console.log('外部模式：跳过树形导航结构计算');
        setUseRelationTree(false);
        setCategories({});
        setRelationTreeData(null);
      } else {
        // 正常模式：检查是否使用关联记录树状结构
        const parentFieldId = env.parent_id?.[0];
        const childrenFieldId = env.children?.[0];
        const categoryFieldId = env.category?.[0];
        
        console.log('字段配置检查:', {
          parentFieldId,
          childrenFieldId,
          categoryFieldId,
          hasParentField: !!parentFieldId,
          hasChildrenField: !!childrenFieldId
        });
        
        // 优先使用关联记录树状结构
        if (parentFieldId && childrenFieldId && docs.length > 0) {
          console.log('使用关联记录树状结构');
          useRelationTreeFlag = true;
          setUseRelationTree(true);
          
          // 构建关联记录树状结构
          const { buildRelationTree } = await import('./utils/dataUtils');
          treeData = buildRelationTree(docs, parentFieldId, childrenFieldId);
          setRelationTreeData(treeData);
          
          // 清空传统分类结构
          setCategories({});
        } else if (categoryFieldId && docs.length > 0) {
          console.log('使用传统级联选择分类结构');
          useRelationTreeFlag = false;
          setUseRelationTree(false);
          
          cats = buildDocumentCategories(docs, categoryFieldId);
          console.log('构建的分类结构:', cats);
          setCategories(cats);
          
          // 清空关联记录树状结构
          setRelationTreeData(null);
        } else {
          console.log('使用默认文档列表');
          useRelationTreeFlag = false;
          setUseRelationTree(false);
          
          // 如果没有分类字段，将所有文档放到"所有文档"分类中
          cats = {
            '所有文档': {
              name: '所有文档',
              documents: docs
            }
          };
          setCategories(cats);
          
          // 清空关联记录树状结构
          setRelationTreeData(null);
        }
      }
      
      // 检查当前选中的文档是否在新的文档列表中
      let currentSelectedDoc = selectedDocument;
      if (currentSelectedDoc) {
        const isStillVisible = docs.some(doc => doc.id === currentSelectedDoc.id);
        if (!isStillVisible) {
          console.log('当前文档不在筛选范围内，隐藏当前文档');
          currentSelectedDoc = null;
          setSelectedDocument(null);
        }
      }
      
      // 外部模式：如果存在recordId，必须选中对应的文档（不能切换）
      // 内部模式：如果存在recordId且还没有完成初始选中，选中对应的文档（仅初始化一次）
      // 优先使用传入的recordIdParam，否则使用initialRecordId状态
      const targetRecordIdForSelect = recordIdParam !== null ? recordIdParam : initialRecordId;
      
      if (targetRecordIdForSelect && docs.length > 0) {
        const targetDoc = docs.find(d => d.id === targetRecordIdForSelect);
        if (targetDoc) {
          if (isExternalMode) {
            // 外部模式：始终确保选中指定的文档
            if (!currentSelectedDoc || currentSelectedDoc.id !== targetRecordIdForSelect) {
              console.log('外部模式：在loadDocuments中选中指定文档:', targetDoc.title, 'ID:', targetDoc.id);
              setSelectedDocument(targetDoc);
            } else {
              console.log('外部模式：文档已选中，无需重复设置');
            }
          } else {
            // 内部模式：只在还没有完成初始选中时选中（避免覆盖用户的选择）
            if (!hasInitialSelectedRef.current && !currentSelectedDoc) {
              console.log('内部模式：在loadDocuments中选中初始文档:', targetDoc.title, 'ID:', targetDoc.id);
              setSelectedDocument(targetDoc);
              hasInitialSelectedRef.current = true; // 标记已完成初始选中
            } else if (hasInitialSelectedRef.current) {
              console.log('内部模式：已完成初始选中，保持当前选中文档');
            } else {
              console.log('内部模式：已有选中文档，跳过初始选中');
              hasInitialSelectedRef.current = true; // 标记已完成初始选中
            }
          }
        } else {
          console.warn(`${isExternalMode ? '外部' : '内部'}模式：在loadDocuments中未找到指定文档ID:`, targetRecordIdForSelect);
          console.warn('可用文档IDs（全部）:', docs.map(d => d.id));
          
          // 内部模式：如果从URL参数获取到了recordId但在文档列表中找不到，尝试使用getRowDetail API直接获取
          if (!isExternalMode && targetRecordIdForSelect) {
            console.log('内部模式：尝试使用getRowDetail API直接获取指定文档:', targetRecordIdForSelect);
            try {
              const result = await api.getRowDetail({
                appId: config.appId,
                worksheetId: config.worksheetId,
                viewId: config.viewId,
                rowId: targetRecordIdForSelect,
                getTemplate: false
              });
              
              console.log('getRowDetail API调用结果:', result);
              
              // 处理不同的返回数据格式
              let record = null;
              if (result && result.data) {
                record = result.data;
              } else if (result && result.rowData) {
                try {
                  record = typeof result.rowData === 'string' ? JSON.parse(result.rowData) : result.rowData;
                } catch (parseError) {
                  console.error('解析rowData失败:', parseError);
                  record = null;
                }
              }
              
              if (record && record.rowid) {
                // 获取字段ID配置
                const titleFieldId = env.titleFieldId?.[0];
                const contentFieldId = env.contentFieldId?.[0];
                
                // 构建文档对象
                const doc = {
                  id: record.rowid || targetRecordIdForSelect,
                  title: record[titleFieldId] || '未命名文档',
                  content: record[contentFieldId] || '',
                  createTime: record.ctime || '',
                  updateTime: record.utime || '',
                  rawRecord: record
                };
                
                // 解析创建人和修改人信息
                try {
                  if (record.caid) {
                    const creatorData = typeof record.caid === 'string' ? JSON.parse(record.caid) : record.caid;
                    doc.creator = creatorData[0]?.fullname || '未知';
                  }
                  if (record.uaid) {
                    const modifierData = typeof record.uaid === 'string' ? JSON.parse(record.uaid) : record.uaid;
                    doc.lastModifier = modifierData[0]?.fullname || '未知';
                    doc.uaid = record.uaid;
                  }
                } catch (err) {
                  console.error('解析用户信息失败:', err);
                }
                
                console.log('内部模式：通过getRowDetail成功获取到指定文档:', doc.title, 'ID:', doc.id);
                setSelectedDocument(doc);
                setDocumentNotFound(false);
                hasInitialSelectedRef.current = true;
              } else {
                // 文档不存在
                console.warn('内部模式：getRowDetail未找到指定文档');
                setDocumentNotFound(true);
                setSelectedDocument(null);
                hasInitialSelectedRef.current = true;
              }
            } catch (err) {
              console.error('内部模式：getRowDetail获取文档失败:', err);
              // 检查是否是文档不存在的情况
              const errorMessage = err.message || err.toString() || '';
              if (errorMessage.includes('不存在') || 
                  errorMessage.includes('not found') ||
                  errorMessage.includes('Not Found') ||
                  errorMessage.includes('404')) {
                setDocumentNotFound(true);
                setSelectedDocument(null);
              } else {
                setDocumentNotFound(false);
              }
              hasInitialSelectedRef.current = true;
            }
          } else {
            if (!isExternalMode) {
              hasInitialSelectedRef.current = true; // 即使没找到也标记，避免重复查找
            }
            // 外部模式下，如果找不到文档，设置文档不存在状态
            if (isExternalMode) {
              setDocumentNotFound(true);
            }
          }
        }
      }
      // 内部模式：如果没有recordId，不自动选择文档，让用户手动选择
      // （已移除自动选择第一个文档的逻辑）
      
    } catch (err) {
      console.error('加载文档失败:', err);
      setError(err.message || '加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [api, config, env, selectedDocument, isExternalMode, initialRecordId]);
  
  // 初始化应用
  const initializeApp = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 初始化环境变量处理器
      initializeEnvHandler(env, config);
      
      // 获取可用字段列表
      const fields = config.controls || [];
      const fieldOptions = fields.map(field => ({
        id: field.controlId,
        name: field.controlName,
        type: field.type,
        typeName: getFieldTypeName(field.type)
      }));
      setAvailableFields(fieldOptions);
      
      // 添加调试信息
      console.log('环境变量调试信息:', {
        env: env,
        titleFieldId: env.titleFieldId,
        contentFieldId: env.contentFieldId,
        categoryFieldId: env.categoryFieldId
      });
      
      // 验证环境变量
      const envValidation = validateEnv();
      if (!envValidation.valid) {
        throw new Error(`环境变量验证失败: ${envValidation.errors.join(', ')}`);
      }
      
      // 初始化配置管理器
      const configData = {
        fields: {
          title: env.titleFieldId?.[0] || '',
          content: env.contentFieldId?.[0] || '',
          category: env.categoryFieldId?.[0] || ''
        },
        features: {
          showSearch: env.showSearch !== false,
          showOutline: env.showOutline !== false,
          autoSaveProgress: env.autoSaveProgress !== false,
          enableKeyboardShortcuts: env.enableKeyboardShortcuts !== false
        },
        display: {
          defaultTheme: env.defaultTheme || 'light',
          defaultFontSize: parseInt(env.defaultFontSize) || 16,
          maxRecords: parseInt(env.maxRecords) || 100
        }
      };
      
      console.log('配置数据调试信息:', configData);
      initializeConfigManager(configData);
      
      // 初始化插件生命周期
      await initializePlugin(getAllConfig());
      
      // 启动插件
      await startPlugin();
      
      // 加载数据
      // 外部模式：只加载指定的recordId文档，不加载所有文档
      // 正常模式：直接加载所有文档
      if (isExternalMode) {
        // 外部模式下，尝试从多个来源获取recordId
        let recordId = initialRecordId;
        
        // 如果initialRecordId还没有设置，尝试从URL参数中获取
        if (!recordId) {
          try {
            const searchParams = new URLSearchParams(window.location.search);
            recordId = searchParams.get('recordId');
            if (recordId) {
              console.log('外部模式：从URL参数获取recordId:', recordId);
              setInitialRecordId(recordId);
            }
          } catch (e) {
            console.error('外部模式：解析URL参数失败:', e);
          }
        }
        
        // 尝试从config中获取recordId（如果明道云通过config传递）
        if (!recordId && config) {
          console.log('========== 外部模式：检查config对象 ==========');
          console.log('config对象完整内容（JSON）:', JSON.stringify(config, null, 2));
          console.log('config.query:', config.query);
          console.log('config.shareState:', config.shareState);
          console.log('config.filters:', config.filters);
          console.log('config.view:', config.view);
          if (config.query) {
            console.log('config.query完整内容（JSON）:', JSON.stringify(config.query, null, 2));
          }
          if (config.shareState) {
            console.log('config.shareState完整内容（JSON）:', JSON.stringify(config.shareState, null, 2));
          }
          console.log('==========================================');
          
          // 检查config中是否有recordId相关字段
          if (config.recordId) {
            recordId = config.recordId;
            console.log('外部模式：从config.recordId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.rowId) {
            recordId = config.rowId;
            console.log('外部模式：从config.rowId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.query && config.query.recordId) {
            recordId = config.query.recordId;
            console.log('外部模式：从config.query.recordId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.query && config.query.rowId) {
            recordId = config.query.rowId;
            console.log('外部模式：从config.query.rowId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.shareState && config.shareState.recordId) {
            recordId = config.shareState.recordId;
            console.log('外部模式：从config.shareState.recordId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.shareState && config.shareState.rowId) {
            recordId = config.shareState.rowId;
            console.log('外部模式：从config.shareState.rowId获取recordId:', recordId);
            setInitialRecordId(recordId);
          } else if (config.filters && typeof config.filters === 'object') {
            // 尝试从filters中查找recordId
            console.log('外部模式：检查config.filters中的所有字段');
            const filterKeys = Object.keys(config.filters);
            for (const key of filterKeys) {
              console.log(`config.filters[${key}]:`, config.filters[key]);
              if (key.toLowerCase().includes('recordid') || key.toLowerCase().includes('rowid')) {
                recordId = config.filters[key];
                console.log(`外部模式：从config.filters.${key}获取recordId:`, recordId);
                setInitialRecordId(recordId);
                break;
              }
            }
          }
        }
        
        if (recordId) {
          console.log('外部模式：检测到recordId，准备加载指定文档:', recordId);
          // 设置状态（用于后续使用）
          setInitialRecordId(recordId);
          // 直接传递recordId给loadDocuments，避免状态更新延迟问题
          await loadDocuments({}, recordId);
        } else {
          console.warn('========== 外部模式：未检测到recordId ==========');
          console.warn('调试信息:', {
            initialRecordId,
            windowLocationHref: window.location.href,
            windowLocationSearch: window.location.search,
            windowLocationHash: window.location.hash,
            documentReferrer: document.referrer,
            configKeys: config ? Object.keys(config) : null,
            configQuery: config?.query,
            configShareState: config?.shareState,
            configFilters: config?.filters
          });
          console.warn('完整config对象（JSON）:', JSON.stringify(config, null, 2));
          console.warn('==========================================');
          // 不设置error，而是设置一个空文档列表，让UI正常显示，正文部分会显示"文档不存在"
          setDocuments([]);
          setSelectedDocument(null);
          setLoading(false);
        }
      } else {
        // 正常模式：尝试从URL参数中获取recordId（如果存在）
        let recordId = initialRecordId;
        
        // 如果initialRecordId还没有设置，尝试从URL参数中获取
        if (!recordId) {
          try {
            console.log('========== 正常模式：解析URL参数获取recordId ==========');
            console.log('window.location.href:', window.location.href);
            console.log('window.location.search:', window.location.search);
            console.log('window.location.hash:', window.location.hash);
            
            // 兼容两种URL参数获取方式，优先使用 hash router 下的参数
            let searchParams = new URLSearchParams(window.location.search);
            
            // 如果使用 HashRouter，参数可能在 hash 中
            if (window.location.hash.includes('?')) {
              const hashSearch = window.location.hash.split('?')[1];
              const hashParams = new URLSearchParams(hashSearch);
              
              // 合并参数
              hashParams.forEach((value, key) => {
                searchParams.append(key, value);
              });
            }
            
            recordId = searchParams.get('recordId');
            
            if (recordId) {
              console.log('正常模式：从URL参数获取recordId:', recordId);
              setInitialRecordId(recordId);
            } else {
              console.log('正常模式：URL中未找到recordId参数');
            }
            
            // 尝试从referrer获取recordId（如果是iframe）
            if (!recordId && document.referrer) {
              try {
                const referrerUrl = new URL(document.referrer);
                recordId = referrerUrl.searchParams.get('recordId');
                if (recordId) {
                  console.log('正常模式：从document.referrer获取recordId:', recordId);
                  setInitialRecordId(recordId);
                }
              } catch (e) {
                console.warn('正常模式：解析document.referrer失败:', e);
              }
            }
            
            // 尝试从config中获取recordId（如果明道云通过config传递）
            if (!recordId && config) {
              console.log('正常模式：检查config对象中的recordId');
              if (config.recordId) {
                recordId = config.recordId;
                console.log('正常模式：从config.recordId获取recordId:', recordId);
                setInitialRecordId(recordId);
              } else if (config.rowId) {
                recordId = config.rowId;
                console.log('正常模式：从config.rowId获取recordId:', recordId);
                setInitialRecordId(recordId);
              } else if (config.query && config.query.recordId) {
                recordId = config.query.recordId;
                console.log('正常模式：从config.query.recordId获取recordId:', recordId);
                setInitialRecordId(recordId);
              } else if (config.query && config.query.rowId) {
                recordId = config.query.rowId;
                console.log('正常模式：从config.query.rowId获取recordId:', recordId);
                setInitialRecordId(recordId);
              } else if (config.shareState && config.shareState.recordId) {
                recordId = config.shareState.recordId;
                console.log('正常模式：从config.shareState.recordId获取recordId:', recordId);
                setInitialRecordId(recordId);
              } else if (config.shareState && config.shareState.rowId) {
                recordId = config.shareState.rowId;
                console.log('正常模式：从config.shareState.rowId获取recordId:', recordId);
                setInitialRecordId(recordId);
              }
            }
            
            console.log('正常模式：最终recordId:', recordId);
            console.log('==========================================');
          } catch (e) {
            console.error('正常模式：解析URL参数失败:', e);
          }
        } else {
          console.log('正常模式：使用已设置的initialRecordId:', recordId);
        }
        
        // 正常模式：加载所有文档（recordId会在loadDocuments和useEffect中自动选中）
        console.log('正常模式：开始加载所有文档，recordId:', recordId);
        // 如果获取到了recordId，设置状态（用于后续使用）并传递给loadDocuments，避免状态更新延迟问题
        if (recordId) {
          setInitialRecordId(recordId);
          // 直接传递recordId给loadDocuments，确保能正确选中初始文档
          await loadDocuments({}, recordId);
        } else {
          await loadDocuments();
        }
      }
      
      // 加载阅读统计
      setReadingStats(getReadingStats());
      
      // 更新状态
      setPluginState(getPluginState());
      setConfigSummary(getConfigSummary());
      
    } catch (err) {
      console.error('应用初始化失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 组件挂载时初始化
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // 处理筛选条件更新（使用useCallback确保函数引用稳定）
  const handleFiltersUpdate = useCallback((filterData) => {
    console.log('筛选条件已更新:', filterData);
    console.log('筛选条件数据类型:', typeof filterData);
    
    // 根据.cursorrules中的示例，filterData 应该直接是可以展开的筛选条件对象
    // 直接使用 filterData 作为筛选参数，如果它本身不是对象，则创建一个空对象
    let filterParams = {};
    
    if (filterData && typeof filterData === 'object') {
      // 直接使用 filterData，按照.cursorrules中的示例，应该直接展开使用
      filterParams = { ...filterData };
      console.log('构建的筛选参数（直接展开）:', filterParams);
    } else {
      console.warn('筛选条件数据格式不正确:', filterData);
      filterParams = {};
    }
    
    // 使用新的筛选条件重新加载文档列表
    console.log('开始使用筛选条件重新加载文档:', filterParams);
    loadDocuments(filterParams);
  }, [loadDocuments, config]);

  // 处理新增记录事件（使用useCallback确保函数引用稳定）
  const handleNewRecord = useCallback((newRecord) => {
    console.log('新增记录:', newRecord);
    
    // 外部模式：禁用新增记录功能，不响应新增记录事件
    if (isExternalMode) {
      console.log('外部模式：新增记录功能已禁用，忽略新增记录事件');
      return;
    }
    
    // 当有新增记录时，重新加载文档列表以显示新记录
    // 不传递筛选参数，使用当前的筛选条件（如果有的话）
    console.log('检测到新增记录，重新加载文档列表');
    loadDocuments();
  }, [loadDocuments, isExternalMode]);

  // 监听明道云筛选条件变更事件
  useEffect(() => {
    // 注册事件监听（使用 md_emitter.addListener，兼容 .cursorrules 中的示例）
    if (md_emitter && md_emitter.addListener) {
      md_emitter.addListener('filters-update', handleFiltersUpdate);
      console.log('已注册筛选条件更新事件监听');
    } else if (md_emitter && md_emitter.on) {
      // 兼容 on 方法
      md_emitter.on('filters-update', handleFiltersUpdate);
      console.log('已注册筛选条件更新事件监听（使用on方法）');
    } else {
      console.warn('md_emitter 不可用，无法监听筛选条件更新事件');
    }
    
    // 组件卸载时移除事件监听
    return () => {
      if (md_emitter && md_emitter.removeListener) {
        md_emitter.removeListener('filters-update', handleFiltersUpdate);
        console.log('已移除筛选条件更新事件监听');
      } else if (md_emitter && md_emitter.off) {
        // 兼容 off 方法
        md_emitter.off('filters-update', handleFiltersUpdate);
        console.log('已移除筛选条件更新事件监听（使用off方法）');
      }
    };
  }, [handleFiltersUpdate]);

  // 监听明道云新增记录事件（外部模式下禁用）
  useEffect(() => {
    // 外部模式：不注册新增记录事件监听
    if (isExternalMode) {
      console.log('外部模式：新增记录功能已禁用，不注册新增记录事件监听');
      return;
    }
    
    // 注册事件监听（使用 md_emitter.addListener，兼容 .cursorrules 中的示例）
    if (md_emitter && md_emitter.addListener) {
      md_emitter.addListener('new-record', handleNewRecord);
      console.log('已注册新增记录事件监听');
    } else if (md_emitter && md_emitter.on) {
      // 兼容 on 方法
      md_emitter.on('new-record', handleNewRecord);
      console.log('已注册新增记录事件监听（使用on方法）');
    } else {
      console.warn('md_emitter 不可用，无法监听新增记录事件');
    }
    
    // 组件卸载时移除事件监听
    return () => {
      if (md_emitter && md_emitter.removeListener) {
        md_emitter.removeListener('new-record', handleNewRecord);
        console.log('已移除新增记录事件监听');
      } else if (md_emitter && md_emitter.off) {
        // 兼容 off 方法
        md_emitter.off('new-record', handleNewRecord);
        console.log('已移除新增记录事件监听（使用off方法）');
      }
    };
  }, [handleNewRecord, isExternalMode]);
  
  // 处理文档选择
  const handleDocumentSelect = useCallback((document) => {
    console.log('选择文档:', document);
    setSelectedDocument(document);
    // 清除文档不存在状态
    setDocumentNotFound(false);
  }, []);
  
  // 处理富文本内容变化（用于生成大纲）
  const handleContentChange = useCallback((content) => {
    // 这里可以添加额外的内容变化处理逻辑
    console.log('内容变化:', content ? '有内容' : '无内容');
  }, []);
  
  // 处理搜索
  const handleSearch = useCallback((results) => {
    setSearchResults(results);
    setIsSearching(true);
  }, []);
  
  // 处理搜索文档选择
  const handleSearchDocumentSelect = useCallback((document) => {
    setSelectedDocument(document);
    setIsSearching(false);
    setSearchResults([]);
  }, []);
  
  // 处理设置面板
  const handleSettingsToggle = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);
  
  // 处理配置面板
  // 处理配置变化
  const handleConfigChange = useCallback((configData) => {
    console.log('配置变化:', configData);
    setConfigSummary(configData);
  }, []);
  
  // 处理配置保存
  const handleConfigSave = useCallback(async (configData) => {
    try {
      console.log('保存配置:', configData);
      // 这里应该调用明道云API保存配置
      setConfigSummary(configData);
      setShowSettings(false);
    } catch (error) {
      console.error('保存配置失败:', error);
      setError('保存配置失败: ' + error.message);
    }
  }, []);
  
  
  // 处理主题变化
  const handleThemeChange = useCallback((theme) => {
    console.log('主题切换为:', theme);
  }, []);
  
  // 处理字体大小变化
  const handleFontSizeChange = useCallback((fontSize) => {
    console.log('字体大小切换为:', fontSize);
  }, []);
  
  // 处理阅读模式变化
  const handleReadingModeChange = useCallback((mode) => {
    console.log('阅读模式切换为:', mode);
  }, []);
  
  // 渲染左侧导航
  const renderLeftSidebar = () => {
    // 外部模式：不显示树形导航区域
    if (isExternalMode) {
      return null;
    }
    
    return (
      <div>
        <SearchBar
          documents={documents}
          onSearch={handleSearch}
          onSelectDocument={handleSearchDocumentSelect}
          placeholder="搜索文档..."
        />
        {useRelationTree ? (
          <RelationTreeNavigation
            documents={documents}
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocument?.id}
            api={api}
            config={config}
            parentFieldId={env.parent_id?.[0]}
            childrenFieldId={env.children?.[0]}
          />
        ) : (
          <TreeNavigation
            categories={categories}
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocument?.id}
          />
        )}
      </div>
    );
  };
  
  // 渲染主内容区
  const renderMainContent = () => {
    // 外部模式：如果文档不存在或没有recordId，显示特殊提示
    // 检查条件：外部模式 && (错误是DOCUMENT_NOT_FOUND || 没有选中文档且没有加载中且文档列表为空)
    const isExternalDocumentNotFound = isExternalMode && (
      error === 'DOCUMENT_NOT_FOUND' || 
      (!selectedDocument && !loading && documents.length === 0)
    );
    
    // 内部模式：如果设置了documentNotFound状态，显示文档不存在提示
    const isInternalDocumentNotFound = !isExternalMode && documentNotFound && !loading;
    
    return (
      <div>
        {isExternalDocumentNotFound || isInternalDocumentNotFound ? (
          <RichTextRenderer
            content=""
            title=""
            documentId={null}
            onContentChange={handleContentChange}
            isExternalMode={isExternalMode}
            documentNotFound={true}
          />
        ) : (
          <>
            <RichTextRenderer
              content={selectedDocument?.content}
              title={selectedDocument?.title}
              documentId={selectedDocument?.id}
              onContentChange={handleContentChange}
              isExternalMode={isExternalMode}
              documentNotFound={false}
            />
            {/* 子级文档表格 */}
            <ChildDocumentsTable
              currentDocumentId={selectedDocument?.id}
              onDocumentSelect={handleDocumentSelect}
              visible={!!selectedDocument}
            />
          </>
        )}
      </div>
    );
  };
  
  // 渲染右侧大纲
  const renderRightSidebar = () => (
    <DocumentOutline
      content={selectedDocument?.content}
      onHeadingChange={(headingId) => {
        // 这里可以添加标题变化的处理逻辑
        console.log('当前活跃标题:', headingId);
      }}
    />
  );
  
  // 刷新当前文档内容
  const refreshCurrentDocument = useCallback(async () => {
    if (!selectedDocument || !config) {
      console.log('没有选中的文档或配置，跳过刷新');
      return;
    }

    try {
      console.log('开始刷新当前文档:', selectedDocument.id);
      console.log('刷新参数:', {
        appId: config.appId,
        worksheetId: config.worksheetId,
        viewId: config.viewId,
        rowId: selectedDocument.id
      });
      
      // 获取单个文档的详细信息
      const result = await api.getRowDetail({
        appId: config.appId,
        worksheetId: config.worksheetId,
        viewId: config.viewId,
        rowId: selectedDocument.id,
        getTemplate: false
      });

      console.log('getRowDetail API调用结果:', result);

      // 处理不同的返回数据格式
      let updatedRecord = null;
      if (result && result.data) {
        // 标准格式：result.data
        updatedRecord = result.data;
      } else if (result && result.rowData) {
        // 新格式：result.rowData 是JSON字符串
        try {
          updatedRecord = JSON.parse(result.rowData);
          console.log('解析rowData成功:', updatedRecord);
        } catch (parseError) {
          console.error('解析rowData失败:', parseError);
          throw new Error('无法解析返回的数据格式');
        }
      } else {
        console.warn('getRowDetail返回的数据格式不正确:', result);
        throw new Error('API返回数据格式不正确');
      }

      if (updatedRecord) {
        console.log('获取到更新后的文档数据:', updatedRecord);
        
        // 处理更新后的数据
        const titleFieldId = env.titleFieldId?.[0];
        const contentFieldId = env.contentFieldId?.[0];
        const categoryFieldId = env.categoryFieldId?.[0];
        
        console.log('字段ID配置:', {
          titleFieldId,
          contentFieldId,
          categoryFieldId
        });
        
        const updatedDocument = {
          id: updatedRecord.rowid,
          title: updatedRecord[titleFieldId] || selectedDocument.title,
          content: updatedRecord[contentFieldId] || selectedDocument.content,
          category: selectedDocument.category, // 分类信息保持不变
          createTime: updatedRecord.ctime,
          updateTime: updatedRecord.utime,
          creator: selectedDocument.creator, // 创建人保持不变
          uaid: updatedRecord.uaid,
          utime: updatedRecord.utime,
          rawRecord: updatedRecord
        };
        
        console.log('更新后的文档对象:', updatedDocument);
        console.log('内容对比:', {
          原内容长度: selectedDocument.content?.length || 0,
          新内容长度: updatedDocument.content?.length || 0,
          内容是否变化: selectedDocument.content !== updatedDocument.content
        });
        
        // 更新当前选中的文档
        setSelectedDocument(updatedDocument);
        
        // 更新文档列表中的对应文档
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === selectedDocument.id ? updatedDocument : doc
          )
        );
        
        console.log('文档内容刷新完成');
      }
    } catch (error) {
      console.error('刷新文档内容失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        selectedDocument: selectedDocument,
        config: config
      });
    }
  }, [selectedDocument, config, env]);

  // 处理编辑成功
  const handleEditSuccess = useCallback((updatedDocument) => {
    console.log('文档编辑成功:', updatedDocument);
    
    // 刷新当前文档内容
    refreshCurrentDocument();
    
    // 重新加载文档列表，确保列表数据是最新的
    loadDocuments();
  }, [refreshCurrentDocument, config, loadDocuments]);

  // 处理编辑失败
  const handleEditError = useCallback((error) => {
    console.error('文档编辑失败:', error);
    // 可以在这里显示错误提示
  }, []);
  
  // 处理删除成功
  const handleDeleteSuccess = useCallback((deletedDocument) => {
    console.log('文档删除成功:', deletedDocument);
    
    // 如果删除的是当前选中的文档，清除选中状态
    if (selectedDocument && (selectedDocument.id === deletedDocument?.id || selectedDocument.id === deletedDocument?.rowid)) {
      console.log('删除的是当前选中的文档，清除选中状态');
      setSelectedDocument(null);
    }
    
    // 重新加载文档列表，确保列表数据是最新的
    loadDocuments();
  }, [config, selectedDocument, loadDocuments]);

  return (
    <ErrorBoundary>
      <Layout
        leftSidebar={renderLeftSidebar()}
        mainContent={renderMainContent()}
        rightSidebar={renderRightSidebar()}
        loading={loading}
        error={error}
        currentDocument={selectedDocument}
        config={config}
        onEditSuccess={handleEditSuccess}
        onEditError={handleEditError}
        onDeleteSuccess={handleDeleteSuccess}
        isExternalMode={isExternalMode}
      />
      
      {/* 隐藏设置按钮 */}
      {/* <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={handleSettingsToggle}
          style={{
            background: '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          🎨 设置
        </button>
      </div> */}
      
      {/* 设置面板 */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onThemeChange={handleThemeChange}
        onFontSizeChange={handleFontSizeChange}
        onReadingModeChange={handleReadingModeChange}
        readingStats={readingStats}
        currentConfig={configSummary}
        onConfigChange={handleConfigChange}
        onConfigSave={handleConfigSave}
      />
      
      
    </ErrorBoundary>
  );
}
