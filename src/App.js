import React, { useEffect, useState, useCallback } from "react";
import { env, config, api } from "mdye";
import Layout from "./components/Layout";
import TreeNavigation from "./components/TreeNavigation";
import RichTextRenderer from "./components/RichTextRenderer";
import DocumentOutline from "./components/DocumentOutline";
import SearchBar from "./components/SearchBar";
import SettingsPanel from "./components/SettingsPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import { fetchDocuments, buildDocumentCategories } from "./utils/dataUtils";
import { getReadingStats } from "./utils/readingProgress";
import { initializePlugin, startPlugin, getPluginState } from "./utils/pluginLifecycle";
import { initializeEnvHandler, validateEnv } from "./utils/envHandler";
import { initializeConfigManager, getConfigSummary, getAllConfig } from "./utils/configManager";

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
  
  // 添加调试信息
  console.log('App组件渲染，当前状态:', {
    documentsCount: documents.length,
    categoriesCount: Object.keys(categories).length,
    selectedDocument: selectedDocument?.title,
    loading,
    error
  });
  
  // 获取文档数据
  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('开始加载文档数据...');
      console.log('配置信息:', { config, env });
      
      const docs = await fetchDocuments(api, config, env);
      console.log('获取到的文档:', docs);
      
      setDocuments(docs);
      
      // 构建分类结构
      const categoryFieldId = env.category?.[0];
      if (categoryFieldId && docs.length > 0) {
        const cats = buildDocumentCategories(docs, categoryFieldId);
        console.log('构建的分类结构:', cats);
        setCategories(cats);
      } else {
        // 如果没有分类字段，将所有文档放到"所有文档"分类中
        setCategories({
          '所有文档': {
            name: '所有文档',
            documents: docs
          }
        });
      }
      
      // 默认选择第一个文档
      if (docs.length > 0) {
        setSelectedDocument(docs[0]);
      }
      
    } catch (err) {
      console.error('加载文档失败:', err);
      setError(err.message || '加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [api, config, env]);
  
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
      await loadDocuments();
      
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
  
  // 处理文档选择
  const handleDocumentSelect = useCallback((document) => {
    console.log('选择文档:', document);
    setSelectedDocument(document);
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
  const renderLeftSidebar = () => (
    <div>
      <SearchBar
        documents={documents}
        onSearch={handleSearch}
        onSelectDocument={handleSearchDocumentSelect}
        placeholder="搜索文档..."
      />
      <TreeNavigation
        categories={categories}
        onDocumentSelect={handleDocumentSelect}
        selectedDocumentId={selectedDocument?.id}
      />
    </div>
  );
  
  // 渲染主内容区
  const renderMainContent = () => (
    <RichTextRenderer
      content={selectedDocument?.content}
      title={selectedDocument?.title}
      documentId={selectedDocument?.id}
      onContentChange={handleContentChange}
    />
  );
  
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
  }, [refreshCurrentDocument]);

  // 处理编辑失败
  const handleEditError = useCallback((error) => {
    console.error('文档编辑失败:', error);
    // 可以在这里显示错误提示
  }, []);

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
