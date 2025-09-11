/**
 * 语雀风格V2版布局组件
 * 新布局：左侧导航 + 右侧内容区域（包含顶部导航栏和文档内容）
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import TopNavigationBar from './TopNavigationBar';
import { generateOutline } from '../utils/dataUtils';

const LayoutContainer = styled.div`
  height: 100vh;
  display: grid;
  grid-template-columns: ${props => {
    // V2版布局：左侧导航栏 + 右侧内容区域
    const leftWidth = props.$leftCollapsed ? '0' : 
      (props.$screenWidth >= 1600 ? '280px' : 
       props.$screenWidth >= 1200 ? '250px' : 
       props.$screenWidth >= 768 ? '200px' : '0');
    return `${leftWidth} 1fr`;
  }};
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  transition: grid-template-columns 0.3s ease;
  
  /* 响应式优化 */
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
`;

const Sidebar = styled.aside`
  border-right: 1px solid #e8e8e8;
  background: #fafafa;
  overflow-y: auto;
  transition: all 0.3s ease;
  position: relative;
  
  &.collapsed {
    width: 0;
    min-width: 0;
    border-right: none;
    overflow: hidden;
  }
  
  /* 移动端响应式：悬浮覆盖模式 */
  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    z-index: 1002; /* 确保在其他内容之上 */
    border-right: none;
    background: #fafafa;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    transform: translateX(${props => props.$mobileCollapsed ? '-100%' : '0'});
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &.collapsed {
      width: 280px; /* 移动端不使用width收起，使用transform */
      min-width: 280px;
      overflow: visible;
    }
  }
`;

// 移动端遮罩层
const MobileBackdrop = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.$show ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1001;
    backdrop-filter: blur(2px);
    transition: opacity 0.3s ease;
    opacity: ${props => props.$show ? 1 : 0};
  }
`;

const MainContent = styled.main`
  background: #ffffff;
  overflow-y: auto;
  padding: 0;
  line-height: 1.6;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  
  /* V2版：文档内容区域占据右侧大部分空间 */
  .content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative; /* 为悬浮大纲提供定位上下文 */
    max-width: ${props => {
      // 根据左侧导航栏状态和屏幕宽度计算最大宽度
      const { $leftCollapsed, $screenWidth } = props;
      
      // 小屏幕：全宽显示
      if ($screenWidth < 768) {
        return '100%';
      }
      
      // 根据左侧导航栏状态确定最大宽度
      if ($leftCollapsed) {
        // 左侧导航栏折叠：更大的内容区域
        if ($screenWidth >= 1600) {
          return '1400px';
        } else if ($screenWidth >= 1200) {
          return '1200px';
        } else {
          return '1000px';
        }
      } else {
        // 左侧导航栏展开：适中的内容区域
        if ($screenWidth >= 1600) {
          return '1200px';
        } else if ($screenWidth >= 1200) {
          return '1000px';
        } else {
          return '800px';
        }
      }
    }};
    margin: 0 auto;
    transition: max-width 0.3s ease;
    
    /* 为悬浮大纲预留左侧空间 */
    @media (min-width: 1200px) {
      margin-left: 320px; /* 为悬浮大纲预留空间 */
    }
    
    @media (max-width: 1199px) and (min-width: 1025px) {
      margin-left: 280px;
    }
    
    @media (max-width: 1024px) and (min-width: 901px) {
      margin-left: 220px;
    }
    
    @media (max-width: 900px) {
      margin-left: 0; /* 小屏幕时不需要预留空间 */
    }
  }
  
  @media (max-width: 900px) {
    .content-wrapper {
      max-width: 100%;
      padding: 0;
      margin-left: 50px !important; /* 小屏幕时留出50px边框安放大纲按钮 */
    }
    
    /* 移动端内容区域优化 */
    .content-wrapper > div:last-child {
      padding: 15px;
    }
  }
  
  @media (max-width: 768px) {
    .content-wrapper {
      max-width: 100%;
      padding: 0;
      margin-left: 50px !important; /* 保持50px左边距 */
    }
    
    /* 移动端内容区域优化 */
    .content-wrapper > div:last-child {
      padding: 15px;
    }
  }
  
  /* 中等屏幕优化 */
  @media (max-width: 1200px) and (min-width: 769px) {
    .content-wrapper {
      max-width: ${props => {
        const { $leftCollapsed } = props;
        return $leftCollapsed ? '1000px' : '800px';
      }};
    }
  }
  
  /* 大屏幕优化 */
  @media (min-width: 1201px) {
    .content-wrapper {
      max-width: ${props => {
        const { $leftCollapsed } = props;
        return $leftCollapsed ? '1400px' : '1200px';
      }};
    }
  }
`;


