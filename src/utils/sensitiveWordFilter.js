import fs from 'fs';
import path from 'path';
import mint from 'mint-filter';
import logger from "../config/pino.js";

const WORDS_FILE_PATH = path.resolve('constant', 'sensitive-words.txt');

const Mint = mint.default ? mint.default : mint;

let filterInstance = null;

export const loadSensitiveWords = () => {
  try {
    if (!fs.existsSync(WORDS_FILE_PATH)) {
      logger.error(`敏感词文件不存在: ${WORDS_FILE_PATH}`);
      throw new Error('敏感词文件不存在');
    }

    const data = fs.readFileSync(WORDS_FILE_PATH, 'utf-8');
    const words = data.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);

    logger.info(`已加载 ${words.length} 个敏感词`);
    return new Mint(words);
  } catch (error) {
    logger.error('敏感词库初始化失败:', error);
    return new Mint([]);
  }
};

export const getFilter = () => {
  if (!filterInstance) {
    filterInstance = loadSensitiveWords();
  }
  return filterInstance;
};
