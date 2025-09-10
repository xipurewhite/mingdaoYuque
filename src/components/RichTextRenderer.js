/**
 * 富文本渲染组件
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import styled from 'styled-components';
import { sanitizeHTML, addHeadingIds } from '../utils/dataUtils';
import { saveReadingProgress, restoreReadingPosition } from '../utils/readingProgress';
import LazyImage from './LazyImage';

const ContentContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  line-height: 1.8;
  color: #333;
  
  /* 富文本内容样式 */
  h1, h2, h3, h4, h5, h6 {
    margin: 24px 0 16px 0;
    font-weight: 600;
    line-height: 1.25;
    color: #24292e;
  }
  
  h1 {
    font-size: 2em;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  h2 {
    font-size: 1.5em;
    border-bottom: 1px solid #eaecef;
    padding-bottom: 0.3em;
  }
  
  h3 {
    font-size: 1.25em;
  }
  
  h4 {
    font-size: 1em;
  }
  
  h5 {
    font-size: 0.875em;
  }
  
  h6 {
    font-size: 0.85em;
    color: #6a737d;
  }
  
  p {
    margin: 16px 0;
  }
  
  blockquote {
    margin: 16px 0;
    padding: 0 16px;
    color: #6a737d;
    border-left: 4px solid #dfe2e5;
  }
  
  ul, ol {
    margin: 16px 0;
    padding-left: 30px;
  }
  
  li {
    margin: 4px 0;
  }
  
  table {
    border-collapse: collapse;
    margin: 16px 0;
    width: 100%;
    border: 1px solid #d0d7de;
  }
  
  th, td {
    border: 1px solid #d0d7de;
    padding: 8px 12px;
    text-align: left;
  }
  
  th {
    background-color: #f6f8fa;
    font-weight: 600;
  }
  
  code {
    background-color: #f6f8fa;
    border-radius: 3px;
    font-size: 85%;
    margin: 0;
    padding: 0.2em 0.4em;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  }
  
  pre {
    background-color: #f6f8fa;
    border-radius: 6px;
    font-size: 85%;
    line-height: 1.45;
    overflow: auto;
    padding: 16px;
    margin: 16px 0;
    
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
    }
  }
  
  img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 16px 0;
    cursor: pointer;
    transition: transform 0.2s;
    
    &:hover {
      transform: scale(1.02);
    }
  }
  
  a {
    color: #0366d6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  hr {
    border: none;
    border-top: 1px solid #eaecef;
    margin: 24px 0;
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
  onContentChange 
}) {
  const contentRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeHeadingId, setActiveHeadingId] = useState('');
  const [imageScale, setImageScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
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

  // 监听滚动，保存阅读进度
  useEffect(() => {
    if (!documentId) return;
    
    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        saveReadingProgress(documentId, scrollTop, activeHeadingId);
      }, 1000);
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

  if (!content || !content.trim()) {
    return (
      <ContentContainer>
        <EmptyState>
          <div className="empty-icon">📄</div>
          <div className="empty-text">暂无内容</div>
          <div className="empty-hint">请选择左侧的文档查看内容</div>
        </EmptyState>
      </ContentContainer>
    );
  }
  
  // 安全处理HTML内容并添加标题ID
  const safeContent = sanitizeHTML(content);
  const contentWithIds = addHeadingIds(safeContent);
  
  return (
    <>
      <ContentContainer ref={contentRef}>
        <div dangerouslySetInnerHTML={{ __html: contentWithIds }} />
      </ContentContainer>
      
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
