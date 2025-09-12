/**
 * 树状导航错误边界组件
 */

import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 20px;
  text-align: center;
  color: #ff4d4f;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  margin: 16px;
`;

const ErrorIcon = styled.div`
  font-size: 24px;
  margin-bottom: 8px;
`;

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  color: #ff4d4f;
  font-size: 16px;
`;

const ErrorMessage = styled.p`
  margin: 0 0 12px 0;
  color: #666;
  font-size: 14px;
`;

const ErrorDetails = styled.details`
  margin-top: 12px;
  text-align: left;
  
  summary {
    cursor: pointer;
    color: #1890ff;
    font-size: 12px;
    margin-bottom: 8px;
  }
  
  pre {
    background-color: #f5f5f5;
    padding: 8px;
    border-radius: 4px;
    font-size: 11px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const RetryButton = styled.button`
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 12px;
  
  &:hover {
    background-color: #40a9ff;
  }
  
  &:active {
    background-color: #096dd9;
  }
`;

class TreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }
  
  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error: error
    };
  }
  
  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('树状导航组件错误:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // 可以在这里添加错误上报逻辑
    this.reportError(error, errorInfo);
  }
  
  reportError = (error, errorInfo) => {
    // 错误上报逻辑
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };
      
      console.log('错误报告:', errorReport);
      
      // 这里可以发送到错误监控服务
      // sendErrorReport(errorReport);
    } catch (reportError) {
      console.error('错误上报失败:', reportError);
    }
  };
  
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };
  
  render() {
    if (this.state.hasError) {
      const { error, errorInfo, retryCount } = this.state;
      
      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>树状导航加载失败</ErrorTitle>
          <ErrorMessage>
            树状导航组件遇到了问题，无法正常显示。
            {retryCount > 0 && ` (已重试 ${retryCount} 次)`}
          </ErrorMessage>
          
          <RetryButton onClick={this.handleRetry}>
            重试
          </RetryButton>
          
          {process.env.NODE_ENV === 'development' && (
            <ErrorDetails>
              <summary>错误详情 (开发模式)</summary>
              <div>
                <strong>错误信息:</strong>
                <pre>{error && error.toString()}</pre>
                
                <strong>组件堆栈:</strong>
                <pre>{errorInfo.componentStack}</pre>
                
                <strong>错误堆栈:</strong>
                <pre>{error && error.stack}</pre>
              </div>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }
    
    return this.props.children;
  }
}

export default TreeErrorBoundary;
