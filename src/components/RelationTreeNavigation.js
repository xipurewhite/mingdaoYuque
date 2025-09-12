/**
 * 基于关联记录的树形导航组件
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { buildRelationTree, loadChildNodes, detectCircularReferences } from '../utils/dataUtils';
import { parseRelationData } from '../utils/dataUtils';
import { treeCache } from '../utils/treeCache';
import TreeErrorBoundary from './TreeErrorBoundary';
import { env } from 'mdye';

const TreeContainer = styled.div`
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  
  /* V2版本：响应式优化 */
  @media (max-width: 768px) {
    padding: 12px;
    font-size: 14px;
  }
  
  /* 滚动条样式优化 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
    
    &:hover {
      background: #a8a8a8;
    }
  }
`;

const TreeNode = styled.div`
  margin-bottom: 4px;
`;

const NodeHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s ease;
  min-height: 44px; /* V2版本：触摸友好 */
  
  &:hover {
    background-color: #f0f0f0;
    transform: translateX(2px);
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
    font-weight: 500;
  }
  
  &.loading {
    opacity: 0.6;
    cursor: wait;
  }
  
  /* V2版本：触摸反馈 */
  &:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 768px) {
    padding: 12px;
    min-height: 48px;
  }
`;

const ExpandIcon = styled.span`
  margin-right: 8px;
  font-size: 12px;
  color: #666;
  transition: transform 0.2s;
  min-width: 12px;
  text-align: center;
  
  &.expanded {
    transform: rotate(90deg);
  }
  
  &.loading {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ExpandButton = styled.button`
  background: none;
  border: none;
  padding: 2px 4px;
  margin-right: 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: #f0f0f0;
    color: #1890ff;
  }
  
  &:active {
    transform: scale(0.9);
  }
  
  &.loading {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const NodeTitle = styled.span`
  font-size: 14px;
  color: #333;
  flex: 1;
  
  .active & {
    color: #1890ff;
    font-weight: 500;
  }
  
  .orphan-group & {
    color: #ff7875;
    font-style: italic;
  }
`;

const NodeChildren = styled.div`
  margin-left: 20px;
  border-left: 2px solid #e8e8e8;
  padding-left: 12px;
  margin-top: 4px;
  
  /* V2版本：优化层级显示 */
  ${TreeNode} {
    margin-bottom: 2px;
  }
  
  /* 嵌套层级样式 */
  ${NodeChildren} {
    border-left-color: #d0d0d0;
    margin-left: 16px;
  }
`;

const LoadingIndicator = styled.div`
  padding: 8px 12px;
  color: #999;
  font-size: 12px;
  text-align: center;
  margin-left: 20px;
  
  &::before {
    content: "⏳";
    margin-right: 4px;
  }
`;

const ErrorIndicator = styled.div`
  padding: 8px 12px;
  color: #ff4d4f;
  font-size: 12px;
  text-align: center;
  margin-left: 20px;
  
  &::before {
    content: "❌";
    margin-right: 4px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 20px;
  
  .empty-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
`;

/**
 * 关联记录树节点组件
 */
function RelationTreeNode({ 
  node, 
  nodeMap,
  onDocumentSelect, 
  selectedDocumentId,
  level = 0,
  api,
  config,
  childrenFieldId,
  onNodeLoad,
  expandPath
}) {
  const [isExpanded, setIsExpanded] = useState(false); // 默认不展开，避免状态冲突
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [childNodes, setChildNodes] = useState([]);
  const [loadedOnce, setLoadedOnce] = useState(false);
  
  // 使用 ref 来跟踪实际的展开状态，避免闭包问题
  const isExpandedRef = useRef(false);
  
  const hasChildren = (node.hasChildren || (node.children && node.children.length > 0));
  const isDocument = !node.isGroup;
  const isActive = selectedDocumentId === node.id;
  const shouldExpand = !!expandPath && expandPath.has(node.id);

  // 外部定位路径：若该节点在需要展开的路径上，则自动展开（自动触发懒加载）
  useEffect(() => {
    if (shouldExpand && !isExpandedRef.current) {
      // 搜索定位触发展开：强制打开并允许懒加载
      handleToggle(true);
    }
  }, [shouldExpand, node.id, handleToggle]);
  
  const handleExpandClick = useCallback((e) => {
    e.stopPropagation();
    handleToggle();
  }, [handleToggle]);
  
  const handleToggle = useCallback(async (force = false) => {
    console.log('handleToggle被调用:', { 
      hasChildren, 
      isExpanded, 
      isExpandedRef: isExpandedRef.current,
      loadedOnce, 
      nodeId: node.id,
      childNodesLength: childNodes.length,
      nodeIsLoaded: node.isLoaded,
      force
    });
    
    // 如果不是强制模式且没有子级标记，则直接返回；
    // 强制模式用于搜索定位场景，即使未标记子级也尝试懒加载
    if (!hasChildren && !force) {
      console.log('节点没有子级，直接返回');
      return;
    }
    
    // 使用 ref 来获取当前状态，避免闭包问题
    const currentExpanded = isExpandedRef.current;
    console.log('当前展开状态:', currentExpanded);
    
    if (currentExpanded) {
      console.log('收起节点');
      setIsExpanded(false);
      isExpandedRef.current = false;
      return;
    }
    
    console.log('准备展开节点');
    setIsExpanded(true);
    isExpandedRef.current = true;
    
    // 如果子节点已经加载过，直接展开，不需要重新加载
    if (loadedOnce || (childNodes && childNodes.length > 0)) {
      console.log('子节点已加载过，直接展开');
      return;
    }
    
    // 如果子节点未加载且需要懒加载
    if (!node.isLoaded && childrenFieldId && api && config) {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // 检查缓存
        const cachedChildren = treeCache.getCachedChildren(config.worksheetId, node.id);
        if (cachedChildren) {
          console.log('使用缓存的子节点数据:', node.id);
          setChildNodes(cachedChildren);
          setIsLoading(false);
          return;
        }
        
        console.log('开始懒加载子节点:', node.id);
        const loadedChildren = await loadChildNodes(api, config, node.id, childrenFieldId);
        
        // 更新节点映射表
        const newChildNodes = loadedChildren.map(child => ({
          ...child,
          level: level + 1,
          parentId: node.id
        }));
        
        // 缓存子节点数据
        treeCache.cacheChildren(config.worksheetId, node.id, newChildNodes);
        
        setChildNodes(newChildNodes);
        setLoadedOnce(true);
        
        // 通知父组件更新节点映射表
        if (onNodeLoad) {
          onNodeLoad(node.id, newChildNodes);
        }
        
        console.log('懒加载完成:', newChildNodes.length, '个子节点');
      } catch (error) {
        console.error('懒加载失败:', error);
        setLoadError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [hasChildren, node.isLoaded, node.id, childrenFieldId, api, config, level, onNodeLoad, loadedOnce, childNodes]);
  
  const handleDocumentClick = useCallback((doc) => {
    onDocumentSelect(doc);
  }, [onDocumentSelect]);
  
  // 渲染子节点
  const renderChildren = () => {
    if (!isExpanded) return null;
    
    if (isLoading) {
      return <LoadingIndicator>加载中...</LoadingIndicator>;
    }
    
    if (loadError) {
      return <ErrorIndicator>加载失败: {loadError}</ErrorIndicator>;
    }
    
    const childrenToRender = childNodes.length > 0 ? childNodes : 
      (node.children || []).map(childId => nodeMap.get(childId)).filter(Boolean);
    
    if (childrenToRender.length === 0) {
      return null;
    }
    
    return (
      <NodeChildren>
        {childrenToRender.map(childNode => (
          <RelationTreeNode
            key={childNode.id}
            node={childNode}
            nodeMap={nodeMap}
            onDocumentSelect={onDocumentSelect}
            selectedDocumentId={selectedDocumentId}
            level={level + 1}
            api={api}
            config={config}
            childrenFieldId={childrenFieldId}
            onNodeLoad={onNodeLoad}
            expandPath={expandPath}
          />
        ))}
      </NodeChildren>
    );
  };
  
  return (
    <TreeNode>
      <NodeHeader 
        onClick={isDocument ? () => handleDocumentClick(node) : undefined}
        className={`${isActive ? 'active' : ''} ${isLoading ? 'loading' : ''}`}
        data-node-id={node.id}
      >
        {hasChildren && (
          <ExpandButton 
            onClick={(e) => {
              console.log('按钮被点击，当前状态:', { isExpanded, hasChildren, nodeId: node.id });
              handleExpandClick(e);
            }}
            className={isLoading ? 'loading' : ''}
            title={isExpanded ? '收起子级' : '展开子级'}
            aria-label={isExpanded ? '收起子级' : '展开子级'}
          >
            {isLoading ? '⟳' : (isExpanded ? '−' : '+')}
          </ExpandButton>
        )}
        <NodeTitle className={node.isGroup ? 'orphan-group' : ''}>
          {isDocument ? '📄' : '📁'} {node.title}
        </NodeTitle>
      </NodeHeader>
      
      {renderChildren()}
    </TreeNode>
  );
}

/**
 * 基于关联记录的树形导航主组件
 */
export default function RelationTreeNavigation({ 
  documents,
  onDocumentSelect, 
  selectedDocumentId,
  api,
  config,
  parentFieldId,
  childrenFieldId
}) {
  // 建立原始文档索引，确保从树选择时能拿到完整文档信息
  const originalDocsMap = useMemo(() => {
    const map = new Map();
    (documents || []).forEach(d => { if (d && d.id) map.set(d.id, d); });
    return map;
  }, [documents]);

  // 容器引用，用于滚动定位
  const containerRef = useRef(null);

  // 展开路径（支持异步解析）
  const [externalExpandPath, setExternalExpandPath] = useState(null);
  
  // 字段ID（用于必要时补齐文档详情）
  const titleFieldId = env?.titleFieldId?.[0];
  const contentFieldId = env?.contentFieldId?.[0];
  // 构建树状结构（带缓存）
  const treeStructure = useMemo(() => {
    if (!documents || documents.length === 0) {
      return { nodeMap: new Map(), rootNodes: [], orphanNodes: [] };
    }
    
    // 检查缓存
    const cacheKey = `${config.worksheetId}_${config.viewId}`;
    const cachedStructure = treeCache.getCachedTreeStructure(config.worksheetId, config.viewId);
    
    if (cachedStructure && treeCache.isCacheValid(config.worksheetId, config.viewId, documents[0]?.updateTime)) {
      console.log('使用缓存的树状结构');
      return cachedStructure;
    }
    
    console.log('开始构建关联记录树状结构...');
    const structure = buildRelationTree(documents, parentFieldId, childrenFieldId);
    
    // 检测循环引用
    const cycles = detectCircularReferences(structure.nodeMap);
    if (cycles.length > 0) {
      console.warn('检测到循环引用:', cycles);
    }
    
    // 添加缓存信息
    structure.lastUpdateTime = new Date().toISOString();
    structure.cacheKey = cacheKey;
    
    // 缓存树状结构
    treeCache.cacheTreeStructure(config.worksheetId, config.viewId, structure);
    
    return structure;
  }, [documents, parentFieldId, childrenFieldId, config.worksheetId, config.viewId]);

  // ============ 外部定位：根据选中文档计算展开路径 ============
  const getPathToNode = useCallback((nodeId) => {
    const path = [];
    if (!nodeId || !treeStructure || !treeStructure.nodeMap) return path;
    let current = treeStructure.nodeMap.get(nodeId);
    while (current) {
      path.unshift(current.id);
      if (!current.parentId) break;
      current = treeStructure.nodeMap.get(current.parentId);
    }
    return path;
  }, [treeStructure]);

  const expandPath = useMemo(() => {
    if (externalExpandPath) return externalExpandPath;
    if (!selectedDocumentId) return null;
    const ids = getPathToNode(selectedDocumentId);
    if (!ids || ids.length === 0) return null;
    return new Set(ids);
  }, [selectedDocumentId, getPathToNode, externalExpandPath]);

  // 当选中的文档变化时，滚动树容器使其可见
  useEffect(() => {
    if (!selectedDocumentId) return;
    const container = containerRef.current;
    if (!container) return;
    // 延迟以等待可能的懒加载与渲染
    const timer = setTimeout(() => {
      const target = container.querySelector(`[data-node-id="${selectedDocumentId}"]`);
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedDocumentId]);
  
  // 处理节点加载
  const handleNodeLoad = useCallback((nodeId, childNodes) => {
    // 这里可以更新全局的节点映射表
    console.log('节点加载完成:', nodeId, childNodes.length);
  }, []);
  
  if (!documents || documents.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <div className="empty-icon">📁</div>
          <div>暂无文档</div>
        </EmptyState>
      </TreeContainer>
    );
  }
  
  if (treeStructure.rootNodes.length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <div className="empty-icon">⚠️</div>
          <div>无法构建树状结构</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            请检查关联记录字段配置
          </div>
        </EmptyState>
      </TreeContainer>
    );
  }
  
  return (
    <TreeErrorBoundary>
      <TreeContainer ref={containerRef}>
        {treeStructure.rootNodes.map(rootNode => (
          <RelationTreeNode
            key={rootNode.id}
            node={rootNode}
            nodeMap={treeStructure.nodeMap}
            onDocumentSelect={async (nodeDoc) => {
              // 优先使用原始文档，保证uaid/utime/rawRecord等系统字段不丢失
              let fullDoc = originalDocsMap.get(nodeDoc.id);
              if (!fullDoc) {
                try {
                  // 若原始文档不存在，尝试补齐详情
                  const result = await api.getRowDetail({
                    appId: config.appId,
                    worksheetId: config.worksheetId,
                    viewId: config.viewId,
                    rowId: nodeDoc.id,
                    getTemplate: false
                  });
                  let record = null;
                  if (result && result.data) {
                    record = result.data;
                  } else if (result && result.rowData) {
                    try { record = JSON.parse(result.rowData); } catch (_) { record = null; }
                  }
                  if (record) {
                    fullDoc = {
                      id: record.rowid || nodeDoc.id,
                      title: (titleFieldId ? record[titleFieldId] : nodeDoc.title) || nodeDoc.title,
                      content: (contentFieldId ? record[contentFieldId] : nodeDoc.content) || nodeDoc.content,
                      category: null,
                      createTime: record.ctime,
                      updateTime: record.utime,
                      creator: undefined,
                      uaid: record.uaid,
                      utime: record.utime,
                      rawRecord: record
                    };
                  }
                } catch (e) {
                  // 失败则至少返回节点已有信息，避免选择无响应
                  fullDoc = nodeDoc;
                }
              }
              onDocumentSelect(fullDoc || nodeDoc);
            }}
            selectedDocumentId={selectedDocumentId}
            level={0}
            api={api}
            config={config}
            childrenFieldId={childrenFieldId}
            onNodeLoad={handleNodeLoad}
            expandPath={expandPath}
          />
        ))}
      </TreeContainer>
    </TreeErrorBoundary>
  );
}