// V2版本：移除右侧固定大纲栏，改为悬浮容器（在后续阶段实现）

// V2版本：移除EdgeToggleButton，切换功能移至顶部导航栏

// V2版本：悬浮大纲组件样式 - 玻璃质感设计
const FloatingOutline = styled.div`
  position: fixed;
  left: ${props => `${props.$dynamicLeft}px`};
  top: ${props => `${props.$dynamicTop}px`};
  width: 280px;
  max-height: calc(100vh - 100px); /* 限制最大高度，避免超出视窗 */
  
  /* 玻璃质感背景 */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  
  /* 边框和阴影 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  
  z-index: 1000;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* 收起状态 - 玻璃质感按钮 */
  ${props => props.$collapsed && `
    width: 40px !important;
    height: 40px !important;
    border-radius: 50%;
    left: ${props => `${props.$dynamicLeft}px`};
    top: ${props => `${props.$dynamicTop}px`};
    max-height: none;
    cursor: pointer;
    
    /* 收起时的玻璃质感 */
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.1),
      0 1px 3px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    
    &:hover {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(200%);
      -webkit-backdrop-filter: blur(20px) saturate(200%);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.15),
        0 2px 6px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 1);
      transform: scale(1.05);
    }
  `}
  
  /* 响应式设计 - 当屏幕缩小时自动收缩（仅对展开状态生效） */
  ${props => !props.$collapsed && `
    @media (max-width: 1200px) {
      width: 240px;
    }
    
    @media (max-width: 1024px) {
      width: 180px;
    }
  `}
  
  /* 小屏幕时自动收起成按钮，使用动态位置 - 玻璃质感 */
  @media (max-width: 900px) {
    width: 24px !important;
    height: 24px !important;
    border-radius: 8px;
    left: ${props => `${props.$dynamicLeft}px`} !important;
    top: ${props => `${props.$dynamicTop}px`} !important;
    max-height: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    /* 小按钮的玻璃质感 */
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px) saturate(180%);
    -webkit-backdrop-filter: blur(12px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 
      0 2px 8px rgba(0, 0, 0, 0.08),
      0 1px 3px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
    
    /* 悬停时显示完整大纲 */
    &:hover {
      width: 280px !important;
      height: auto !important;
      border-radius: 16px;
      max-height: calc(100vh - 100px);
      
      /* 展开时的增强玻璃质感 */
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      
      /* 悬停时显示内容 */
      .outline-content {
        display: block;
      }
      
      /* 悬停时隐藏按钮图标 */
      > div:first-child {
        display: none;
      }
    }
    
    /* 默认隐藏内容，只显示按钮 */
    .outline-content {
      display: none;
    }
  }
  
  /* 移动端隐藏大纲按钮 */
  @media (max-width: 768px) {
    display: none !important;
  }
`;

const FloatingOutlineHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  
  .outline-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.8);
    margin: 0;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  }
  
  .toggle-button {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 6px;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
      color: rgba(0, 0, 0, 0.9);
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    /* 小屏幕下隐藏关闭按钮，避免悬停展开时的抽搐问题 */
    @media (max-width: 900px) {
      display: none;
    }
  }
`;

const FloatingOutlineContent = styled.div`
  padding: 8px 0;
  max-height: calc(70vh - 60px);
  overflow-y: auto;
  
  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #bfbfbf;
  }
`;

const OutlineList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const OutlineItem = styled.li`
  margin: 2px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  padding: 6px 16px;
  
  &.level-1 {
    font-weight: 500;
    font-size: 13px;
  }
  
  &.level-2 {
    font-size: 12px;
    color: #666;
  }
  
  &.level-3 {
    font-size: 11px;
    color: #999;
  }
  
  &.level-4, &.level-5, &.level-6 {
    font-size: 11px;
    color: #ccc;
  }
  
  &:hover {
    background-color: #f0f0f0;
    color: #1890ff;
  }
  
  &.active {
    background-color: #e6f7ff;
    color: #1890ff;
    font-weight: 500;
  }
