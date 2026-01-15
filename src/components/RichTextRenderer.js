/**
 * 富文本渲染组件
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { sanitizeHTML, addHeadingIds } from '../utils/dataUtils';
import { saveReadingProgress, restoreReadingPosition } from '../utils/readingProgress';
import LazyImage from './LazyImage';

// 文档标题样式
const DocumentTitle = styled.h1`
  font-size: 2.5em;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  padding: 24px 16px 16px 16px;
  border-bottom: 2px solid #eaecef;
  line-height: 1.2;
  text-align: left;
  
  /* 响应式字体大小 */
  @media (max-width: 768px) {
    font-size: 2em;
    padding: 20px 12px 12px 12px;
  }
  
  @media (min-width: 1200px) {
    font-size: 2em;
    padding: 28px 20px 20px 20px;
  }
`;

const ContentContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 24px 16px;
  line-height: 1.8;
  color: #333;
  /* 移动端防止横向溢出 */
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
  
  /* V2版本：优化阅读体验 */
  font-size: 16px;
  max-width: none;
  
  /* 响应式字体大小和间距 */
  @media (max-width: 768px) {
    font-size: 15px;
    line-height: 1.7;
    padding: 20px 12px;
  }
  
  @media (min-width: 1200px) {
    font-size: 17px;
    line-height: 1.9;
    padding: 28px 20px;
  }
  
  /* V2版本：优化标题样式 */
  h1, h2, h3, h4, h5, h6 {
    margin: 32px 0 20px 0;
    font-weight: 600;
    line-height: 1.3;
    color: #1a1a1a;
    scroll-margin-top: 50px; /* 为固定导航栏留出空间 */
    
    /* 添加标题锚点样式 */
    position: relative;
    
    &:hover::before {
      content: '#';
      position: absolute;
      left: -20px;
      color: #0366d6;
      opacity: 0.7;
      font-weight: normal;
    }
  }
  
  h1 {
    font-size: 2em !important; /* 32px @ 16px base - 参考飞书文档 */
    border-bottom: 2px solid #eaecef;
    padding-bottom: 0.4em;
    margin-top: 0;
  }
  
  h2 {
    font-size: 1.5em !important; /* 24px @ 16px base - 参考飞书文档 */
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  h3 {
    font-size: 1.25em !important; /* 20px @ 16px base - 参考飞书文档 */
  }
  
  h4 {
    font-size: 1.125em !important; /* 18px @ 16px base - 参考飞书文档 */
  }
  
  h5 {
    font-size: 1em !important; /* 16px @ 16px base - 参考飞书文档 */
  }
  
  h6 {
    font-size: 0.875em !important; /* 14px @ 16px base - 参考飞书文档 */
    color: #6a737d;
  }
  
  /* V2版本：优化段落和列表样式 */
  p {
    margin: 20px 0;
    text-align: justify;
    text-justify: inter-ideograph;
    
    /* 首段缩进 */
    &:first-of-type {
      text-indent: 2em;
    }
  }
  
  blockquote {
    margin: 24px 0;
    padding: 16px 20px;
    color: #6a737d;
    border-left: 4px solid #0366d6;
    background: #f8f9fa;
    border-radius: 0 6px 6px 0;
    font-style: italic;
    
    p {
      margin: 0;
      text-indent: 0;
    }
  }
  
  ul, ol {
    margin: 20px 0;
    padding-left: 30px;
    
    /* 嵌套列表样式 */
    ul, ol {
      margin: 8px 0;
    }
  }
  
  li {
    margin: 8px 0;
    line-height: 1.6;
    
    /* 列表项内容优化 */
    p {
      margin: 4px 0;
      text-indent: 0;
    }
  }
  
  /* V2版本：优化表格样式 */
  table {
    border-collapse: collapse;
    margin: 24px 0;
    width: 100%;
    max-width: 100%;
    table-layout: fixed;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  th, td {
    border: 1px solid #d0d7de;
    padding: 12px 16px;
    text-align: left;
    vertical-align: top;
    word-break: break-word;
  }
  
  th {
    background-color: #f6f8fa;
    font-weight: 600;
    color: #24292e;
  }
  
  tr:nth-child(even) {
    background-color: #f8f9fa;
  }
  
  tr:hover {
    background-color: #e3f2fd;
  }
  
  /* V2版本：优化代码样式 */
  code {
    background-color: #f6f8fa;
    border-radius: 4px;
    font-size: 87%;
    margin: 0 2px;
    padding: 0.2em 0.4em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    color: #e83e8c;
    border: 1px solid #e1e4e8;
  }
  
  pre {
    background-color: #f6f8fa;
    border-radius: 8px;
    font-size: 87%;
    line-height: 1.5;
    overflow: auto;
    max-width: 100%;
    padding: 20px;
    margin: 24px 0;
    border: 1px solid #e1e4e8;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    
    code {
      background-color: transparent;
      border: 0;
      display: inline;
      line-height: inherit;
      margin: 0;
      max-width: auto;
      overflow: visible;
      padding: 0;
      word-wrap: normal;
      color: #24292e;
    }
  }
  
  /* V2版本：优化图片样式 */
  img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 24px 0;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    
    &:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }
  }
  
  /* V2版本：优化链接样式 */
  a {
    color: #0366d6;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: all 0.2s ease;
    
    &:hover {
      color: #0256cc;
      border-bottom-color: #0366d6;
    }
    
    &:visited {
      color: #6f42c1;
    }
  }
  
  /* V2版本：优化分割线样式 */
  hr {
    border: none;
    border-top: 2px solid #eaecef;
    margin: 32px 0;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: -1px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 2px;
      background: #0366d6;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: #999;
  font-size: 16px;
  padding: 60px 20px;
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  .empty-text {
    margin-bottom: 8px;
  }
  
  .empty-hint {
    font-size: 14px;
    color: #ccc;
  }
`;

