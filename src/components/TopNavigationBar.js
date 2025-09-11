/**
 * 顶部导航栏组件
 * 显示文档信息和编辑功能
 */

import React from 'react';
import styled from 'styled-components';
import { utils } from 'mdye';

const TopNavContainer = styled.div`
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 48px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
  flex-shrink: 0;
  
  /* V2版：顶部导航栏覆盖文档内容区域，跟随宽度变化 */
  width: 100%;
  max-width: none;
  margin: 0;
  box-sizing: border-box;
`;

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #666;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoLabel = styled.span`
  color: #999;
  font-size: 12px;
`;

const InfoValue = styled.span`
  color: #333;
  font-weight: 500;
`;

const EditButton = styled.button`
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #40a9ff;
  }
  
  &:active {
    background: #096dd9;
  }
  
  &:disabled {
    background: #d9d9d9;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ToggleButton = styled.button`
  width: 30px;
  height: 30px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #ffffff;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin-right: 12px;
  
  &:hover {
    border-color: #1890ff;
    color: #1890ff;
    background: #f0f8ff;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

/**
 * V2版顶部导航栏组件
 * @param {object} props - 组件属性
 * @param {object} props.currentDocument - 当前文档对象
 * @param {object} props.config - 明道云配置对象
 * @param {function} props.onEditSuccess - 编辑成功回调
 * @param {function} props.onEditError - 编辑失败回调
 * @param {boolean} props.leftCollapsed - 左侧导航栏是否折叠
 * @param {number} props.screenWidth - 屏幕宽度
 * @param {function} props.onToggleLeft - 切换左侧导航栏回调
 */
export default function TopNavigationBar({ 
  currentDocument, 
  config, 
  onEditSuccess,
  onEditError,
  leftCollapsed = false,
  screenWidth = 1200,
  onToggleLeft
}) {
  // 解析最后修改人信息
  const parseLastModifier = (uaid) => {
    try {
      if (!uaid) return null;
      const modifierData = typeof uaid === 'string' ? JSON.parse(uaid) : uaid;
      return modifierData[0] || null;
    } catch (err) {
      console.error('解析修改人信息失败:', err);
      return null;
    }
  };

  // 格式化修改时间
  const formatModifyTime = (utime) => {
    if (!utime) return '未知时间';
    
    try {
      const modifyDate = new Date(utime);
      const now = new Date();
      const diffMs = now - modifyDate;
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffMinutes < 1) {
        return '刚刚';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}分钟前`;
      } else if (diffHours < 24) {
        return `${diffHours}小时前`;
      } else if (diffDays < 7) {
        return `${diffDays}天前`;
      } else {
        return modifyDate.toLocaleDateString('zh-CN');
      }
    } catch (err) {
      console.error('格式化时间失败:', err);
      return utime;
    }
  };

  // 处理编辑按钮点击
  const handleEditClick = async () => {
    if (!currentDocument || !config) {
      onEditError && onEditError('缺少必要参数');
      return;
    }

    // 调试：检查编辑参数
    console.log('编辑功能调试信息:', {
      currentDocument: currentDocument,
      documentId: currentDocument.id,
      config: config,
      appId: config.appId,
      viewId: config.viewId,
      worksheetId: config.worksheetId
    });

    try {
      // 使用明道云API打开编辑界面
      const result = await utils.openRecordInfo({
        appId: config.appId,
        viewId: config.viewId,
        worksheetId: config.worksheetId,
        recordId: currentDocument.id // 修复：使用id而不是rowid
      });

      console.log('编辑结果:', result);

      if (result && result.action === 'update') {
        // 文档被更新
        onEditSuccess && onEditSuccess(result.value);
      } else if (result && result.action === 'delete') {
        // 文档被删除
        onEditError && onEditError('文档已被删除');
      }
    } catch (error) {
      console.error('打开编辑界面失败:', error);
      onEditError && onEditError(error.message || '打开编辑界面失败');
    }
  };

  // 调试：检查当前文档数据
  console.log('TopNavigationBar调试信息:', {
    currentDocument: currentDocument,
    uaid: currentDocument?.uaid,
    utime: currentDocument?.utime,
    rawRecord: currentDocument?.rawRecord
  });

  // 获取修改人信息
  const lastModifier = parseLastModifier(currentDocument?.uaid);
  const lastModifyTime = formatModifyTime(currentDocument?.utime);

  return (
    <TopNavContainer>
      <DocumentInfo>
        <ToggleButton 
          onClick={onToggleLeft}
          title={leftCollapsed ? '展开导航栏' : '收起导航栏'}
        >
          {leftCollapsed ? '▶' : '◀'}
        </ToggleButton>
        
        <InfoItem>
          <InfoLabel>最后修改人：</InfoLabel>
          <InfoValue>
            {lastModifier ? lastModifier.fullname || '未知用户' : '未知用户'}
          </InfoValue>
        </InfoItem>
        
        <InfoItem>
          <InfoLabel>最后修改时间：</InfoLabel>
          <InfoValue>{lastModifyTime}</InfoValue>
        </InfoItem>
      </DocumentInfo>
      
      <EditButton onClick={handleEditClick}>
        编辑
      </EditButton>
    </TopNavContainer>
  );
}
