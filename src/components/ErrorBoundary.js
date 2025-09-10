/**
 * 错误边界组件
 */

import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 20px;
  background: #f5f5f5;
`;

const ErrorTitle = styled.h1`
  color: #ff4d4f;
  margin-bottom: 16px;
  font-size: 24px;
`;

const ErrorMessage = styled.div`
  color: #666;
  font-size: 16px;
  text-align: center;
  max-width: 600px;
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ErrorDetails = styled.pre`
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 16px;
  font-size: 12px;
  color: #333;
  max-width: 800px;
  overflow: auto;
  white-space: pre-wrap;
`;

const ReloadButton = styled.button`
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: #40a9ff;
  }
`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary捕获到错误:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>出现错误</ErrorTitle>
          <ErrorMessage>
            应用程序遇到了一个错误。请检查控制台获取更多详细信息，或尝试重新加载页面。
          </ErrorMessage>
          {this.state.error && (
            <ErrorDetails>
              {this.state.error.toString()}
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </ErrorDetails>
          )}
          <ReloadButton onClick={this.handleReload}>
            重新加载页面
          </ReloadButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
