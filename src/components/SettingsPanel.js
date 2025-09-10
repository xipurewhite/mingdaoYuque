/**
 * 设置面板组件 - 整合了配置功能
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const SettingsContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1001;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 320px;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
`;

const SettingsHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
`;

const SettingsTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    color: #666;
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
`;

const Tab = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: ${props => props.active ? 'white' : 'transparent'};
  color: ${props => props.active ? '#1890ff' : '#666'};
  cursor: pointer;
  font-size: 14px;
  font-weight: ${props => props.active ? '500' : '400'};
  border-bottom: 2px solid ${props => props.active ? '#1890ff' : 'transparent'};
  transition: all 0.2s;
  
  &:hover {
    color: #1890ff;
  }
`;

const SettingsContent = styled.div`
  padding: 16px;
`;

const SettingGroup = styled.div`
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const SettingDescription = styled.div`
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.4;
`;

const SettingControl = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Select = styled.select`
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #1890ff;
  }
`;

const Slider = styled.input`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #d9d9d9;
  outline: none;
  cursor: pointer;
  
  &::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1890ff;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #1890ff;
    cursor: pointer;
    border: none;
  }
`;

const SliderValue = styled.span`
  min-width: 30px;
  text-align: center;
  font-size: 12px;
  color: #666;
`;

const ToggleButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: ${props => props.active ? '#1890ff' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: #1890ff;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const CheckboxLabel = styled.label`
  margin: 0;
  font-size: 14px;
  color: #333;
  cursor: pointer;
`;

const NumberInput = styled.input`
  width: 100%;
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: #1890ff;
  }
`;

const StatsSection = styled.div`
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-top: 16px;
`;

const StatsTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
`;

const StatsItem = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 12px;
  transition: all 0.2s;
  
  &.primary {
    background: #1890ff;
    color: white;
    
    &:hover {
      background: #40a9ff;
    }
  }
  
  &.danger {
    background: #ff4d4f;
    color: white;
    
    &:hover {
      background: #ff7875;
    }
  }
  
  &.default {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #d9d9d9;
    
    &:hover {
      background: #e6f7ff;
      border-color: #1890ff;
    }
  }
`;

const ErrorMessage = styled.div`
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
`;

const HelpText = styled.div`
  color: #666;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
`;

const RequiredIndicator = styled.span`
  color: #ff4d4f;
  margin-left: 4px;
`;

/**
 * 设置面板组件 - 整合了配置功能
 */
