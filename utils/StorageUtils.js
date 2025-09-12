import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 存储工具类
 * 提供AsyncStorage相关的操作方法
 */
class StorageUtils {
  // miniApp名称变量
  static miniAppName = '2048_';

  /**
   * 获取用户数据
   * @returns {Promise<Object|null>} 用户数据对象，如果不存在则返回null
   */
  static async getUserData() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('本地获取用户数据失败:', error);
      return null;
    }
  }

  /**
   * 保存用户数据
   * @param {Object} userData - 用户数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  static async saveUserData(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('保存用户数据失败:', error);
      return false;
    }
  }

  /**
   * 获取info信息
   * @returns {Promise<any|null>} info信息对象，如果不存在则返回null
   */
  static async getData() {
    try {
      const infoData = await AsyncStorage.getItem(`${this.miniAppName}info`);
      return infoData ? JSON.parse(infoData) : null;
    } catch (error) {
      console.error('获取info信息失败:', error);
      return null;
    }
  }

  /**
   * 设置info信息
   * @param {any} newData - 新的info数据对象
   * @returns {Promise<boolean>} 设置是否成功
   */
  static async setData(newData) {
    try {
      // 先读取老数据
      const oldData = await this.getData();
      
      // 如果老数据存在，使用解构方式合并数据，新数据会覆盖老数据中的相同字段
      const mergedData = oldData ? { ...oldData, ...newData } : newData;
      
      // 保存合并后的数据
      await AsyncStorage.setItem(`${this.miniAppName}info`, JSON.stringify(mergedData));
      return true;
    } catch (error) {
      console.error('设置info信息失败:', error);
      return false;
    }
  }
}

export default StorageUtils;