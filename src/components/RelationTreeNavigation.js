/**
 * 基于关联记录的树形导航组件（简化版，无缓存无懒加载）
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { buildCompleteRelationTree, parseRelationData } from '../utils/dataUtils';
import TreeErrorBoundary from './TreeErrorBoundary';
import { env } from 'mdye';

const TreeContainer = styled.div`
  padding: 8px 16px 16px 16px;
  
  @media (max-width: 768px) {
    padding: 6px 12px 12px 12px;
    font-size: 14px;
  }
  
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
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  min-height: 28px;
  line-height: 1.4;
  min-width: 0;
  
  &:hover {
    background-color: #f0f0f0;
    transform: translateX(2px);
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
    font-weight: 500;
    align-items: flex-start;
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    min-height: 32px;
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
  flex-shrink: 0;
  margin-top: 2px;
  
  &:hover {
    background-color: #f0f0f0;
    color: #1890ff;
  }
  
  &:active {
    transform: scale(0.9);
  }
`;

const NodeTitle = styled.span`
  font-size: 14px;
  color: #333;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  
  .active & {
    color: #1890ff;
    font-weight: 500;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    word-wrap: break-word;
    word-break: break-word;
  }
`;

const NodeChildren = styled.div`
  margin-left: 16px;
  border-left: 1px solid #e8e8e8;
  padding-left: 12px;
  margin-top: 2px;
  
  ${TreeNode} {
    margin-bottom: 4px;
  }
  
  ${NodeChildren} {
    border-left-color: #d0d0d0;
    margin-left: 14px;
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

const LoadingState = styled.div`
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 20px;
  
  .loading-icon {
    font-size: 24px;
    margin-bottom: 8px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

/**
 * 树节点组件（简化版）
 */
