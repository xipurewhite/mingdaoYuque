/**
 * 批量替换console调用为logger的脚本
 * 使用方法: node scripts/replace-console.js
 */

const fs = require('fs');
const path = require('path');

// 要处理的目录
const srcDir = path.join(__dirname, '../src');

// 需要处理的文件扩展名
const fileExtensions = ['.js', '.jsx', '.ts', '.tsx'];

// console方法到logger方法的映射
const consoleToLogger = {
  'console.log': 'logger.debug',
  'console.info': 'logger.info',
  'console.warn': 'logger.warn',
  'console.error': 'logger.error',
  'console.group': 'logger.group',
  'console.groupEnd': 'logger.groupEnd',
  'console.table': 'logger.table'
};

/**
 * 递归获取所有需要处理的文件
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // 跳过node_modules
      if (file !== 'node_modules') {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (fileExtensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * 替换文件中的console调用
 */
function replaceConsoleInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let hasLoggerImport = content.includes("import") && content.includes("logger");

  // 检查是否需要添加logger导入
  const needsLoggerImport = Object.keys(consoleToLogger).some(
    consoleMethod => content.includes(consoleMethod)
  );

  if (needsLoggerImport && !hasLoggerImport) {
    // 计算相对路径
    const loggerPath = path.join(srcDir, 'utils', 'logger.js');
    const fileDir = path.dirname(filePath);
    let relativePath = path.relative(fileDir, loggerPath)
      .replace(/\\/g, '/')
      .replace(/\.js$/, '');
    
    // 确保路径以 ./ 或 ../ 开头
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    
    // 查找最后一个import语句的位置
    const importRegex = /^import\s+.*$/gm;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      // 找到最后一个import语句的结束位置（包括换行）
      let lastImportEnd = 0;
      imports.forEach(imp => {
        const index = content.indexOf(imp, lastImportEnd);
        if (index !== -1) {
          // 找到import语句结束的位置（包括后面的换行）
          const endIndex = content.indexOf('\n', index + imp.length);
          lastImportEnd = endIndex !== -1 ? endIndex + 1 : index + imp.length;
        }
      });
      
      // 在最后一个import后添加logger导入
      const loggerImport = `import logger from '${relativePath}';\n`;
      content = content.slice(0, lastImportEnd) + loggerImport + content.slice(lastImportEnd);
      modified = true;
    } else {
      // 如果没有import语句，在文件开头添加
      content = `import logger from '${relativePath}';\n` + content;
      modified = true;
    }
  }

  // 替换console调用
  Object.entries(consoleToLogger).forEach(([consoleMethod, loggerMethod]) => {
    // 匹配 console.method( 的模式，避免匹配到 console.method.call 等情况
    const regex = new RegExp(`\\b${consoleMethod.replace('.', '\\.')}\\s*\\(`, 'g');
    if (content.match(regex)) {
      content = content.replace(regex, `${loggerMethod}(`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

/**
 * 主函数
 */
function main() {
  console.log('开始替换console调用...\n');

  const files = getAllFiles(srcDir);
  let modifiedCount = 0;

  files.forEach(file => {
    try {
      if (replaceConsoleInFile(file)) {
        console.log(`✓ 已处理: ${path.relative(srcDir, file)}`);
        modifiedCount++;
      }
    } catch (error) {
      console.error(`✗ 处理失败: ${path.relative(srcDir, file)}`, error.message);
    }
  });

  console.log(`\n完成！共处理 ${modifiedCount} 个文件。`);
  console.log('\n注意：请检查导入路径是否正确，特别是子目录中的文件。');
  console.log('如果导入路径不正确，请手动调整。');
}

// 运行脚本
main();
