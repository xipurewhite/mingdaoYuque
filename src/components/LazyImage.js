/**
 * 懒加载图片组件
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: ${props => props.height || 'auto'};
  background: #f5f5f5;
  border-radius: 4px;
  overflow: hidden;
`;

const Placeholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 14px;
  transition: opacity 0.3s;
  
  &.loaded {
    opacity: 0;
    pointer-events: none;
  }
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s;
  opacity: ${props => props.loaded ? 1 : 0};
  
  &.error {
    opacity: 0;
  }
`;

const ErrorPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 12px;
  
  .error-icon {
    font-size: 24px;
    margin-bottom: 8px;
  }
`;

/**
 * 懒加载图片组件
 */
export default function LazyImage({ 
  src, 
  alt, 
  height,
  placeholder = "加载中...",
  errorText = "图片加载失败",
  onClick,
  ...props 
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);
  
  // 检查元素是否在视口中
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      }
    );
    
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);
  
  // 图片加载成功
  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };
  
  // 图片加载失败
  const handleError = () => {
    setError(true);
    setLoaded(false);
  };
  
  return (
    <ImageContainer 
      ref={containerRef}
      height={height}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {!error && (
        <>
          <Placeholder className={loaded ? 'loaded' : ''}>
            {placeholder}
          </Placeholder>
          
          {inView && (
            <Image
              ref={imgRef}
              src={src}
              alt={alt}
              loaded={loaded}
              onLoad={handleLoad}
              onError={handleError}
              className={error ? 'error' : ''}
              {...props}
            />
          )}
        </>
      )}
      
      {error && (
        <ErrorPlaceholder>
          <div className="error-icon">🖼️</div>
          <div>{errorText}</div>
        </ErrorPlaceholder>
      )}
    </ImageContainer>
  );
}