function RelationTreeNode({ 
  node, 
  nodeMap,
  onDocumentSelect, 
  selectedDocumentId,
  level = 0,
  expandPath = new Set(), // 需要展开的路径
  expandPathVersion = 0, // 展开路径版本号，用于强制展开
  expandedStateMap, // 全局展开状态映射
  setExpandedState, // 设置展开状态的函数
  manuallyCollapsedMap, // 全局手动收缩标记映射
  setManuallyCollapsed // 设置手动收缩标记的函数
}) {
  // 从全局状态获取展开状态，如果不存在则默认为 false
  // 使用 useMemo 确保在 expandedStateMap 更新时重新计算
  const isExpanded = useMemo(() => {
    return expandedStateMap.get(node.id) || false;
  }, [expandedStateMap, node.id]);
  
  const manuallyCollapsedRef = useRef(manuallyCollapsedMap.get(node.id) || false);
  const lastExpandPathVersionRef = useRef(0); // 记录上次的展开路径版本号
  
  // 同步 manuallyCollapsedRef 和全局状态
  useEffect(() => {
    manuallyCollapsedRef.current = manuallyCollapsedMap.get(node.id) || false;
  }, [manuallyCollapsedMap, node.id]);
  
  // 如果节点在展开路径上，自动展开
  // 当 expandPathVersion 变化时，强制清除手动收缩标记并展开（用于跳转场景）
  useEffect(() => {
    const isInPath = expandPath.has(node.id);
    
    // 如果展开路径版本号变化了，说明是新的跳转操作，需要强制展开路径上的节点
    if (isInPath && expandPathVersion > lastExpandPathVersionRef.current) {
      // 清除手动收缩标记（因为这是系统强制展开，用于显示跳转路径）
      manuallyCollapsedRef.current = false;
      setManuallyCollapsed(node.id, false);
      // 强制展开
      if (!isExpanded) {
        setExpandedState(node.id, true);
      }
      // 更新版本号记录
      lastExpandPathVersionRef.current = expandPathVersion;
    }
    // 如果节点在展开路径上，且当前是收缩状态，且用户没有手动收缩过，则自动展开
    else if (isInPath && !isExpanded && !manuallyCollapsedRef.current) {
      setExpandedState(node.id, true);
      // 自动展开时，清除手动收缩标记（因为这是系统自动展开的）
      manuallyCollapsedRef.current = false;
      setManuallyCollapsed(node.id, false);
    }
  }, [expandPath, expandPathVersion, node.id, isExpanded, setExpandedState, setManuallyCollapsed]);
  
  const hasChildren = node.children && node.children.length > 0;
  const isDocument = !node.isGroup;
  const isActive = selectedDocumentId === node.id;
  
  const handleToggle = useCallback((e) => {
    if (e) {
      e.stopPropagation();
    }
    if (hasChildren) {
      const newExpandedState = !isExpanded;
      setExpandedState(node.id, newExpandedState);
      // 如果用户手动收缩，记录这个状态
      if (!newExpandedState) {
        manuallyCollapsedRef.current = true;
        setManuallyCollapsed(node.id, true);
      } else {
        // 如果用户手动展开，清除标记
        manuallyCollapsedRef.current = false;
        setManuallyCollapsed(node.id, false);
      }
    }
  }, [hasChildren, isExpanded, node.id, setExpandedState, setManuallyCollapsed]);
  
  const handleHeaderClick = useCallback((e) => {
    if (e.target.closest('button')) {
      return;
    }
    
    // 如果节点有子节点，先切换展开/收缩状态
    if (hasChildren) {
      // 先切换状态
      const newExpandedState = !isExpanded;
      setExpandedState(node.id, newExpandedState);
      
      // 如果用户手动收缩，记录这个状态（防止自动展开）
      if (!newExpandedState) {
        manuallyCollapsedRef.current = true;
        setManuallyCollapsed(node.id, true);
      } else {
        // 如果用户手动展开，清除标记
        manuallyCollapsedRef.current = false;
        setManuallyCollapsed(node.id, false);
      }
    }
    
    // 如果是文档，选择文档
    if (isDocument) {
      onDocumentSelect(node);
    }
  }, [hasChildren, isDocument, node, onDocumentSelect, isExpanded, setExpandedState, setManuallyCollapsed]);
  
  // 获取子节点
  const childNodes = useMemo(() => {
    if (!hasChildren || !node.children) return [];
    return node.children
      .map(childId => nodeMap.get(childId))
      .filter(Boolean)
      .sort((a, b) => {
        // 按标题排序
        return (a.title || '').localeCompare(b.title || '');
      });
  }, [hasChildren, node.children, nodeMap]);
  
  return (
    <TreeNode>
      <NodeHeader 
        onClick={handleHeaderClick}
        className={isActive ? 'active' : ''}
        data-node-id={node.id}
        style={{ cursor: hasChildren || isDocument ? 'pointer' : 'default' }}
      >
        {hasChildren && (
          <ExpandButton 
            onClick={handleToggle}
            title={isExpanded ? '收起子级' : '展开子级'}
            aria-label={isExpanded ? '收起子级' : '展开子级'}
          >
            {isExpanded ? '−' : '+'}
          </ExpandButton>
        )}
        <NodeTitle className={node.isGroup ? 'orphan-group' : ''}>
          {isDocument ? '📄' : '📁'} {node.title}
        </NodeTitle>
      </NodeHeader>
      
      {isExpanded && hasChildren && childNodes.length > 0 && (
        <NodeChildren>
          {childNodes.map(childNode => (
            <RelationTreeNode
              key={childNode.id}
              node={childNode}
              nodeMap={nodeMap}
              onDocumentSelect={onDocumentSelect}
              selectedDocumentId={selectedDocumentId}
              level={level + 1}
              expandPath={expandPath}
              expandPathVersion={expandPathVersion}
              expandedStateMap={expandedStateMap}
              setExpandedState={setExpandedState}
              manuallyCollapsedMap={manuallyCollapsedMap}
              setManuallyCollapsed={setManuallyCollapsed}
            />
          ))}
        </NodeChildren>
      )}
    </TreeNode>
  );
}

