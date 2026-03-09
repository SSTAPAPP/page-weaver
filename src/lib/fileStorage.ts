/**
 * 文件存储工具 - 支持 Tauri 桌面端本地文件系统存储
 */

// 检测是否在 Tauri 环境中
export const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// 存储路径的 localStorage key
const STORAGE_PATH_KEY = 'barber-shop-storage-path';
const DATA_FILE_NAME = 'barber-shop-data.json';

/**
 * 获取当前存储路径
 */
export const getStoragePath = (): string | null => {
  return localStorage.getItem(STORAGE_PATH_KEY);
};

/**
 * 设置存储路径
 */
export const setStoragePath = (path: string | null): void => {
  if (path) {
    localStorage.setItem(STORAGE_PATH_KEY, path);
  } else {
    localStorage.removeItem(STORAGE_PATH_KEY);
  }
};

/**
 * 选择文件夹
 */
export const selectFolder = async (): Promise<string | null> => {
  if (!isTauri()) {
    console.warn('selectFolder is only available in Tauri environment');
    return null;
  }

  try {
    const { open } = await import('@tauri-apps/api/dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择数据存储文件夹',
    });
    return selected as string | null;
  } catch (error) {
    console.error('Failed to select folder:', error);
    return null;
  }
};

/**
 * 保存数据到文件
 */
export const saveDataToFile = async (data: unknown): Promise<boolean> => {
  const storagePath = getStoragePath();
  if (!storagePath || !isTauri()) {
    return false;
  }

  try {
    const { writeTextFile } = await import('@tauri-apps/api/fs');
    const { join } = await import('@tauri-apps/api/path');
    
    const filePath = await join(storagePath, DATA_FILE_NAME);
    const jsonData = JSON.stringify(data, null, 2);
    
    await writeTextFile(filePath, jsonData);
    return true;
  } catch (error) {
    console.error('Failed to save data to file:', error);
    return false;
  }
};

/**
 * 从文件加载数据
 */
export const loadDataFromFile = async (): Promise<unknown | null> => {
  const storagePath = getStoragePath();
  if (!storagePath || !isTauri()) {
    return null;
  }

  try {
    const { readTextFile, exists } = await import('@tauri-apps/api/fs');
    const { join } = await import('@tauri-apps/api/path');
    
    const filePath = await join(storagePath, DATA_FILE_NAME);
    
    // 检查文件是否存在
    const fileExists = await exists(filePath);
    if (!fileExists) {
      return null;
    }
    
    const jsonData = await readTextFile(filePath);
    return JSON.parse(jsonData);
  } catch (error) {
    console.error('Failed to load data from file:', error);
    return null;
  }
};

/**
 * 检查存储路径是否有效
 */
export const validateStoragePath = async (path: string): Promise<boolean> => {
  if (!isTauri()) {
    return false;
  }

  try {
    const { exists } = await import('@tauri-apps/api/fs');
    return await exists(path);
  } catch (error) {
    console.error('Failed to validate storage path:', error);
    return false;
  }
};

/**
 * 迁移数据从 localStorage 到文件
 */
export const migrateToFileStorage = async (): Promise<boolean> => {
  const storagePath = getStoragePath();
  if (!storagePath || !isTauri()) {
    return false;
  }

  try {
    // 获取 localStorage 中的数据
    const localData = localStorage.getItem('barber-shop-storage');
    if (!localData) {
      return true; // 没有数据需要迁移
    }

    const data = JSON.parse(localData);
    const success = await saveDataToFile(data);
    
    return success;
  } catch (error) {
    console.error('Failed to migrate data:', error);
    return false;
  }
};

/**
 * 从文件存储恢复到 localStorage
 */
export const restoreFromFileStorage = async (): Promise<boolean> => {
  try {
    const data = await loadDataFromFile();
    if (!data) {
      return false;
    }

    localStorage.setItem('barber-shop-storage', JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to restore from file storage:', error);
    return false;
  }
};

/**
 * 获取存储状态描述
 */
export const getStorageStatus = (): { type: 'local' | 'file'; path?: string } => {
  const storagePath = getStoragePath();
  if (storagePath && isTauri()) {
    return { type: 'file', path: storagePath };
  }
  return { type: 'local' };
};