`;

const CollapsedIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 16px;
  color: #666;
  
  &:hover {
    color: #1890ff;
  }
  
  /* 小屏幕时调整图标大小 */
  @media (max-width: 900px) {
    font-size: 10px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 20px 16px;
  
  .empty-icon {
    font-size: 20px;
    margin-bottom: 8px;
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
 * V2版布局组件
 * @param {object} props - 组件属性
 * @param {React.ReactNode} props.leftSidebar - 左侧导航栏内容
 * @param {React.ReactNode} props.mainContent - 主内容区
 * @param {React.ReactNode} props.rightSidebar - 右侧大纲内容（暂时保留，后续改为悬浮）
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
  // V2版：状态管理
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  // V2版本：移除leftHovered状态，不再需要
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  
  // 移动端导航栏状态
  const [mobileNavCollapsed, setMobileNavCollapsed] = useState(true);
  
  // 悬浮大纲状态
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [outline, setOutline] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [outlinePosition, setOutlinePosition] = useState({ left: 20, top: 20 });
  
  const leftSidebarRef = useRef(null);
  // V2版本：移除leftButtonRef，不再需要
  
  // 监听屏幕宽度变化
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 生成大纲 - 直接从实际DOM采集带有id的标题，避免包含顶部自定义标题
  useEffect(() => {
    const timer = setTimeout(() => {
      const headingNodeList = document.querySelectorAll(
        'main .content-wrapper h1[id], main .content-wrapper h2[id], main .content-wrapper h3[id], main .content-wrapper h4[id], main .content-wrapper h5[id], main .content-wrapper h6[id]'
      );
      const headingElements = Array.from(headingNodeList);
      if (headingElements.length === 0) {
        setOutline([]);
        setActiveHeadingId('');
        return;
      }
      const newOutline = headingElements.map((el) => ({
        id: el.id,
        level: parseInt(el.tagName.charAt(1), 10),
        text: (el.textContent || '').trim(),
      }));
      setOutline(newOutline);
      setActiveHeadingId('');
    }, 100);

    return () => clearTimeout(timer);
  }, [mainContent]);
  
  // 监听滚动，高亮当前标题
  useEffect(() => {
    if (outline.length === 0) return;
    
    const handleScroll = () => {
      const headings = outline.map(item => 
        document.getElementById(item.id)
      ).filter(Boolean);
      
      if (headings.length === 0) return;
      
      // 获取主内容区域的滚动容器
      const mainContent = document.querySelector('main');
      if (!mainContent) return;
      
      // 找到当前可见的标题
      let current = null;
      const scrollTop = mainContent.scrollTop;
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        const rect = heading.getBoundingClientRect();
        const containerRect = mainContent.getBoundingClientRect();
        const headingTop = rect.top - containerRect.top + scrollTop;
        
        if (headingTop <= scrollTop + 100) {
          current = heading;
          break;
        }
      }
      
      if (current) {
        setActiveHeadingId(current.id);
      } else {
        // 如果滚动到顶部，高亮第一个标题
        const firstHeadingId = headings[0]?.id || '';
        setActiveHeadingId(firstHeadingId);
      }
    };
    
    // 防抖处理
    let timeoutId;
    const debouncedHandleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };
    
    // 监听主内容区域的滚动
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('scroll', debouncedHandleScroll);
      
      // 初始检查
      handleScroll();
      
      return () => {
        mainContent.removeEventListener('scroll', debouncedHandleScroll);
        clearTimeout(timeoutId);
      };
    }
  }, [outline]);
  
  // 根据屏幕宽度自动收起大纲和移动端导航栏
  useEffect(() => {
    // 当屏幕宽度小于900px时自动收起大纲，显示为按钮
    if (screenWidth <= 900) {
      setOutlineCollapsed(true);
    } else {
      // 大屏幕时保持展开状态
      setOutlineCollapsed(false);
    }
    
    // 移动端自动收起导航栏
    if (screenWidth <= 768) {
      setMobileNavCollapsed(true);
    }
  }, [screenWidth]);

  // 动态计算大纲按钮位置
  const calculateOutlinePosition = useCallback(() => {
    const leftNavElement = document.querySelector('.sc-hwkwBN.vVqyi');
    const topNavElement = document.querySelector('.sc-bRKDuR.brlhrh');
    
    let leftNavWidth = 0;
    let topNavHeight = 0;
    
    // 计算左侧导航栏宽度
    if (leftNavElement) {
      leftNavWidth = leftNavElement.offsetWidth;
    } else {
      // 如果找不到元素，根据屏幕宽度和折叠状态估算
      if (!leftCollapsed) {
        if (screenWidth >= 1600) {
          leftNavWidth = 280;
        } else if (screenWidth >= 1200) {
          leftNavWidth = 250;
        } else if (screenWidth >= 768) {
          leftNavWidth = 200;
        } else {
          leftNavWidth = 0;
        }
      }
    }
    
    // 计算顶部导航栏高度
    if (topNavElement) {
      topNavHeight = topNavElement.offsetHeight;
    } else {
      // 如果找不到元素，使用默认高度估算
      topNavHeight = 60; // 默认顶部导航栏高度
    }
    
    const newPosition = {
      left: leftNavWidth + 10,
      top: topNavHeight + 10
    };
    
    setOutlinePosition(newPosition);
    return newPosition;
  }, [leftCollapsed, screenWidth]);

  // 监听窗口大小变化，重新计算位置（移除延迟）
  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      // 使用requestAnimationFrame确保在同一帧内更新位置
      window.requestAnimationFrame(() => {
        calculateOutlinePosition();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateOutlinePosition]);

  // 组件挂载时计算初始位置（移除延迟）
  useEffect(() => {
    // 下一个动画帧立即计算，避免500ms延迟
    const rafId = window.requestAnimationFrame(() => {
      calculateOutlinePosition();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [calculateOutlinePosition]);

  // 左侧折叠状态变化时立即重新计算位置
  useEffect(() => {
    window.requestAnimationFrame(() => {
      calculateOutlinePosition();
    });
  }, [leftCollapsed, calculateOutlinePosition]);
  
  // 触摸交互优化
  useEffect(() => {
    const handleTouchStart = (e) => {
      // 为触摸设备添加触摸反馈
      if (e.target.closest('.touch-feedback')) {
        e.target.style.transform = 'scale(0.95)';
      }
    };
    
    const handleTouchEnd = (e) => {
      if (e.target.closest('.touch-feedback')) {
        e.target.style.transform = 'scale(1)';
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
  
  // 性能优化：减少不必要的重渲染
  const memoizedOutline = useMemo(() => {
    return outline.map(item => (
      <OutlineItem
        key={item.id}
        className={`level-${item.level} ${activeHeadingId === item.id ? 'active' : ''} touch-feedback`}
        onClick={() => scrollToHeading(item.id)}
        title={item.text}
      >
        {item.text}
      </OutlineItem>
    ));
  }, [outline, activeHeadingId, scrollToHeading]);
  
  // V2版本：移除鼠标进入/离开处理函数，不再需要
  
  // 处理左侧按钮点击
  const handleLeftToggleClick = useCallback(() => {
    const isMobile = screenWidth <= 768;
    
    if (isMobile) {
      // 移动端：切换悬浮导航栏
      setMobileNavCollapsed(!mobileNavCollapsed);
    } else {
      // 桌面端：切换侧边栏
      setLeftCollapsed(!leftCollapsed);
    }
  }, [leftCollapsed, mobileNavCollapsed, screenWidth]);
  
  // 处理悬浮大纲切换
  const handleOutlineToggle = useCallback(() => {
    setOutlineCollapsed(!outlineCollapsed);
  }, [outlineCollapsed]);

  // 处理移动端遮罩点击
  const handleMobileBackdropClick = useCallback(() => {
    setMobileNavCollapsed(true);
  }, []);

  // 移动端触摸手势支持
  useEffect(() => {
    if (screenWidth > 768) return; // 只在移动端启用
    
    let startX = 0;
    let currentX = 0;
    let isDragging = false;
    
    const handleTouchStart = (e) => {
      if (!mobileNavCollapsed) {
        startX = e.touches[0].clientX;
        isDragging = true;
      }
    };
    
    const handleTouchMove = (e) => {
      if (!isDragging || mobileNavCollapsed) return;
      
      currentX = e.touches[0].clientX;
      const deltaX = currentX - startX;
      
      // 只允许向左滑动关闭
      if (deltaX < 0) {
        const sidebarElement = leftSidebarRef.current;
        if (sidebarElement) {
          const progress = Math.max(0, Math.min(1, Math.abs(deltaX) / 200));
          sidebarElement.style.transform = `translateX(${deltaX}px)`;
          sidebarElement.style.opacity = 1 - progress * 0.3;
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (!isDragging || mobileNavCollapsed) return;
      
      const deltaX = currentX - startX;
      const sidebarElement = leftSidebarRef.current;
      
      if (sidebarElement) {
        sidebarElement.style.transform = '';
        sidebarElement.style.opacity = '';
      }
      
      // 如果滑动距离超过100px，关闭导航栏
      if (deltaX < -100) {
        setMobileNavCollapsed(true);
      }
      
      isDragging = false;
      startX = 0;
      currentX = 0;
    };
    
    const sidebarElement = leftSidebarRef.current;
    if (sidebarElement) {
      sidebarElement.addEventListener('touchstart', handleTouchStart, { passive: true });
      sidebarElement.addEventListener('touchmove', handleTouchMove, { passive: true });
      sidebarElement.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        sidebarElement.removeEventListener('touchstart', handleTouchStart);
        sidebarElement.removeEventListener('touchmove', handleTouchMove);
        sidebarElement.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [screenWidth, mobileNavCollapsed, leftSidebarRef]);
  
  // 跳转到指定标题
  const scrollToHeading = useCallback((headingId) => {
    const element = document.getElementById(headingId);
    if (element) {
      // 借助CSS中的 scroll-margin-top 与固定顶栏配合，使用原生滚动定位
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveHeadingId(headingId);
    } else {
      console.warn(`未找到ID为 ${headingId} 的标题元素`);
    }
  }, []);
  
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
      $screenWidth={screenWidth}
    >
      {loading && (
        <LoadingOverlay>
          <div className="loading-text">正在加载文档...</div>
        </LoadingOverlay>
      )}
      
      {/* V2版本：移除EdgeToggleButton，切换功能移至顶部导航栏 */}
      
      {/* 移动端遮罩层 */}
      <MobileBackdrop 
        $show={screenWidth <= 768 && !mobileNavCollapsed}
        onClick={handleMobileBackdropClick}
      />
      
      <Sidebar 
        ref={leftSidebarRef}
        className={leftCollapsed ? 'collapsed' : ''}
        $mobileCollapsed={mobileNavCollapsed}
      >
        {leftSidebar}
      </Sidebar>
      
      <MainContent 
        $leftCollapsed={leftCollapsed}
        $screenWidth={screenWidth}
      >
        {/* V2版本：顶部导航栏直接放在MainContent下，不受content-wrapper宽度限制 */}
              <TopNavigationBar
                currentDocument={currentDocument}
                config={config}
                onEditSuccess={onEditSuccess}
                onEditError={onEditError}
                leftCollapsed={leftCollapsed}
                screenWidth={screenWidth}
                onToggleLeft={handleLeftToggleClick}
              />
        
        <div className="content-wrapper">
          <div style={{ padding: '20px', flex: 1 }}>
            {mainContent}
          </div>
        </div>
      </MainContent>
      
      {/* V2版：悬浮大纲组件 - 固定在视窗中，不受滚动影响 */}
      <FloatingOutline
        $collapsed={outlineCollapsed}
        $screenWidth={screenWidth}
        $leftCollapsed={leftCollapsed}
        $dynamicLeft={outlinePosition.left}
        $dynamicTop={outlinePosition.top}
        onClick={outlineCollapsed && screenWidth > 900 ? handleOutlineToggle : undefined}
        className="touch-feedback"
      >
        {outlineCollapsed ? (
          <>
            <CollapsedIcon>
              📋
            </CollapsedIcon>
            {/* 小屏幕时也渲染内容，但通过CSS隐藏 */}
            {screenWidth <= 900 && (
              <div className="outline-content">
                <FloatingOutlineHeader>
                  <h3 className="outline-title">大纲</h3>
                  <button 
                    className="toggle-button"
                    onClick={handleOutlineToggle}
                    title="收起大纲"
                  >
                    ×
                  </button>
                </FloatingOutlineHeader>
                
                <FloatingOutlineContent>
                  {outline.length === 0 ? (
                    <EmptyState>
                      <div className="empty-icon">📋</div>
                      <div>暂无大纲</div>
                    </EmptyState>
                  ) : (
                    <OutlineList>
                      {memoizedOutline}
                    </OutlineList>
                  )}
                </FloatingOutlineContent>
              </div>
            )}
          </>
        ) : (
          <div className="outline-content">
            <FloatingOutlineHeader>
              <h3 className="outline-title">大纲</h3>
              <button 
                className="toggle-button"
                onClick={handleOutlineToggle}
                title="收起大纲"
              >
                ×
              </button>
            </FloatingOutlineHeader>
            
            <FloatingOutlineContent>
              {outline.length === 0 ? (
                <EmptyState>
                  <div className="empty-icon">📋</div>
                  <div>暂无大纲</div>
                </EmptyState>
              ) : (
                <OutlineList>
                  {memoizedOutline}
                </OutlineList>
              )}
            </FloatingOutlineContent>
          </div>
        )}
      </FloatingOutline>
      
    </LayoutContainer>
  );
}