/**
 * 基于关联记录的树形导航主组件（简化版）
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
  // 建立原始文档索引
  const originalDocsMap = useMemo(() => {
    const map = new Map();
    (documents || []).forEach(d => { if (d && d.id) map.set(d.id, d); });
    return map;
  }, [documents]);

  // 容器引用，用于滚动定位
  const containerRef = useRef(null);

  // 字段ID
  const titleFieldId = env?.titleFieldId?.[0];
  
  // 树状结构和加载状态
  const [treeStructure, setTreeStructure] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
    
  // 一次性加载所有数据并构建树状结构
  useEffect(() => {
    let isMounted = true;
    
    async function loadTree() {
      if (!documents || documents.length === 0) {
        if (isMounted) {
          setTreeStructure({ nodeMap: new Map(), rootNodes: [], orphanNodes: [] });
          setIsLoading(false);
        }
        return;
      }
      
      if (!parentFieldId || !childrenFieldId || !api || !config) {
        if (isMounted) {
          setLoadError('缺少必要的配置参数');
          setIsLoading(false);
        }
        return;
      }
      
      try {
        setIsLoading(true);
        setLoadError(null);
        
        console.log('开始一次性加载所有数据并构建树状结构...');
        
        // 使用新的函数一次性加载所有数据
        const structure = await buildCompleteRelationTree(
          documents,
          parentFieldId,
          childrenFieldId,
          api,
          config,
          titleFieldId
        );
        
        if (isMounted) {
          setTreeStructure(structure);
          setIsLoading(false);
          console.log('树状结构加载完成:', {
      根节点数量: structure.rootNodes?.length || 0,
            节点总数: structure.nodeMap?.size || 0
          });
        }
      } catch (error) {
        console.error('加载树状结构失败:', error);
        if (isMounted) {
          setLoadError(error.message || '加载失败');
          setIsLoading(false);
        }
      }
    }
    
    loadTree();
    
    return () => {
      isMounted = false;
    };
  }, [documents, parentFieldId, childrenFieldId, api, config, titleFieldId]);

  // 计算从根节点到目标节点的路径
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

  // 展开路径状态（用于自动展开到目标节点）
  const [expandPath, setExpandPath] = useState(new Set());
  // 展开路径版本号（用于强制展开，即使节点被手动收缩过）
  const [expandPathVersion, setExpandPathVersion] = useState(0);
  
  // 全局展开状态映射（用于保持子节点的展开状态，即使父节点收缩）
  const [expandedStateMap, setExpandedStateMap] = useState(() => new Map());
  // 全局手动收缩标记映射
  const [manuallyCollapsedMap, setManuallyCollapsedMap] = useState(() => new Map());
  
  // 设置展开状态的函数
  const setExpandedState = useCallback((nodeId, expanded) => {
    setExpandedStateMap(prev => {
      const newMap = new Map(prev);
      if (expanded) {
        newMap.set(nodeId, true);
      } else {
        newMap.delete(nodeId);
      }
      return newMap;
    });
  }, []);
  
  // 设置手动收缩标记的函数
  const setManuallyCollapsed = useCallback((nodeId, collapsed) => {
    setManuallyCollapsedMap(prev => {
      const newMap = new Map(prev);
      if (collapsed) {
        newMap.set(nodeId, true);
      } else {
        newMap.delete(nodeId);
      }
      return newMap;
    });
  }, []);

  // 当选中的文档变化时，计算展开路径并展开
  useEffect(() => {
    if (!selectedDocumentId || !treeStructure) {
      setExpandPath(new Set());
      return;
    }
    
    const path = getPathToNode(selectedDocumentId);
    if (path.length > 0) {
      // 展开路径上的所有节点（除了目标节点本身）
      const pathToExpand = new Set(path.slice(0, -1)); // 不包括目标节点本身
      setExpandPath(pathToExpand);
      // 递增版本号，强制展开路径上的节点（即使之前被手动收缩过）
      setExpandPathVersion(prev => prev + 1);
      
      // 延迟滚动，等待展开动画完成
    const container = containerRef.current;
      if (container) {
    const timer = setTimeout(() => {
      const target = container.querySelector(`[data-node-id="${selectedDocumentId}"]`);
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
        }, 300); // 增加延迟时间，确保展开动画完成
    return () => clearTimeout(timer);
      }
    } else {
      setExpandPath(new Set());
    }
  }, [selectedDocumentId, treeStructure, getPathToNode]);
  
  // 处理文档选择
  const handleDocumentSelect = useCallback(async (nodeDoc) => {
    // 优先使用原始文档，保证系统字段不丢失
    let fullDoc = originalDocsMap.get(nodeDoc.id);
    
    // 如果原始文档存在且有内容，直接使用
    if (fullDoc && fullDoc.content && fullDoc.content.trim()) {
      onDocumentSelect(fullDoc);
      return;
    }
    
    // 如果原始文档不存在或内容为空，需要获取完整文档详情
    if (!fullDoc || !fullDoc.content || !fullDoc.content.trim()) {
      try {
        console.log('文档内容为空，开始获取完整文档详情:', nodeDoc.id);
        
        // 使用getRowDetail获取完整文档信息
        const result = await api.getRowDetail({
          appId: config.appId,
          worksheetId: config.worksheetId,
          viewId: config.viewId,
          rowId: nodeDoc.id,
          getTemplate: false
        });

        console.log('getRowDetail API调用结果:', result);

        // 处理不同的返回数据格式
        let updatedRecord = null;
        if (result && result.data) {
          updatedRecord = result.data;
        } else if (result && result.rowData) {
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
          // 获取字段ID配置
          const contentFieldId = env?.contentFieldId?.[0];
          
          // 构建完整的文档对象
          fullDoc = {
            id: updatedRecord.rowid || nodeDoc.id,
            title: (titleFieldId && updatedRecord[titleFieldId]) || nodeDoc.title || '无标题',
            content: (contentFieldId && updatedRecord[contentFieldId]) || '',
            uaid: updatedRecord.uaid || nodeDoc.rawRecord?.uaid,
            utime: updatedRecord.utime || nodeDoc.rawRecord?.utime,
            rawRecord: updatedRecord,
            category: null,
            createTime: updatedRecord.ctime || nodeDoc.rawRecord?.ctime || '',
            updateTime: updatedRecord.utime || nodeDoc.rawRecord?.utime || '',
            creator: '未知'
          };
          
          console.log('获取到完整文档详情:', fullDoc);
          console.log('内容长度:', fullDoc.content?.length || 0);
          
          onDocumentSelect(fullDoc);
          return;
        } else {
          throw new Error('无法获取文档详情数据');
        }
      } catch (error) {
        console.error('获取文档详情失败:', error);
        // 即使获取失败，也使用已有数据，至少可以显示标题
        fullDoc = fullDoc || {
          id: nodeDoc.id,
          title: nodeDoc.title,
          content: nodeDoc.content || '',
          rawRecord: nodeDoc.rawRecord || nodeDoc.rawDocument
        };
        onDocumentSelect(fullDoc);
        return;
      }
    }
    
    // 如果原始文档存在且有内容，直接使用
    onDocumentSelect(fullDoc);
  }, [originalDocsMap, onDocumentSelect, api, config, titleFieldId]);
  
  if (isLoading) {
    return (
      <TreeContainer>
        <LoadingState>
          <div className="loading-icon">⏳</div>
          <div>加载中...</div>
        </LoadingState>
      </TreeContainer>
    );
  }
  
  if (loadError) {
    return (
      <TreeContainer>
        <EmptyState>
          <div className="empty-icon">⚠️</div>
          <div>加载失败</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            {loadError}
          </div>
        </EmptyState>
      </TreeContainer>
    );
  }
  
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
  
  if (!treeStructure || treeStructure.rootNodes.length === 0) {
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
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocumentId}
            level={0}
            expandPath={expandPath}
            expandPathVersion={expandPathVersion}
            expandedStateMap={expandedStateMap}
            setExpandedState={setExpandedState}
            manuallyCollapsedMap={manuallyCollapsedMap}
            setManuallyCollapsed={setManuallyCollapsed}
          />
        ))}
      </TreeContainer>
    </TreeErrorBoundary>
  );
}
