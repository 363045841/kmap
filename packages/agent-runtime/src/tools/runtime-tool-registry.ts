// 本文件提供宿主注册与解析 Agent Runtime 工具的统一入口。
import type { RuntimeToolDefinition } from '../pi/types.js'

/** 可在工具面板展示的稳定工具元数据。 */
export interface RuntimeToolMetadata {
  readonly name: string
  readonly label: string
  readonly description: string
}

/** 由宿主上下文创建当前可执行工具的工厂。 */
export interface RuntimeToolRegistration<TContext> extends RuntimeToolMetadata {
  /** 根据当前宿主状态返回工具；当前不可用时返回 undefined。 */
  create(context: TContext): RuntimeToolDefinition | undefined
}

/** 管理一个宿主内的 Agent Runtime 工具注册与解析。 */
export class RuntimeToolRegistry<TContext> {
  private readonly registrations = new Map<string, RuntimeToolRegistration<TContext>>()

  /** 注册一个工具；名称重复代表宿主配置错误。 */
  register(registration: RuntimeToolRegistration<TContext>): void {
    if (this.registrations.has(registration.name)) {
      throw new TypeError(`Runtime tool '${registration.name}' is already registered.`)
    }
    this.registrations.set(registration.name, registration)
  }

  /** 返回全部已注册工具的稳定展示元数据。 */
  list(): readonly RuntimeToolMetadata[] {
    return [...this.registrations.values()].map(({ name, label, description }) => ({
      name,
      label,
      description,
    }))
  }

  /** 根据当前宿主状态解析本次可执行的工具。 */
  resolve(context: TContext): readonly RuntimeToolDefinition[] {
    const tools: RuntimeToolDefinition[] = []
    for (const registration of this.registrations.values()) {
      const tool = registration.create(context)
      if (tool) tools.push(tool)
    }
    return tools
  }
}