// V2版本：阅读进度指示器
const ReadingProgress = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: ${props => props.$progress}%;
  height: 3px;
  background: linear-gradient(90deg, #0366d6, #28a745);
  z-index: 1000;
  transition: width 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

// V2版本：内容导航提示
const ContentNavigation = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(8px);
  z-index: 1000;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 1);
    transform: translateY(-2px);
  }
  
  .nav-icon {
    font-size: 16px;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
`;

const ImageViewer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: pointer;
  
  .image-container {
    max-width: 95%;
    max-height: 95%;
    position: relative;
    overflow: auto;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  }
  
  .image {
    display: block;
    transition: transform 0.03s linear;
    cursor: grab;
    user-select: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
    pointer-events: auto;
    will-change: transform;
    
    &:active {
      cursor: grabbing;
    }
  }
  
  .controls {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    gap: 8px;
    z-index: 1001;
  }
  
  .control-button {
    background: rgba(64, 64, 64, 0.9);
    border: none;
    border-radius: 4px;
    padding: 8px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
    
    &:hover {
      background: rgba(64, 64, 64, 1);
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &.zoom-in {
      background: rgba(64, 64, 64, 0.9);
      color: white;
      
      &:hover {
        background: rgba(64, 64, 64, 1);
      }
    }
    
    &.zoom-out {
      background: rgba(64, 64, 64, 0.9);
      color: white;
      
      &:hover {
        background: rgba(64, 64, 64, 1);
      }
    }
    
    &.reset {
      background: rgba(64, 64, 64, 0.9);
      color: white;
      
      &:hover {
        background: rgba(64, 64, 64, 1);
      }
    }
    
    &.close {
      background: rgba(64, 64, 64, 0.9);
      color: white;
      
      &:hover {
        background: rgba(64, 64, 64, 1);
      }
    }
  }
  
  .zoom-info {
    position: absolute;
    bottom: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1001;
  }
`;

/**
 * 富文本渲染组件
 */
export default function RichTextRenderer({ 
  content, 
  title = '文档内容',
  documentId,
  onContentChange,
  isExternalMode = false,
  documentNotFound = false
}) {
  const contentRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showNavigation, setShowNavigation] = useState(false);
  const imageRef = useRef(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const rafIdRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback(() => {
    if (!imageRef.current) return;
    const { x, y } = positionRef.current;
    const s = scaleRef.current;
    imageRef.current.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    imageRef.current.style.transformOrigin = 'center center';
  }, []);

  const scheduleTransform = useCallback(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      applyTransform();
      rafIdRef.current = null;
    });
  }, [applyTransform]);

  // 处理图片点击
  useEffect(() => {
    const handleImageClick = (e) => {
      if (e.target.tagName === 'IMG') {
        setSelectedImage(e.target.src);
        // 重置变换
        positionRef.current = { x: 0, y: 0 };
        scaleRef.current = 1;
        setImageScale(1);
        // 下一帧应用
        requestAnimationFrame(applyTransform);
      }
    };
    
    const container = contentRef.current;
    if (container) {
      container.addEventListener('click', handleImageClick);
      return () => container.removeEventListener('click', handleImageClick);
    }
  }, [content, applyTransform]);

  // V2版本：监听滚动，计算阅读进度和保存进度
  useEffect(() => {
    if (!documentId) return;
    
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / documentHeight) * 100, 100);
        
        setReadingProgress(progress);
        saveReadingProgress(documentId, scrollTop, activeHeadingId);
        
        // 显示/隐藏内容导航
        setShowNavigation(scrollTop > 200);
      }, 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [documentId, activeHeadingId]);

  // 恢复阅读位置
  useEffect(() => {
    if (documentId && content) {
      restoreReadingPosition(documentId);
    }
  }, [documentId, content]);

  // 监听标题变化，更新活跃标题ID
  const handleHeadingChange = useCallback((headingId) => {
    setActiveHeadingId(headingId);
  }, []);

  // 处理内容变化，生成大纲
  useEffect(() => {
    if (onContentChange && content) {
      onContentChange(content);
    }
  }, [content, onContentChange]);
  
  // V2版本：内容导航功能
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  const scrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }, []);

  // 关闭图片查看器
  const closeImageViewer = () => {
    setSelectedImage(null);
    setImageScale(1);
    positionRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    setIsDragging(false);
    cancelAnimationFrame(rafIdRef.current || 0);
    rafIdRef.current = null;
  };

  // 缩放控制函数（同步到ref并应用变换）
  const zoomIn = () => {
    setImageScale(prev => {
      const next = Math.min(prev * 1.2, 5);
      scaleRef.current = next;
      scheduleTransform();
      return next;
    });
  };

  const zoomOut = () => {
    setImageScale(prev => {
      const next = Math.max(prev / 1.2, 0.1);
      scaleRef.current = next;
      scheduleTransform();
      return next;
    });
  };

  const resetZoom = () => {
    positionRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    setImageScale(1);
    scheduleTransform();
  };

  // 当imageScale变化时，同步transform（例如通过键盘/按钮修改时）
  useEffect(() => {
    scaleRef.current = imageScale;
    scheduleTransform();
  }, [imageScale, scheduleTransform]);

  // 拖拽功能（使用RAF降低重排）
  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y
    };
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    positionRef.current = {
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    };
    scheduleTransform();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 键盘快捷键和滚轮缩放
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImage) return;
      
      switch (e.key) {
        case 'Escape':
          closeImageViewer();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    const handleWheel = (e) => {
      if (!selectedImage) return;
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else if (e.deltaY > 0) {
          zoomOut();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [selectedImage]);

  // 鼠标事件监听
  useEffect(() => {
    if (selectedImage) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [selectedImage, isDragging]);

  // 外部模式：如果文档不存在，显示特殊提示
  if (documentNotFound) {
    return (
      <ContentContainer>
        <EmptyState>
          <div className="empty-icon">⚠️</div>
          <div className="empty-text">文档不存在</div>
          <div className="empty-hint">指定的文档ID无法找到，可能已被删除或不存在</div>
        </EmptyState>
      </ContentContainer>
    );
  }
  
  if (!content || !content.trim()) {
    return (
      <>
        {/* 即使没有内容，也显示标题 */}
        {title && title.trim() && (
          <DocumentTitle>{title}</DocumentTitle>
        )}
        <ContentContainer>
          <EmptyState>
            <div className="empty-icon">📄</div>
            <div className="empty-text">暂无内容</div>
            {!isExternalMode && (
              <div className="empty-hint">请选择左侧的文档查看内容</div>
            )}
          </EmptyState>
        </ContentContainer>
      </>
    );
  }
  
  // 安全处理HTML内容并添加标题ID
  const safeContent = sanitizeHTML(content);
  const contentWithIds = addHeadingIds(safeContent);
  
  return (
    <>
      {/* V2版本：阅读进度指示器 */}
      <ReadingProgress $progress={readingProgress} />
      
      {/* 文档标题 */}
      {title && title.trim() && (
        <DocumentTitle>{title}</DocumentTitle>
      )}
      
      <ContentContainer ref={contentRef}>
        <div dangerouslySetInnerHTML={{ __html: contentWithIds }} />
      </ContentContainer>
      
      {/* V2版本：内容导航 */}
      {showNavigation && (
        <ContentNavigation>
          <div className="nav-icon">📖</div>
          <span>阅读进度: {Math.round(readingProgress)}%</span>
          <button 
            onClick={scrollToTop}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '16px',
              marginLeft: '8px'
            }}
            title="回到顶部"
          >
            ⬆️
          </button>
          <button 
            onClick={scrollToBottom}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="到底部"
          >
            ⬇️
          </button>
        </ContentNavigation>
      )}
      
      {selectedImage && (
        <ImageViewer onClick={closeImageViewer}>
          <div className="image-container">
            <img 
              ref={imageRef}
              src={selectedImage} 
              alt="查看图片" 
              className="image"
              draggable={false}
              onMouseDown={handleMouseDown}
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.preventDefault()}
            />
            
            <div className="controls">
              <button 
                className="control-button zoom-in"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomIn();
                }}
                title="放大 (+ 或 Ctrl+滚轮上)"
              >
                +
              </button>
              <button 
                className="control-button zoom-out"
                onClick={(e) => {
                  e.stopPropagation();
                  zoomOut();
                }}
                title="缩小 (- 或 Ctrl+滚轮下)"
              >
                -
              </button>
              <button 
                className="control-button reset"
                onClick={(e) => {
                  e.stopPropagation();
                  resetZoom();
                }}
                title="重置 (0)"
              >
                ↻
              </button>
              <button 
                className="control-button close"
                onClick={(e) => {
                  e.stopPropagation();
                  closeImageViewer();
                }}
                title="关闭 (Esc)"
              >
                ×
              </button>
            </div>
            
            <div className="zoom-info">
              缩放: {Math.round(imageScale * 100)}%
            </div>
          </div>
        </ImageViewer>
      )}
    </>
  );
}
