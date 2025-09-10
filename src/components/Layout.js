/**
 * 语雀风格三栏布局组件
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import TopNavigationBar from './TopNavigationBar';

const LayoutContainer = styled.div`
  height: 100vh;
  display: grid;
  grid-template-columns: ${props => {
    // 即使导航栏隐藏，也保留左边距，让文本内容保持在相同位置
    const leftWidth = props.$leftCollapsed ? 
      (props.$screenWidth >= 1600 ? '280px' : props.$screenWidth >= 1200 ? '250px' : '180px') : 
      (props.$screenWidth < 1200 ? '200px' : '250px');
    const rightWidth = props.$rightCollapsed ? '0' : (props.$screenWidth < 1200 ? '150px' : '200px');
    return `${leftWidth} 1fr ${rightWidth}`;
  }};
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: grid-template-columns 0.3s ease;
  
  /* 大屏幕优化 */
  @media (min-width: 1600px) {
    grid-template-columns: ${props => {
      // 即使导航栏隐藏，也保留左边距
      const leftWidth = props.$leftCollapsed ? '280px' : '280px';
      const rightWidth = props.$rightCollapsed ? '0' : '250px';
      return `${leftWidth} 1fr ${rightWidth}`;
    }};
  }
  
  /* 中等屏幕 */
  @media (max-width: 1200px) and (min-width: 769px) {
    grid-template-columns: ${props => {
      // 即使导航栏隐藏，也保留左边距
      const leftWidth = props.$leftCollapsed ? '180px' : '180px';
      const rightWidth = props.$rightCollapsed ? '0' : '140px';
      return `${leftWidth} 1fr ${rightWidth}`;
    }};
  }
  
  /* 小屏幕 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
`;

const Sidebar = styled.aside`
  border-right: 1px solid #e8e8e8;
  background: ${props => props.$isHovered ? '#fafafa' : 'transparent'};
  overflow-y: auto;
  transition: all 0.3s ease;
  position: relative;
  
  /* 透明状态下的样式 */
  ${props => !props.$isHovered && !props.$collapsed && `
    background: transparent;
    border-right: 1px solid transparent;
    
    /* 添加一个不可见的悬停区域 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      right: -10px;
      width: 20px;
      height: 100%;
      background: transparent;
      z-index: 1;
    }
  `}
  
  &.collapsed {
    width: 0;
    min-width: 0;
    border-right: none;
    overflow: hidden;
  }
  
  @media (max-width: 768px) {
    border-right: none;
    border-bottom: 1px solid #e8e8e8;
    max-height: 200px;
    background: #fafafa !important;
  }
`;

const MainContent = styled.main`
  background: #ffffff;
  overflow-y: auto;
  padding: 0;
  line-height: 1.6;
  width: 100%;
  position: relative;
  
  /* 内容区域的最大宽度控制，但不影响滚动条位置 */
  & > * {
    max-width: ${props => {
      // 根据侧边栏状态和屏幕宽度计算最大宽度
      const { $leftCollapsed, $rightCollapsed, $screenWidth } = props;
      
      // 小屏幕：全宽显示
      if ($screenWidth < 768) {
        return '100%';
      }
      
      // 根据显示模式确定最大宽度
      if ($leftCollapsed && $rightCollapsed) {
        // 单栏显示：根据屏幕大小调整最大宽度
        if ($screenWidth >= 1600) {
          return '1400px';
        } else if ($screenWidth >= 1200) {
          return '1200px';
        } else {
          return '1000px';
        }
      } else if ($leftCollapsed || $rightCollapsed) {
        // 双栏显示：根据屏幕大小调整最大宽度
        if ($screenWidth >= 1600) {
          return '1200px';
        } else if ($screenWidth >= 1200) {
          return '1000px';
        } else {
          return '800px';
        }
      } else {
        // 三栏显示：根据屏幕大小调整最大宽度
        if ($screenWidth >= 1600) {
          return '1000px';
        } else if ($screenWidth >= 1200) {
          return '800px';
        } else {
          return '600px';
        }
      }
    }};
    margin: 0 auto;
    transition: max-width 0.3s ease;
  }
  
  @media (max-width: 768px) {
    padding: 15px;
    
    & > * {
      max-width: 100%;
    }
  }
