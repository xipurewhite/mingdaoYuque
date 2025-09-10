/**
 * 树形导航组件
 */

import React, { useState } from 'react';
import styled from 'styled-components';

const TreeContainer = styled.div`
  padding: 16px;
  height: 100%;
  overflow-y: auto;
`;

const TreeNode = styled.div`
  margin-bottom: 4px;
`;

const NodeHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f0f0f0;
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
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
  border-left: 1px solid #e8e8e8;
  padding-left: 8px;
`;

const DocumentItem = styled.div`
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f0f0f0;
    color: #333;
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
    font-weight: 500;
  }
  
  .document-icon {
    margin-right: 6px;
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
