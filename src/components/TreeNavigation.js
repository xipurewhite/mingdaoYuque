/**
 * 树形导航组件
 */

import React, { useState } from 'react';
import styled from 'styled-components';

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
  
  &.expanded {
    transform: rotate(90deg);
  }
`;

const NodeTitle = styled.span`
  font-size: 14px;
  color: #333;
  
  .active & {
    color: #1890ff;
    font-weight: 500;
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

const DocumentItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  transition: all 0.2s ease;
  min-height: 40px; /* V2版本：触摸友好 */
  display: flex;
  align-items: center;
  
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
  }
  
  /* V2版本：触摸反馈 */
  &:active {
    transform: scale(0.98);
  }
  
  .document-icon {
    margin-right: 8px;
    font-size: 14px;
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
  
  return (
    <TreeNode>
      <NodeHeader 
        onClick={handleToggle}
        className={!canExpand ? 'active' : ''}
      >
        {canExpand && (
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
            >
              <span className="document-icon">📄</span>
              {doc.title}
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