`;


const OutlineSidebar = styled.aside`
  border-left: 1px solid #e8e8e8;
  background: ${props => props.$isHovered ? '#fafafa' : 'transparent'};
  overflow-y: auto;
  transition: all 0.3s ease;
  position: relative;
  
  /* 透明状态下的样式 */
  ${props => !props.$isHovered && !props.$collapsed && `
    background: transparent;
    border-left: 1px solid transparent;
    
    /* 添加一个不可见的悬停区域 */
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -10px;
      width: 20px;
      height: 100%;
      background: transparent;
      z-index: 1;
    }
  `}
  
  &.collapsed {
    width: 0;
    min-width: 0;
    border-left: none;
    overflow: hidden;
  }
  
  @media (max-width: 768px) {
    border-left: none;
    border-top: 1px solid #e8e8e8;
    max-height: 150px;
    background: #fafafa !important;
  }
`;

const EdgeToggleButton = styled.button`
  /* 固定定位，让按钮始终显示在屏幕上 */
  position: fixed;
  /* 垂直居中定位 */
  top: 10%;
  /* 向上偏移自身高度的一半，实现垂直居中 */
  /*transform: translateY(-50%);*/
  /* 根据导航栏状态和屏幕宽度动态设置水平位置 */
  left: ${props => {
    if (props.$collapsed) return '0px';
    // 根据屏幕宽度确定侧边栏宽度
    if (props.$screenWidth >= 1600) return '280px';
    if (props.$screenWidth >= 1200) return '250px';
    return '180px';
  }};
  /* 按钮宽度：4px，设计为细长条状 */
  width: 4px;
  /* 按钮高度：40px */
  height: 40px;
  /* 默认背景色：折叠时始终显示，展开时根据悬停状态显示 */
  background: ${props => props.$collapsed ? 'rgb(225, 225, 225)' : (props.$isHovered ? 'rgb(225, 225, 225)' : 'transparent')};
  /* 移除默认边框 */
  border: none;
  /* 圆角设置：右侧两个角为圆角，左侧为直角 */
  border-radius: 0 8px 8px 0;
  /* 层级设置：确保按钮显示在其他元素之上 */
  z-index: 1000;
  /* 过渡动画：背景色和阴影的过渡效果，持续0.3秒，缓动效果 */
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  /* 默认阴影效果：折叠时始终显示，展开时根据悬停状态显示 */
  box-shadow: ${props => props.$collapsed ? '1px 0 3px rgba(0, 0, 0, 0.1)' : (props.$isHovered ? '1px 0 3px rgba(0, 0, 0, 0.1)' : 'none')};
  
  /* 鼠标悬停时的样式 */
  &:hover {
    /* 悬停时背景色变为蓝色 */
    background:#1890ff;
    /* 悬停时阴影效果：无偏移，无模糊，蓝色半透明 */
    box-shadow: 2px 0 6px rgba(190, 190, 190, 0.3);
  }
  
  /* 鼠标按下时的样式 */
  &:active {
    /* 按下时背景色变为深蓝色 */
    background: #40a9ff;
  }
  
  /* 当导航栏折叠时，按钮显示在屏幕左边缘 */
  ${props => props.$collapsed && `
    left: 0px;
    border-radius: 0 2px 2px 0;
  `}
  
  /* 当导航栏展开时，按钮显示在导航栏右边缘 */
  ${props => !props.$collapsed && `
    border-radius: 0 2px 2px 0;
  `}
  
  @media (max-width: 768px) {
    display: none;
  }
  
  /* 添加箭头符号指示器 */
  &::before {
    content: ${props => props.$collapsed ? '"▶"' : '"◀"'};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(0, 0, 0, 0.8);
    font-size: 10px;
    font-weight: bold;
    /* 根据状态控制透明度：折叠时始终显示，展开时根据悬停状态显示 */
    opacity: ${props => props.$collapsed ? '0.6' : (props.$isHovered ? '0.6' : '0')};
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const RightEdgeToggleButton = styled.button`
  /* 固定定位，让按钮始终显示在屏幕上 */
  position: fixed;
  /* 垂直居中定位 */
  top: 10%;
  /* 根据大纲状态和屏幕宽度动态设置水平位置 */
  right: ${props => {
    if (props.$collapsed) return '0px';
    // 根据屏幕宽度确定侧边栏宽度
    if (props.$screenWidth >= 1600) return '250px';
    if (props.$screenWidth >= 1200) return '200px';
    return '140px';
  }};
  /* 按钮宽度：4px，设计为细长条状 */
  width: 4px;
  /* 按钮高度：40px */
  height: 40px;
  /* 默认背景色：折叠时始终显示，展开时根据悬停状态显示 */
  background: ${props => props.$collapsed ? 'rgb(225, 225, 225)' : (props.$isHovered ? 'rgb(225, 225, 225)' : 'transparent')};
  /* 移除默认边框 */
  border: none;
  /* 圆角设置：左侧两个角为圆角，右侧为直角 */
  border-radius: 8px 0 0 8px;
  /* 层级设置：确保按钮显示在其他元素之上 */
  z-index: 1000;
  /* 过渡动画：背景色和阴影的过渡效果，持续0.3秒，缓动效果 */
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
  /* 默认阴影效果：折叠时始终显示，展开时根据悬停状态显示 */
  box-shadow: ${props => props.$collapsed ? '1px 0 3px rgba(0, 0, 0, 0.1)' : (props.$isHovered ? '1px 0 3px rgba(0, 0, 0, 0.1)' : 'none')};
  
  /* 鼠标悬停时的样式 */
  &:hover {
    /* 悬停时背景色变为灰色 */
    background: rgb(185, 185, 185);
    /* 悬停时阴影效果 */
    box-shadow: 2px 0 6px rgba(190, 190, 190, 0.3);
  }
  
  /* 鼠标按下时的样式 */
  &:active {
    /* 按下时背景色变为深蓝色 */
    background: #40a9ff;
  }
  
  /* 当大纲折叠时，按钮显示在屏幕右边缘 */
  ${props => props.$collapsed && `
    right: 0px;
    border-radius: 8px 0 0 8px;
  `}
  
  /* 当大纲展开时，按钮显示在大纲左边缘 */
  ${props => !props.$collapsed && `
    border-radius: 8px 0 0 8px;
  `}
  
  @media (max-width: 768px) {
    display: none;
  }
  
  /* 添加箭头符号指示器 */
  &::before {
    content: ${props => props.$collapsed ? '"◀"' : '"▶"'};
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: rgba(0, 0, 0, 0.8);
    font-size: 10px;
    font-weight: bold;
    /* 根据状态控制透明度：折叠时始终显示，展开时根据悬停状态显示 */
    opacity: ${props => props.$collapsed ? '0.6' : (props.$isHovered ? '0.6' : '0')};
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  &:hover::before {
    opacity: 1;
  }
`;

const ReadingModeButton = styled.button`
  position: fixed;
  top: 20px;
  right: 120px;
  z-index: 1000;
  background: ${props => props.$isReadingMode ? '#52c41a' : '#1890ff'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: background-color 0.3s ease;
  
  &:hover {
    background: ${props => props.$isReadingMode ? '#73d13d' : '#40a9ff'};
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const RightToggleButton = styled.button`
  position: fixed;
  top: 20px;
  right: 10px;
  z-index: 1000;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  &:hover {
    background: #40a9ff;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  
  .loading-text {
    color: #666;
    font-size: 16px;
  }
`;

const ErrorMessage = styled.div`
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 16px;
  margin: 20px;
  border-radius: 6px;
  
  .error-title {
    font-weight: bold;
    margin-bottom: 8px;
  }
  
  .error-details {
    font-size: 14px;
    color: #666;
  }
`;

/**
 * 三栏布局组件
 * @param {object} props - 组件属性
 * @param {React.ReactNode} props.leftSidebar - 左侧导航栏内容
 * @param {React.ReactNode} props.mainContent - 中间主内容区
 * @param {React.ReactNode} props.rightSidebar - 右侧大纲内容
 * @param {boolean} props.loading - 是否显示加载状态
 * @param {string} props.error - 错误信息
 * @param {object} props.currentDocument - 当前文档对象
 * @param {object} props.config - 明道云配置对象
 * @param {function} props.onEditSuccess - 编辑成功回调
 * @param {function} props.onEditError - 编辑失败回调
 */
export default function Layout({ 
  leftSidebar, 
  mainContent, 
  rightSidebar, 
  loading = false,
  error = null,
  currentDocument = null,
  config = null,
  onEditSuccess = null,
  onEditError = null
}) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [isReadingMode, setIsReadingMode] = useState(false);
  
  const leftSidebarRef = useRef(null);
  const leftButtonRef = useRef(null);
  const rightSidebarRef = useRef(null);
  const rightButtonRef = useRef(null);
  
  // 监听屏幕宽度变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 处理左侧导航栏鼠标进入
  const handleLeftMouseEnter = useCallback(() => {
    if (!leftCollapsed) {
      setLeftHovered(true);
    }
  }, [leftCollapsed]);
  
  // 处理左侧导航栏鼠标离开
  const handleLeftMouseLeave = useCallback(() => {
    setLeftHovered(false);
  }, []);
  
  // 处理左侧按钮点击
  const handleLeftToggleClick = useCallback(() => {
    setLeftCollapsed(!leftCollapsed);
    // 如果展开导航栏，显示悬停状态
    if (leftCollapsed) {
      setLeftHovered(true);
    }
  }, [leftCollapsed]);
  
  // 处理右侧大纲鼠标进入
  const handleRightMouseEnter = useCallback(() => {
    if (!rightCollapsed) {
      setRightHovered(true);
    }
  }, [rightCollapsed]);
  
  // 处理右侧大纲鼠标离开
  const handleRightMouseLeave = useCallback(() => {
    setRightHovered(false);
  }, []);
  
  // 处理右侧按钮点击
  const handleRightToggleClick = useCallback(() => {
    setRightCollapsed(!rightCollapsed);
    // 如果展开大纲，显示悬停状态
    if (rightCollapsed) {
      setRightHovered(true);
    }
  }, [rightCollapsed]);
  
  // 处理阅读模式切换
  const handleReadingModeToggle = useCallback(() => {
    const newReadingMode = !isReadingMode;
    setIsReadingMode(newReadingMode);
    
    if (newReadingMode) {
      // 进入阅读模式：隐藏所有侧边栏
      setLeftCollapsed(true);
      setRightCollapsed(true);
      setLeftHovered(false);
      setRightHovered(false);
    } else {
      // 退出阅读模式：恢复之前的侧边栏状态
      setLeftCollapsed(false);
      setRightCollapsed(false);
    }
  }, [isReadingMode]);
  
  if (error) {
    return (
      <LayoutContainer>
        <ErrorMessage>
          <div className="error-title">加载失败</div>
          <div className="error-details">{error}</div>
        </ErrorMessage>
      </LayoutContainer>
    );
  }
  
  return (
    <LayoutContainer 
      $leftCollapsed={leftCollapsed}
      $rightCollapsed={rightCollapsed}
      $screenWidth={screenWidth}
    >
      {loading && (
        <LoadingOverlay>
          <div className="loading-text">正在加载文档...</div>
        </LoadingOverlay>
      )}
      
      <EdgeToggleButton 
        ref={leftButtonRef}
        $collapsed={leftCollapsed}
        $isHovered={leftHovered}
        $screenWidth={screenWidth}
        onClick={handleLeftToggleClick}
        onMouseEnter={handleLeftMouseEnter}
        onMouseLeave={handleLeftMouseLeave}
        title={leftCollapsed ? '显示导航栏' : '隐藏导航栏'}
      />
      
      <RightEdgeToggleButton 
        ref={rightButtonRef}
        $collapsed={rightCollapsed}
        $isHovered={rightHovered}
        $screenWidth={screenWidth}
        onClick={handleRightToggleClick}
        onMouseEnter={handleRightMouseEnter}
        onMouseLeave={handleRightMouseLeave}
        title={rightCollapsed ? '显示大纲' : '隐藏大纲'}
      />
      
      {/* 隐藏专注阅读按钮 */}
      {/* <ReadingModeButton 
        $isReadingMode={isReadingMode}
        onClick={handleReadingModeToggle}
        title={isReadingMode ? '退出专注阅读' : '进入专注阅读'}
      >
        {isReadingMode ? '退出专注' : '专注阅读'}
      </ReadingModeButton> */}
      
      <Sidebar 
        ref={leftSidebarRef}
        className={leftCollapsed ? 'collapsed' : ''}
        $isHovered={leftHovered}
        onMouseEnter={handleLeftMouseEnter}
        onMouseLeave={handleLeftMouseLeave}
      >
        {leftSidebar}
      </Sidebar>
      
      <MainContent 
        $leftCollapsed={leftCollapsed}
        $rightCollapsed={rightCollapsed}
        $screenWidth={screenWidth}
      >
        <TopNavigationBar 
          currentDocument={currentDocument}
          config={config}
          onEditSuccess={onEditSuccess}
          onEditError={onEditError}
          leftCollapsed={leftCollapsed}
          rightCollapsed={rightCollapsed}
          screenWidth={screenWidth}
        />
        <div style={{ padding: '20px' }}>
          {mainContent}
        </div>
      </MainContent>
      
      <OutlineSidebar 
        ref={rightSidebarRef}
        className={rightCollapsed ? 'collapsed' : ''}
        $isHovered={rightHovered}
        onMouseEnter={handleRightMouseEnter}
        onMouseLeave={handleRightMouseLeave}
      >
        {rightSidebar}
      </OutlineSidebar>
    </LayoutContainer>
  );
}
