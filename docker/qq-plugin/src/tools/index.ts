// Tool 注册器 - 统一导出所有 Agent 可调用的 QQ 工具
// 提供 ToolDefinition 接口供各 tool 文件使用，以及桥接函数将其转为 OpenClaw AgentTool 格式

import { Type } from "@sinclair/typebox";
import type { OneBotClient } from "../client.js";
import { messageTools } from "./message-tools.js";
import { groupAdminTools } from "./group-admin-tools.js";
import { queryTools } from "./query-tools.js";
import { fileTools } from "./file-tools.js";
import { accountTools } from "./account-tools.js";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;  // JSON Schema
  execute: (client: OneBotClient, params: any) => Promise<any>;
}

export function getAllTools(): ToolDefinition[] {
  return [
    ...messageTools,
    ...groupAdminTools,
    ...queryTools,
    ...fileTools,
    ...accountTools,
  ];
}

// 将 ToolDefinition 转换为 OpenClaw AgentTool 格式
// AgentTool 需要: name, description, parameters (TypeBox schema), execute(toolCallId, args)
export function toAgentTools(tools: ToolDefinition[], getClient: () => OneBotClient | undefined) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    // 使用 Type.Unsafe 包装我们的 JSON Schema，TypeBox 会原样传递给 LLM
    parameters: Type.Unsafe<Record<string, unknown>>(tool.parameters),
    async execute(_toolCallId: string, args: Record<string, unknown>) {
      const client = getClient();
      if (!client) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: "QQ client not connected" }) }],
          details: { error: "QQ client not connected" },
        };
      }
      try {
        const result = await tool.execute(client, args);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          details: result,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: errorMsg }) }],
          details: { error: errorMsg },
        };
      }
    },
  }));
}
