import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { api, config } from 'mdye';
import { loadChildNodes } from '../utils/dataUtils';
import { getEnvValue } from '../utils/envHandler';

// 样式组件
const TableContainer = styled.div`
  margin-top: 24px;
  border-top: 1px solid #e8e8e8;
  padding-top: 20px;
`;

const TableTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TableIcon = styled.span`
  font-size: 18px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const TableHeader = styled.thead`
  background: #fafafa;
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: #262626;
  border-bottom: 1px solid #e8e8e8;
  
  &:first-child {
    border-top-left-radius: 8px;
  }
  
  &:last-child {
    border-top-right-radius: 8px;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
  
  &:hover {
    background-color: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: #262626;
  vertical-align: middle;
`;

const DocumentTitle = styled.div`
  font-weight: 500;
  color: #1890ff;
  
  &:hover {
    color: #40a9ff;
  }
`;

const ModifierInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Avatar = styled.img`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
`;

const ModifierName = styled.span`
  color: #595959;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #8c8c8c;
  font-size: 14px;
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #e8e8e8;
  border-top: 2px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 20px;
  color: #8c8c8c;
  font-size: 14px;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 20px;
  color: #ff4d4f;
  font-size: 14px;
`;

/**
 * 子级文档表格组件
 * @param {object} props - 组件属性
 * @param {string} props.currentDocumentId - 当前文档ID
 * @param {function} props.onDocumentSelect - 文档选择回调函数
 * @param {boolean} props.visible - 是否显示表格
 */
export default function ChildDocumentsTable({ 
  currentDocumentId, 
  onDocumentSelect, 
  visible = true 
}) {
  const [childDocuments, setChildDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingDocumentId, setLoadingDocumentId] = useState(null);

  // 获取子级文档数据
  const fetchChildDocuments = useCallback(async (documentId) => {
    if (!documentId) {
      setChildDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const childrenFieldId = getEnvValue('children');
      
      if (!childrenFieldId) {
        throw new Error('未配置子级关联记录字段');
      }

      console.log('开始获取子级文档:', { documentId, childrenFieldId });
      
      const childNodes = await loadChildNodes(api, config, documentId, childrenFieldId);
      
      console.log('获取到的子级文档:', childNodes);
      
      // 转换数据格式，提取需要的字段
      const documents = childNodes.map(node => {
        // 解析最后修改人信息
        let lastModifier = '未知';
        let modifierAvatar = null;
        
        if (node.rawRecord && node.rawRecord.uaid) {
          try {
            const modifierData = typeof node.rawRecord.uaid === 'string' 
              ? JSON.parse(node.rawRecord.uaid) 
              : node.rawRecord.uaid;
            
            if (modifierData && modifierData.length > 0) {
              lastModifier = modifierData[0].fullname || '未知';
              modifierAvatar = modifierData[0].avatar || null;
            }
          } catch (err) {
            console.error('解析最后修改人信息失败:', err);
          }
        }

        return {
          id: node.id,
          title: node.title,
          content: node.content,
          updateTime: node.rawRecord?.utime || '',
          lastModifier,
          modifierAvatar,
          rawRecord: node.rawRecord
        };
      });

      setChildDocuments(documents);
    } catch (err) {
      console.error('获取子级文档失败:', err);
      setError(err.message);
      setChildDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 当当前文档ID变化时，重新获取子级文档
  useEffect(() => {
    if (visible && currentDocumentId) {
      fetchChildDocuments(currentDocumentId);
    } else {
      setChildDocuments([]);
      setError(null);
    }
  }, [currentDocumentId, visible, fetchChildDocuments]);

  // 处理文档选择
  const handleDocumentClick = useCallback(async (document) => {
    if (!onDocumentSelect) return;
    
    // 如果content为空或只包含空白字符，需要获取完整文档详情
    if (!document.content || !document.content.trim()) {
      setLoadingDocumentId(document.id);
      try {
        console.log('子文档内容为空，开始获取完整文档详情:', document.id);
        
        // 使用getRowDetail获取完整文档信息
        const result = await api.getRowDetail({
          appId: config.appId,
          worksheetId: config.worksheetId,
          viewId: config.viewId,
          rowId: document.id,
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
          // 获取字段ID配置
          const titleFieldId = getEnvValue('titleFieldId');
          const contentFieldId = getEnvValue('contentFieldId');
          
          console.log('字段ID配置:', { titleFieldId, contentFieldId });
          
          // 构建完整的文档对象
          const fullDocument = {
            id: updatedRecord.rowid || document.id,
            title: (titleFieldId && updatedRecord[titleFieldId]) || document.title || '无标题',
            content: (contentFieldId && updatedRecord[contentFieldId]) || '',
            uaid: updatedRecord.uaid || document.rawRecord?.uaid,
            utime: updatedRecord.utime || document.updateTime,
            rawRecord: updatedRecord,
            category: null,
            createTime: updatedRecord.ctime || document.rawRecord?.ctime || '',
            updateTime: updatedRecord.utime || document.updateTime,
            creator: '未知'
          };
          
          console.log('获取到完整文档详情:', fullDocument);
          console.log('内容长度:', fullDocument.content?.length || 0);
          
          onDocumentSelect(fullDocument);
          setLoadingDocumentId(null);
          return;
        } else {
          throw new Error('无法获取文档详情数据');
        }
      } catch (error) {
        console.error('获取文档详情失败:', error);
        setLoadingDocumentId(null);
        // 即使获取失败，也使用原有数据，至少可以显示标题
        // 构建文档对象（可能没有content）
        const fullDocument = {
          id: document.id,
          title: document.title,
          content: document.content || '',
          uaid: document.rawRecord?.uaid,
          utime: document.rawRecord?.utime,
          rawRecord: document.rawRecord,
          category: null,
          createTime: document.rawRecord?.ctime || '',
          updateTime: document.updateTime,
          creator: '未知'
        };
        onDocumentSelect(fullDocument);
      }
    } else {
      // 如果content存在，直接使用原有数据
      // 构建完整的文档对象，包含系统字段
      const fullDocument = {
        id: document.id,
        title: document.title,
        content: document.content || '',
        uaid: document.rawRecord?.uaid,
        utime: document.rawRecord?.utime,
        rawRecord: document.rawRecord,
        // 其他必要字段
        category: null,
        createTime: document.rawRecord?.ctime || '',
        updateTime: document.updateTime,
        creator: '未知'
      };
      
      onDocumentSelect(fullDocument);
    }
  }, [onDocumentSelect]);

  // 格式化时间
  const formatTime = (timeString) => {
    if (!timeString) return '未知';
    try {
      const date = new Date(timeString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return timeString;
    }
  };

  // 如果不显示或没有子级文档，不渲染
  if (!visible || (!loading && childDocuments.length === 0 && !error)) {
    return null;
  }

  return (
    <TableContainer>
      <TableTitle>
        <TableIcon>📋</TableIcon>
        子级文档 ({childDocuments.length})
      </TableTitle>
      
      {loading && (
        <LoadingContainer>
          <LoadingSpinner />
          正在加载子级文档...
        </LoadingContainer>
      )}
      
      {error && (
        <ErrorState>
          加载子级文档失败: {error}
        </ErrorState>
      )}
      
      {!loading && !error && childDocuments.length === 0 && (
        <EmptyState>
          当前文档没有子级文档
        </EmptyState>
      )}
      
      {!loading && !error && childDocuments.length > 0 && (
        <Table>
          <TableHeader>
            <tr>
              <TableHeaderCell>资料名称</TableHeaderCell>
              <TableHeaderCell>最近修改时间</TableHeaderCell>
              <TableHeaderCell>最近修改人</TableHeaderCell>
            </tr>
          </TableHeader>
          <TableBody>
            {childDocuments.map((doc) => (
              <TableRow 
                key={doc.id} 
                onClick={() => handleDocumentClick(doc)}
                style={{ opacity: loadingDocumentId === doc.id ? 0.6 : 1 }}
              >
                <TableCell>
                  <DocumentTitle>
                    {doc.title}
                    {loadingDocumentId === doc.id && (
                      <LoadingSpinner style={{ 
                        display: 'inline-block', 
                        width: '12px', 
                        height: '12px', 
                        marginLeft: '8px',
                        marginRight: 0
                      }} />
                    )}
                  </DocumentTitle>
                </TableCell>
                <TableCell>
                  {formatTime(doc.updateTime)}
                </TableCell>
                <TableCell>
                  <ModifierInfo>
                    {doc.modifierAvatar && (
                      <Avatar 
                        src={doc.modifierAvatar} 
                        alt={doc.lastModifier}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <ModifierName>{doc.lastModifier}</ModifierName>
                  </ModifierInfo>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
}
