/**
 * 文档大纲组件
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { generateOutline } from '../utils/dataUtils';

const OutlineContainer = styled.div`
  padding: 16px;
  height: 100%;
  overflow-y: auto;
`;

const OutlineTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 8px;
`;

const OutlineList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const OutlineItem = styled.li`
  margin: 4px 0;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  
  &.level-1 {
    padding-left: 0;
    font-weight: 500;
  }
  
  &.level-2 {
    padding-left: 16px;
    font-size: 14px;
  }
  
  &.level-3 {
    padding-left: 32px;
    font-size: 13px;
    color: #666;
  }
  
  &.level-4 {
    padding-left: 48px;
    font-size: 12px;
    color: #999;
  }
  
  &.level-5 {
    padding-left: 64px;
    font-size: 12px;
    color: #999;
  }
  
  &.level-6 {
    padding-left: 80px;
    font-size: 12px;
    color: #999;
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
 * 文档大纲组件
 */
export default function DocumentOutline({ content, onHeadingChange }) {
  const [outline, setOutline] = useState([]);
  const [activeId, setActiveId] = useState('');
  
  // 生成大纲
  useEffect(() => {
    if (content) {
      const newOutline = generateOutline(content);
      setOutline(newOutline);
      setActiveId(''); // 重置活跃状态
    } else {
      setOutline([]);
      setActiveId('');
    }
  }, [content]);
  
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
        setActiveId(current.id);
        // 通知父组件当前活跃的标题
        if (onHeadingChange) {
          onHeadingChange(current.id);
        }
      } else {
        // 如果滚动到顶部，高亮第一个标题
        const firstHeadingId = headings[0]?.id || '';
        setActiveId(firstHeadingId);
        if (onHeadingChange) {
          onHeadingChange(firstHeadingId);
        }
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
  }, [outline, onHeadingChange]);
  
  // 跳转到指定标题
  const scrollToHeading = (headingId) => {
    const element = document.getElementById(headingId);
    if (element) {
      // 获取主内容区域的滚动容器
      const mainContent = document.querySelector('main');
      if (mainContent) {
        // 计算元素相对于滚动容器的位置
        const containerRect = mainContent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const scrollTop = mainContent.scrollTop + (elementRect.top - containerRect.top) - 20; // 20px偏移
        
        // 平滑滚动到目标位置
        mainContent.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      } else {
        // 如果没有找到滚动容器，使用默认的scrollIntoView
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }
      setActiveId(headingId);
    } else {
      console.warn(`未找到ID为 ${headingId} 的标题元素`);
    }
  };
  
  if (!content || outline.length === 0) {
    return (
      <OutlineContainer>
        <OutlineTitle>大纲</OutlineTitle>
        <EmptyState>
          <div className="empty-icon">📋</div>
          <div>暂无大纲</div>
        </EmptyState>
      </OutlineContainer>
    );
  }
  
  return (
    <OutlineContainer>
      <OutlineTitle>大纲</OutlineTitle>
      <OutlineList>
        {outline.map(item => (
          <OutlineItem
            key={item.id}
            className={`level-${item.level} ${activeId === item.id ? 'active' : ''}`}
            onClick={() => scrollToHeading(item.id)}
            title={item.text}
          >
            {item.text}
          </OutlineItem>
        ))}
      </OutlineList>
    </OutlineContainer>
  );
}
