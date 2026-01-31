interface CacheItem<T> {
  data: T
  timestamp: number
}

class LocalCache {
  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   */
  set<T>(key: string, data: T): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(item))
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @param maxAge 最大缓存时间（毫秒），默认 1 小时
   * @returns 缓存数据或 null
   */
  get<T>(key: string, maxAge: number = 60 * 60 * 1000): T | null {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    try {
      const item: CacheItem<T> = JSON.parse(stored)
      const age = Date.now() - item.timestamp

      if (age > maxAge) {
        localStorage.removeItem(key)
        return null
      }

      return item.data
    } catch {
      localStorage.removeItem(key)
      return null
    }
  }

  /**
   * 删除指定缓存
   * @param key 缓存键
   */
  remove(key: string): void {
    localStorage.removeItem(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    localStorage.clear()
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param params 参数对象
   * @returns 缓存键字符串
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${params[key]}`)
      .join('|')
    return `${prefix}:${sortedParams}`
  }
}

export const cache = new LocalCache()
