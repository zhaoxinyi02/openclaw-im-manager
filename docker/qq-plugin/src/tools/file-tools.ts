// 文件操作工具 - 上传/下载群文件、获取文件列表、创建文件夹等

import type { ToolDefinition } from "./index.js";

export const fileTools: ToolDefinition[] = [
  {
    name: "qq_upload_group_file",
    description: "上传文件到群。支持本地文件路径或HTTP URL。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        file: { type: "string", description: "文件路径或URL" },
        name: { type: "string", description: "文件名（显示名称）" },
        folder: { type: "string", description: "目标文件夹ID（可选，不填则上传到根目录）" },
      },
      required: ["group_id", "file", "name"],
    },
    execute: async (client, params) => {
      await client.uploadGroupFile(params.group_id, params.file, params.name, params.folder || "");
      return { success: true, message: `已上传文件 ${params.name} 到群 ${params.group_id}` };
    },
  },
  {
    name: "qq_upload_private_file",
    description: "上传文件到私聊。支持本地文件路径或HTTP URL。",
    parameters: {
      type: "object",
      properties: {
        user_id: { type: "number", description: "目标QQ号" },
        file: { type: "string", description: "文件路径或URL" },
        name: { type: "string", description: "文件名（显示名称）" },
      },
      required: ["user_id", "file", "name"],
    },
    execute: async (client, params) => {
      await client.uploadPrivateFile(params.user_id, params.file, params.name);
      return { success: true, message: `已发送文件 ${params.name} 给 ${params.user_id}` };
    },
  },
  {
    name: "qq_get_group_root_files",
    description: "获取群文件根目录的文件和文件夹列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
      },
      required: ["group_id"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("get_group_root_files", { group_id: params.group_id });
      return result.data;
    },
  },
  {
    name: "qq_get_group_files_by_folder",
    description: "获取群文件指定文件夹内的文件列表。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        folder_id: { type: "string", description: "文件夹ID" },
      },
      required: ["group_id", "folder_id"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("get_group_files_by_folder", {
        group_id: params.group_id,
        folder_id: params.folder_id,
      });
      return result.data;
    },
  },
  {
    name: "qq_get_group_file_url",
    description: "获取群文件的下载链接。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        file_id: { type: "string", description: "文件ID" },
        busid: { type: "number", description: "文件类型ID" },
      },
      required: ["group_id", "file_id", "busid"],
    },
    execute: async (client, params) => {
      const result = await client.callApi("get_group_file_url", {
        group_id: params.group_id,
        file_id: params.file_id,
        busid: params.busid,
      });
      return result.data;
    },
  },
  {
    name: "qq_delete_group_file",
    description: "删除群文件。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        file_id: { type: "string", description: "文件ID" },
        busid: { type: "number", description: "文件类型ID" },
      },
      required: ["group_id", "file_id", "busid"],
    },
    execute: async (client, params) => {
      await client.callApi("delete_group_file", {
        group_id: params.group_id,
        file_id: params.file_id,
        busid: params.busid,
      });
      return { success: true, message: "已删除群文件" };
    },
  },
  {
    name: "qq_create_group_folder",
    description: "在群文件中创建文件夹。",
    parameters: {
      type: "object",
      properties: {
        group_id: { type: "number", description: "群号" },
        name: { type: "string", description: "文件夹名称" },
        parent_id: { type: "string", description: "父文件夹ID（根目录为/）" },
      },
      required: ["group_id", "name"],
    },
    execute: async (client, params) => {
      await client.callApi("create_group_file_folder", {
        group_id: params.group_id,
        name: params.name,
        parent_id: params.parent_id || "/",
      });
      return { success: true, message: `已创建文件夹: ${params.name}` };
    },
  },
  {
    name: "qq_get_file_info",
    description: "通过文件ID获取文件详细信息（路径、URL、大小、base64等）。",
    parameters: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "文件ID" },
      },
      required: ["file_id"],
    },
    execute: async (client, params) => {
      const result = await client.getFile(params.file_id);
      return result.data;
    },
  },
  {
    name: "qq_get_image",
    description: "获取图片文件信息（下载路径）。",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", description: "图片文件名（从消息段的file参数获取）" },
      },
      required: ["file"],
    },
    execute: async (client, params) => {
      const result = await client.getImage(params.file);
      return result.data;
    },
  },
  {
    name: "qq_get_record",
    description: "获取语音文件并转换格式。需要安装ffmpeg。",
    parameters: {
      type: "object",
      properties: {
        file: { type: "string", description: "语音文件名（从消息段的file参数获取）" },
        out_format: {
          type: "string",
          enum: ["mp3", "amr", "wma", "m4a", "spx", "ogg", "wav", "flac"],
          description: "输出格式",
        },
      },
      required: ["file", "out_format"],
    },
    execute: async (client, params) => {
      const result = await client.getRecord(params.file, params.out_format);
      return result.data;
    },
  },
];
