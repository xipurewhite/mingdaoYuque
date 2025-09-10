/**
 * 搜索组件
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const SearchContainer = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.3s;
  
  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
  
  &::placeholder {
    color: #bfbfbf;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #bfbfbf;
  font-size: 14px;
  pointer-events: none;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #bfbfbf;
  cursor: pointer;
  padding: 4px;
  border-radius: 2px;
  
  &:hover {
    color: #666;
    background: #f5f5f5;
  }
`;

const SearchResults = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d9d9d9;
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const SearchResultItem = styled.div`
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  &.active {
    background-color: #e6f7ff;
  }
`;

const ResultTitle = styled.div`
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  font-size: 14px;
`;

const ResultContent = styled.div`
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  max-height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const HighlightText = styled.span`
  background-color: #fff2e8;
  color: #d46b08;
  padding: 0 2px;
  border-radius: 2px;
`;

const NoResults = styled.div`
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
`;

const SearchStats = styled.div`
  padding: 8px 12px;
  background: #f5f5f5;
  border-top: 1px solid #e8e8e8;
  font-size: 12px;
  color: #666;
  text-align: center;
`;

/**
 * 高亮搜索关键词
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @returns {React.ReactNode} 高亮后的文本
 */
function highlightText(text, keyword) {
  if (!keyword || !text) return text;
  
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (regex.test(part)) {
      return <HighlightText key={index}>{part}</HighlightText>;
    }
    return part;
  });
}

/**
 * 搜索组件
 */
export default function SearchBar({ 
  documents, 
  onSearch, 
  onSelectDocument,
  placeholder = "搜索文档..." 
}) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  
  // 搜索逻辑
  useEffect(() => {
    if (!searchKeyword.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    
    setIsSearching(true);
    
    // 防抖搜索
    const timeoutId = setTimeout(() => {
      const results = searchDocuments(documents, searchKeyword);
      setSearchResults(results);
      setShowResults(true);
      setActiveIndex(-1);
      setIsSearching(false);
      
      // 通知父组件搜索结果
      if (onSearch) {
        onSearch(results);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchKeyword, documents, onSearch]);
  
  // 处理输入变化
  const handleInputChange = (e) => {
    setSearchKeyword(e.target.value);
  };
  
  // 清除搜索
  const handleClear = () => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowResults(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };
  
  // 处理键盘事件
  const handleKeyDown = (e) => {
    if (!showResults || searchResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < searchResults.length) {
          handleSelectDocument(searchResults[activeIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  
  // 选择文档
  const handleSelectDocument = (document) => {
    setShowResults(false);
    setActiveIndex(-1);
    if (onSelectDocument) {
      onSelectDocument(document);
    }
  };
  
  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && 
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowResults(false);
        setActiveIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 搜索文档函数
  function searchDocuments(documents, keyword) {
    if (!keyword || !documents) return [];
    
    const lowerKeyword = keyword.toLowerCase();
    
    return documents.filter(doc => {
      // 搜索标题
      if (doc.title && doc.title.toLowerCase().includes(lowerKeyword)) {
        return true;
      }
      
      // 搜索内容
      if (doc.content && doc.content.toLowerCase().includes(lowerKeyword)) {
        return true;
      }
      
      return false;
    }).map(doc => ({
      ...doc,
      // 添加匹配的文本片段用于显示
      matchedText: getMatchedText(doc, keyword)
    }));
  }
  
  // 获取匹配的文本片段
  function getMatchedText(doc, keyword) {
    const lowerKeyword = keyword.toLowerCase();
    
    // 优先显示标题匹配
    if (doc.title && doc.title.toLowerCase().includes(lowerKeyword)) {
      return doc.title;
    }
    
    // 显示内容匹配的片段
    if (doc.content) {
      const content = doc.content.replace(/<[^>]*>/g, ''); // 移除HTML标签
      const index = content.toLowerCase().indexOf(lowerKeyword);
      if (index !== -1) {
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + keyword.length + 50);
        return '...' + content.substring(start, end) + '...';
      }
    }
    
    return doc.title || '无标题';
  }
  
  return (
    <SearchContainer>
      <SearchIcon>🔍</SearchIcon>
      <SearchInput
        ref={inputRef}
        type="text"
        value={searchKeyword}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => searchResults.length > 0 && setShowResults(true)}
        placeholder={placeholder}
      />
      {searchKeyword && (
        <ClearButton onClick={handleClear}>
          ✕
        </ClearButton>
      )}
      
      {showResults && (
        <SearchResults ref={resultsRef}>
          {searchResults.length > 0 ? (
            <>
              {searchResults.map((result, index) => (
                <SearchResultItem
                  key={result.id}
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => handleSelectDocument(result)}
                >
                  <ResultTitle>
                    {highlightText(result.title, searchKeyword)}
                  </ResultTitle>
                  <ResultContent>
                    {highlightText(result.matchedText, searchKeyword)}
                  </ResultContent>
                </SearchResultItem>
              ))}
              <SearchStats>
                找到 {searchResults.length} 个结果
              </SearchStats>
            </>
          ) : (
            <NoResults>
              {isSearching ? '搜索中...' : '未找到相关文档'}
            </NoResults>
          )}
        </SearchResults>
      )}
    </SearchContainer>
  );
}
