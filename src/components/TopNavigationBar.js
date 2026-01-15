/**
 * 顶部导航栏组件
 * 显示文档信息和编辑功能
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { utils, api, env } from 'mdye';

const TopNavContainer = styled.div`
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0;
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 40px;
  height: 40px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  flex-shrink: 0;
  
  /* V2版：顶部导航栏覆盖文档内容区域，跟随宽度变化 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  /* 确保顶部导航栏不受横向滚动影响，固定在视口顶部 */
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
`;

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #666;
  padding: 0 16px;
  height: 100%;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InfoLabel = styled.span`
  color: #999;
  font-size: 11px;
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
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  line-height: 1.4;
  
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
  width: 24px;
  height: 24px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #ffffff;
  color: #666;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  margin-right: 8px;
  
  &:hover {
    border-color: #1890ff;
    color: #1890ff;
    background: #f0f8ff;
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

// 分享按钮样式
const ShareButton = styled.button`
  background: #ffffff;
  color: #595959;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-right: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1.4;
  
  &:hover {
    color: #1890ff;
    border-color: #1890ff;
    background: #f0f8ff;
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

// 弹窗相关样式
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(2px);
`;

const ModalContent = styled.div`
  background: white;
  width: 520px;
  border-radius: 8px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  animation: modalFadeIn 0.2s ease-out;

  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  color: #000000d9;
  
  .close-icon {
    cursor: pointer;
    color: #00000073;
    font-size: 18px;
    transition: color 0.2s;
    &:hover {
      color: #000000d9;
    }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const TabGroup = styled.div`
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 24px;
`;

const TabItem = styled.div`
  padding: 12px 0;
  margin-right: 32px;
  cursor: pointer;
  font-size: 14px;
  color: ${props => props.$active ? '#1890ff' : '#000000d9'};
  font-weight: ${props => props.$active ? '500' : '400'};
  border-bottom: 2px solid ${props => props.$active ? '#1890ff' : 'transparent'};
  transition: all 0.3s;
  
  &:hover {
    color: #1890ff;
  }
`;

const ShareContent = styled.div`
  .description {
    margin-bottom: 16px;
    color: #00000073;
    font-size: 14px;
    line-height: 1.5715;
  }
`;

const LinkBox = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  
  input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    color: #000000d9;
    font-size: 14px;
    outline: none;
    background: #f5f5f5;
    
    &:focus {
      border-color: #40a9ff;
      background: #fff;
    }
  }
`;

const CopyButton = styled.button`
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 0 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  
  &:hover {
    background: #40a9ff;
  }
  
  &:active {
    background: #096dd9;
  }

  &.copied {
    background: #52c41a;
  }
`;

/**
 * V2版顶部导航栏组件
 * @param {object} props - 组件属性
 * @param {object} props.currentDocument - 当前文档对象
 * @param {object} props.config - 明道云配置对象
 * @param {function} props.onEditSuccess - 编辑成功回调
 * @param {function} props.onEditError - 编辑失败回调
 * @param {function} props.onDeleteSuccess - 删除成功回调
 * @param {boolean} props.leftCollapsed - 左侧导航栏是否折叠
 * @param {number} props.screenWidth - 屏幕宽度
 * @param {function} props.onToggleLeft - 切换左侧导航栏回调
 */
export default function TopNavigationBar(props) {
  const { 
    currentDocument, 
    config, 
    onEditSuccess,
    onEditError,
    onDeleteSuccess,
    leftCollapsed = false,
    screenWidth = 1200,
    isExternalMode = false,
    outlineOpen = true,
    onToggleLeft,
    onToggleOutline
  } = props;
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

  // 分享功能状态
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareType, setShareType] = useState('internal');
  const [copyStatus, setCopyStatus] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);

  // 处理分享按钮点击
  const handleShareClick = () => {
    console.log('========== 打开分享弹窗 ==========');
    console.log('Config全部内容:', config);
    console.log('Config全部内容（JSON）:', JSON.stringify(config, null, 2));
    console.log('Config.shareState全部内容:', config?.shareState);
    console.log('Config.shareState全部内容（JSON）:', JSON.stringify(config?.shareState, null, 2));
    setShowShareModal(true);
  };

  // 获取分享链接
  useEffect(() => {
    if (!showShareModal || !currentDocument) return;

    const fetchLink = async () => {
      console.log('========== 开始获取分享链接 ==========');
      console.log('分享类型:', shareType);
      console.log('当前文档:', currentDocument);
      console.log('Config:', config);
      console.log('API对象:', api);
      
      setLoadingLink(true);
      setShareLink('');
      
      try {
        if (shareType === 'internal') {
          // 内部链接：构造标准的嵌入视图链接
          // 格式: https://www.mingdao.com/embed/view/{appId}/{worksheetId}/{viewId}?recordId={rowId}
          // 优先使用 rawRecord.rowid，确保获取正确的记录ID
          const recordId = currentDocument.rawRecord?.rowid || currentDocument.id;
          
          if (config && config.appId && config.worksheetId && config.viewId && recordId) {
             const link = `https://www.mingdao.com/embed/view/${config.appId}/${config.worksheetId}/${config.viewId}?recordId=${recordId}`;
             setShareLink(link);
          } else {
             // 降级：使用当前URL参数
             const url = new URL(window.location.href);
             url.searchParams.set('recordId', recordId);
             url.searchParams.delete('mode');
             setShareLink(url.toString());
          }
          setLoadingLink(false);
        } else {
          // 外部分享：使用env.externalShareBaseUrl
          const recordId = currentDocument.rawRecord?.rowid || currentDocument.id;
          
          // 调试输出
          console.log('========== 外部分享链接获取 ==========');
          console.log('记录ID:', recordId);
          console.log('外部分享基础URL配置:', env?.externalShareBaseUrl || '未配置');
          
          const externalShareBaseUrl = env?.externalShareBaseUrl || '';
          
          if (externalShareBaseUrl && externalShareBaseUrl.trim()) {
            try {
              const baseUrl = externalShareBaseUrl.trim();
              
              // 验证URL格式是否正确
              try {
                new URL(baseUrl);
              } catch (urlError) {
                console.error('外部分享基础URL格式无效:', urlError);
                setShareLink('视图未公开');
                setLoadingLink(false);
                return;
              }
              
              // 构建完整的分享链接，添加recordId参数
              const separator = baseUrl.includes('?') ? '&' : '?';
              const shareUrl = `${baseUrl}${separator}recordId=${recordId}`;
              
              console.log('使用env.externalShareBaseUrl构建分享链接');
              console.log('原始externalShareBaseUrl:', baseUrl);
              console.log('生成的分享链接:', shareUrl);
              
              setShareLink(shareUrl);
              setLoadingLink(false);
              return;
            } catch (error) {
              console.error('处理外部分享基础URL时出错:', error);
              console.error('错误详情:', error);
              setShareLink('视图未公开');
              setLoadingLink(false);
              return;
            }
          }
          
          // externalShareBaseUrl不存在或为空，显示"视图未公开"
          console.log('externalShareBaseUrl不存在或为空');
          setShareLink('视图未公开');
          setLoadingLink(false);
        }
      } catch (err) {
        console.error('Fetch share link error:', err);
        setShareLink('获取分享链接失败');
        setLoadingLink(false);
      }
    };

    fetchLink();
  }, [showShareModal, shareType, currentDocument, config, env]);

  // 复制链接
  const handleCopy = async () => {
    if (!shareLink) return;
    
    // 降级复制方案
    const copyToClipboardFallback = (text) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // 防止滚动
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed', err);
        return false;
      }
    };

    let success = false;
    
    // 优先尝试 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(shareLink);
        success = true;
      } catch (err) {
        console.warn('Clipboard API failed (likely permission issue), trying fallback...', err);
        // 如果 API 调用失败（如权限问题），尝试降级方案
        success = copyToClipboardFallback(shareLink);
      }
    } else {
      // 不支持 Clipboard API 或非安全上下文，直接使用降级方案
      success = copyToClipboardFallback(shareLink);
    }

    if (success) {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    } else {
      console.error('All copy methods failed');
      // 最后的兜底提示，或者可以考虑显示一个只读的 input 让用户自己复制，
      // 但当前界面已经有 input 了，用户可以手动复制。
      // 这里暂时不弹窗打扰用户，因为 input 就在那里。
    }
  };

  // 处理编辑按钮点击
  const handleEditClick = async () => {
    if (!currentDocument || !config) {
      onEditError && onEditError('缺少必要参数');
      return;
    }

    // 优先使用 rawRecord.rowid，确保获取正确的记录ID
    const recordId = currentDocument.rawRecord?.rowid || currentDocument.id;

    // 调试：检查编辑参数
    console.log('编辑功能调试信息:', {
      currentDocument: currentDocument,
      documentId: recordId,
      rawRecordRowid: currentDocument.rawRecord?.rowid,
      documentIdFallback: currentDocument.id,
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
        recordId: recordId // 使用 rawRecord.rowid 或 id
      });

      console.log('编辑结果:', result);

      if (result && result.action === 'update') {
        // 文档被更新
        onEditSuccess && onEditSuccess(result.value);
      } else if (result && result.action === 'delete') {
        // 文档被删除
        if (onDeleteSuccess) {
          onDeleteSuccess(currentDocument);
        } else {
          onEditError && onEditError('文档已被删除');
        }
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
    <>
      <TopNavContainer>
        <DocumentInfo>
          <ToggleGroup>
            {!isExternalMode && (
              <ToggleButton 
                onClick={onToggleLeft}
                title={leftCollapsed ? '展开导航栏' : '收起导航栏'}
              >
                {leftCollapsed ? '▶' : '◀'}
              </ToggleButton>
            )}
            <ToggleButton 
              onClick={onToggleOutline}
              title={outlineOpen ? '收起大纲' : '展开大纲'}
            >
              {outlineOpen ? '»' : '«'}
            </ToggleButton>
          </ToggleGroup>
          
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
        
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', height: '100%' }}>
          {!isExternalMode && currentDocument && (
            <>
              <ShareButton onClick={handleShareClick}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                分享
              </ShareButton>
              <EditButton 
                onClick={handleEditClick}
                disabled={!currentDocument}
              >
                编辑
              </EditButton>
            </>
          )}
        </div>
      </TopNavContainer>

      {/* 分享弹窗 */}
      {showShareModal && (
        <ModalOverlay onClick={(e) => {
          if (e.target === e.currentTarget) setShowShareModal(false);
        }}>
          <ModalContent>
            <ModalHeader>
              <span>分享文档</span>
              <span className="close-icon" onClick={() => setShowShareModal(false)}>×</span>
            </ModalHeader>
            <ModalBody>
              <TabGroup>
                <TabItem 
                  $active={shareType === 'internal'} 
                  onClick={() => { setShareType('internal'); setCopyStatus(false); }}
                >
                  内部分享
                </TabItem>
                <TabItem 
                  $active={shareType === 'external'} 
                  onClick={() => { 
                    setShareType('external'); 
                    setCopyStatus(false);
                    setShareLink(''); // 切换标签时清空链接，需要重新生成
                  }}
                >
                  外部分享
                </TabItem>
              </TabGroup>
              
              <ShareContent>
                <div className="description">
                  {shareType === 'internal' 
                    ? '生成内部链接，接收者点开后可直接定位到该文档，拥有完整的查看和编辑权限（取决于接收者的角色权限）。'
                    : '生成外部专注链接，界面将隐藏左侧导航栏，仅展示当前文档内容，适合专注于阅读单个文档。'}
                </div>
                
                <LinkBox>
                  <input type="text" readOnly value={loadingLink ? '正在生成链接...' : shareLink} />
                  <CopyButton 
                    className={copyStatus ? 'copied' : ''} 
                    onClick={handleCopy}
                    disabled={loadingLink || !shareLink}
                    style={{ opacity: (loadingLink || !shareLink) ? 0.6 : 1, cursor: (loadingLink || !shareLink) ? 'not-allowed' : 'pointer' }}
                  >
                    {copyStatus ? '已复制' : '复制链接'}
                  </CopyButton>
                </LinkBox>
              </ShareContent>
            </ModalBody>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
}