export default function SettingsPanel({ 
  isOpen, 
  onClose, 
  onThemeChange, 
  onFontSizeChange,
  onReadingModeChange,
  readingStats,
  // 新增的配置相关props
  currentConfig = {},
  onConfigChange,
  onConfigSave
}) {
  const [activeTab, setActiveTab] = useState('display');
  
  // 显示设置状态
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  const [readingMode, setReadingMode] = useState('normal');
  
  // 配置设置状态
  const [configData, setConfigData] = useState({
    title: '',
    content: '',
    category: '',
    showSearch: true,
    showOutline: true,
    autoSaveProgress: true,
    enableKeyboardShortcuts: true,
    maxRecords: 100
  });
  
  const [errors, setErrors] = useState({});
  
  // 从localStorage加载显示设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('yuque_reader_theme') || 'light';
    const savedFontSize = parseInt(localStorage.getItem('yuque_reader_font_size') || '16');
    const savedReadingMode = localStorage.getItem('yuque_reader_mode') || 'normal';
    
    setTheme(savedTheme);
    setFontSize(savedFontSize);
    setReadingMode(savedReadingMode);
  }, []);
  
  // 初始化配置数据
  useEffect(() => {
    if (currentConfig) {
      setConfigData({
        title: currentConfig.title || '',
        content: currentConfig.content || '',
        category: currentConfig.category || '',
        showSearch: currentConfig.showSearch !== false,
        showOutline: currentConfig.showOutline !== false,
        autoSaveProgress: currentConfig.autoSaveProgress !== false,
        enableKeyboardShortcuts: currentConfig.enableKeyboardShortcuts !== false,
        maxRecords: currentConfig.maxRecords || 100
      });
    }
  }, [currentConfig]);
  
  // 应用主题
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('yuque_reader_theme', theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  }, [theme, onThemeChange]);
  
  // 应用字体大小
  useEffect(() => {
    document.documentElement.style.setProperty('--reader-font-size', `${fontSize}px`);
    localStorage.setItem('yuque_reader_font_size', fontSize.toString());
    if (onFontSizeChange) {
      onFontSizeChange(fontSize);
    }
  }, [fontSize, onFontSizeChange]);
  
  // 应用阅读模式
  useEffect(() => {
    document.documentElement.setAttribute('data-reading-mode', readingMode);
    localStorage.setItem('yuque_reader_mode', readingMode);
    if (onReadingModeChange) {
      onReadingModeChange(readingMode);
    }
  }, [readingMode, onReadingModeChange]);
  
  // 处理配置字段变化
  const handleConfigChange = (field, value) => {
    setConfigData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
    
    // 通知父组件配置变化
    if (onConfigChange) {
      onConfigChange({
        ...configData,
        [field]: value
      });
    }
  };
  
  // 验证配置
  const validateConfig = () => {
    const newErrors = {};
    
    if (configData.maxRecords && (configData.maxRecords < 1 || configData.maxRecords > 1000)) {
      newErrors.maxRecords = '记录数量必须在1-1000之间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // 保存配置
  const handleSaveConfig = () => {
    if (!validateConfig()) {
      return;
    }
    
    if (onConfigSave) {
      onConfigSave(configData);
    }
  };
  
  // 清除所有数据
  const handleClearData = () => {
    if (window.confirm('确定要清除所有阅读进度和统计数据吗？此操作不可恢复。')) {
      localStorage.removeItem('yuque_reader_progress');
      localStorage.removeItem('yuque_reader_time');
      window.location.reload();
    }
  };
  
  
  if (!isOpen) return null;
  
  return (
    <SettingsContainer>
      <SettingsHeader>
        <SettingsTitle>设置</SettingsTitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </SettingsHeader>
      
      <TabContainer>
        <Tab 
          active={activeTab === 'display'} 
          onClick={() => setActiveTab('display')}
        >
          显示设置
        </Tab>
        <Tab 
          active={activeTab === 'config'} 
          onClick={() => setActiveTab('config')}
        >
          功能配置
        </Tab>
        <Tab 
          active={activeTab === 'data'} 
          onClick={() => setActiveTab('data')}
        >
          数据管理
        </Tab>
      </TabContainer>
      
      <SettingsContent>
        {/* 显示设置标签页 */}
        {activeTab === 'display' && (
          <>
            <SettingGroup>
              <SettingLabel>主题</SettingLabel>
              <SettingControl>
                <ToggleButton 
                  active={theme === 'light'} 
                  onClick={() => setTheme('light')}
                >
                  浅色
                </ToggleButton>
                <ToggleButton 
                  active={theme === 'dark'} 
                  onClick={() => setTheme('dark')}
                >
                  深色
                </ToggleButton>
              </SettingControl>
            </SettingGroup>
            
            <SettingGroup>
              <SettingLabel>字体大小</SettingLabel>
              <SettingControl>
                <Slider
                  type="range"
                  min="12"
                  max="24"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                />
                <SliderValue>{fontSize}px</SliderValue>
              </SettingControl>
            </SettingGroup>
            
            <SettingGroup>
              <SettingLabel>阅读模式</SettingLabel>
              <SettingControl>
                <Select 
                  value={readingMode} 
                  onChange={(e) => setReadingMode(e.target.value)}
                >
                  <option value="normal">普通模式</option>
                  <option value="focus">专注模式</option>
                  <option value="night">夜间模式</option>
                </Select>
              </SettingControl>
            </SettingGroup>
            
            {readingStats && (
              <StatsSection>
                <StatsTitle>阅读统计</StatsTitle>
                <StatsItem>
                  <span>已阅读文档</span>
                  <span>{readingStats.totalDocuments} 篇</span>
                </StatsItem>
                <StatsItem>
                  <span>总阅读时间</span>
                  <span>{readingStats.formattedTotalTime}</span>
                </StatsItem>
                <StatsItem>
                  <span>平均阅读时间</span>
                  <span>{readingStats.formattedAverageTime}</span>
                </StatsItem>
              </StatsSection>
            )}
          </>
        )}
        
        {/* 功能配置标签页 */}
        {activeTab === 'config' && (
          <>
            <SettingGroup>
              <SettingLabel>功能选项</SettingLabel>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="showSearch"
                  checked={configData.showSearch}
                  onChange={(e) => handleConfigChange('showSearch', e.target.checked)}
                />
                <CheckboxLabel htmlFor="showSearch">
                  显示搜索功能
                </CheckboxLabel>
              </CheckboxGroup>
              <HelpText>启用后将在左侧导航栏显示搜索框</HelpText>
            </SettingGroup>
            
            <SettingGroup>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="showOutline"
                  checked={configData.showOutline}
                  onChange={(e) => handleConfigChange('showOutline', e.target.checked)}
                />
                <CheckboxLabel htmlFor="showOutline">
                  显示文档大纲
                </CheckboxLabel>
              </CheckboxGroup>
              <HelpText>启用后将在右侧显示文档大纲导航</HelpText>
            </SettingGroup>
            
            <SettingGroup>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="autoSaveProgress"
                  checked={configData.autoSaveProgress}
                  onChange={(e) => handleConfigChange('autoSaveProgress', e.target.checked)}
                />
                <CheckboxLabel htmlFor="autoSaveProgress">
                  自动保存阅读进度
                </CheckboxLabel>
              </CheckboxGroup>
              <HelpText>启用后将自动保存用户的阅读位置</HelpText>
            </SettingGroup>
            
            <SettingGroup>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="enableKeyboardShortcuts"
                  checked={configData.enableKeyboardShortcuts}
                  onChange={(e) => handleConfigChange('enableKeyboardShortcuts', e.target.checked)}
                />
                <CheckboxLabel htmlFor="enableKeyboardShortcuts">
                  启用键盘快捷键
                </CheckboxLabel>
              </CheckboxGroup>
              <HelpText>启用后将支持键盘快捷键操作</HelpText>
            </SettingGroup>
            
            <ActionButton 
              className="primary" 
              onClick={handleSaveConfig}
            >
              保存配置
            </ActionButton>
          </>
        )}
        
        {/* 数据管理标签页 */}
        {activeTab === 'data' && (
          <>
            <SettingGroup>
              <SettingLabel>最大记录数</SettingLabel>
              <SettingDescription>
                设置一次加载的最大文档数量
              </SettingDescription>
              <NumberInput
                type="number"
                min="1"
                max="1000"
                value={configData.maxRecords}
                onChange={(e) => handleConfigChange('maxRecords', parseInt(e.target.value))}
              />
              {errors.maxRecords && <ErrorMessage>{errors.maxRecords}</ErrorMessage>}
              <HelpText>建议设置为100-500之间，过大会影响加载性能</HelpText>
            </SettingGroup>
            
            <ActionButton 
              className="danger" 
              onClick={handleClearData}
            >
              清除所有数据
            </ActionButton>
          </>
        )}
      </SettingsContent>
    </SettingsContainer>
  );
}