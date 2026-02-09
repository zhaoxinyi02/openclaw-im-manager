import { z } from "zod";

const GroupRuleSchema = z.object({
  groupId: z.number().describe("群号"),
  autoApprovePattern: z.string().optional().describe("该群的入群验证信息正则，匹配则自动同意"),
  welcomeMessage: z.string().optional().describe("该群的自定义欢迎语模板"),
  antiRecall: z.boolean().optional().describe("该群是否开启防撤回"),
});

export const QQConfigSchema = z.object({
  wsUrl: z.string().url().describe("The WebSocket URL of the OneBot v11 server (e.g. ws://localhost:3001)"),
  accessToken: z.string().optional().describe("The access token for the OneBot server"),
  admins: z.array(z.number()).optional().describe("List of admin QQ numbers"),

  // 主人QQ号，用于接收审核通知和控制指令
  ownerQQ: z.number().optional().describe("主人QQ号，接收审核通知和控制指令"),

  // 自动审核配置
  autoApprove: z.object({
    friend: z.object({
      enabled: z.boolean().default(false).describe("是否开启好友申请自动审核"),
      pattern: z.string().optional().describe("验证信息正则，匹配则自动同意"),
    }).optional(),
    group: z.object({
      enabled: z.boolean().default(false).describe("是否开启入群申请自动审核"),
      pattern: z.string().optional().describe("默认验证信息正则，匹配则自动同意"),
      rules: z.array(GroupRuleSchema).optional().describe("每个群的单独审核规则"),
    }).optional(),
  }).optional(),

  // 通知开关
  notifications: z.object({
    memberChange: z.boolean().default(true).describe("群成员变动通知"),
    antiRecall: z.boolean().default(true).describe("防撤回（撤回消息通知）"),
    adminChange: z.boolean().default(true).describe("群管理员变动通知"),
    banNotice: z.boolean().default(false).describe("禁言通知"),
    fileUpload: z.boolean().default(false).describe("群文件上传通知"),
    pokeReply: z.boolean().default(true).describe("被戳一戳时自动回复"),
    honorNotice: z.boolean().default(false).describe("群荣誉变更通知"),
  }).optional(),

  // 入群欢迎消息
  welcome: z.object({
    enabled: z.boolean().default(false).describe("是否开启入群欢迎消息"),
    template: z.string().default("欢迎 {nickname} 加入本群！").describe("欢迎语模板，{nickname}会被替换为昵称"),
  }).optional(),
});

export type QQConfig = z.infer<typeof QQConfigSchema>;
