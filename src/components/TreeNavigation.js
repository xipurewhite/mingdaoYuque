/**
 * 树形导航组件
 */

import React, { useState } from 'react';
import styled from 'styled-components';

const TreeContainer = styled.div`
  padding: 12px 16px;
  margin: 0;
  
  /* V2版本：响应式优化 */
  @media (max-width: 768px) {
    padding: 10px 12px;
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
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  min-height: 28px;
  line-height: 1.4;
  min-width: 0; /* 允许flex子元素收缩 */
  
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
  
  /* V2版本：触摸反馈 */
  &:active {
    transform: scale(0.98);
  }
  
  @media (max-width: 768px) {
    padding: 8px 12px;
    min-height: 32px;
  }
`;

const ExpandIcon = styled.span`
  margin-right: 8px;
  font-size: 12px;
  color: #666;
  transition: transform 0.2s;
  flex-shrink: 0;
  margin-top: 2px; /* 选中状态下图标顶部对齐 */
  
  &.expanded {
    transform: rotate(90deg);
  }
`;

const NodeTitle = styled.span`
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
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
  
  /* V2版本：优化层级显示 */
  ${TreeNode} {
    margin-bottom: 4px;
  }
  
  /* 嵌套层级样式 */
  ${NodeChildren} {
    border-left-color: #d0d0d0;
    margin-left: 14px;
  }
`;

const DocumentItem = styled.div`
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
  min-height: 28px;
  line-height: 1.4;
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  
  &:hover {
    background-color: #f0f0f0;
    color: #333;
    transform: translateX(4px);
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
    font-weight: 500;
    border-left: 3px solid #1890ff;
    white-space: normal;
    overflow: visible;
    align-items: flex-start;
  }
  
  /* V2版本：触摸反馈 */
  &:active {
    transform: scale(0.98);
  }
  
  .document-icon {
    margin-right: 8px;
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 2px; /* 选中状态下图标顶部对齐 */
  }
  
  /* 文档标题文本样式 */
  > span:not(.document-icon) {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }
  
  /* 选中状态下，文档标题允许多行显示 */
  &.active > span:not(.document-icon) {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    word-wrap: break-word;
    word-break: break-word;
  }
  
  @media (max-width: 768px) {
    padding: 10px 12px;
    min-height: 44px;
    font-size: 14px;
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
 * 树节点组件
 */
function TreeNodeComponent({ 
  node, 
  onDocumentSelect, 
  selectedDocumentId,
  level = 0 
}) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两级
  
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const hasDocuments = node.documents && node.documents.length > 0;
  const canExpand = hasChildren || hasDocuments;
  
  const handleToggle = () => {
    if (canExpand) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleDocumentClick = (doc) => {
    onDocumentSelect(doc);
  };
  
  // 判断是否应该显示展开/收缩按钮
  // 1. 如果节点有子节点或文档（canExpand），显示按钮
  // 2. 如果节点已经展开（isExpanded），也应该显示收缩按钮，即使 canExpand 为 false（比如子节点被删除的情况）
  const shouldShowExpandButton = canExpand || isExpanded;
  
  return (
    <TreeNode>
      <NodeHeader 
        onClick={shouldShowExpandButton ? handleToggle : undefined}
        className={!canExpand ? 'active' : ''}
      >
        {shouldShowExpandButton && (
          <ExpandIcon className={isExpanded ? 'expanded' : ''}>
            ▶
          </ExpandIcon>
        )}
        <NodeTitle>{node.name}</NodeTitle>
      </NodeHeader>
      
      {isExpanded && (
        <NodeChildren>
          {/* 渲染子分类 */}
          {hasChildren && Object.values(node.children).map(child => (
            <TreeNodeComponent
              key={child.name}
              node={child}
              onDocumentSelect={onDocumentSelect}
              selectedDocumentId={selectedDocumentId}
              level={level + 1}
            />
          ))}
          
          {/* 渲染文档 */}
          {hasDocuments && node.documents.map(doc => (
            <DocumentItem
              key={doc.id}
              className={selectedDocumentId === doc.id ? 'active' : ''}
              onClick={() => handleDocumentClick(doc)}
              title={doc.title}
            >
              <span className="document-icon">📄</span>
              <span>{doc.title}</span>
            </DocumentItem>
          ))}
        </NodeChildren>
      )}
    </TreeNode>
  );
}

/**
 * 树形导航主组件
 */
export default function TreeNavigation({ 
  categories, 
  onDocumentSelect, 
  selectedDocumentId 
}) {
  if (!categories || Object.keys(categories).length === 0) {
    return (
      <TreeContainer>
        <EmptyState>
          <div className="empty-icon">📁</div>
          <div>暂无文档分类</div>
        </EmptyState>
      </TreeContainer>
    );
  }
  
  return (
    <TreeContainer>
      {Object.values(categories).map(category => (
        <TreeNodeComponent
          key={category.name}
          node={category}
          onDocumentSelect={onDocumentSelect}
          selectedDocumentId={selectedDocumentId}
          level={0}
        />
      ))}
    </TreeContainer>
  );
}
