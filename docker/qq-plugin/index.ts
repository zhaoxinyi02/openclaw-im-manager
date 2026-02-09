import type { ClawdbotPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { qqChannel, getClientForAccount } from "./src/channel.js";
import { setQQRuntime } from "./src/runtime.js";
import { getAllTools, toAgentTools } from "./src/tools/index.js";

const plugin = {
  id: "qq",
  name: "QQ (OneBot)",
  description: "QQ channel plugin via OneBot v11",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setQQRuntime(api.runtime);
    api.registerChannel({ plugin: qqChannel });

    // 注册所有 QQ Agent Tools
    const agentTools = toAgentTools(getAllTools(), () => getClientForAccount("default"));
    for (const tool of agentTools) {
      api.registerTool(tool);
    }
    console.log(`[QQ] Registered ${agentTools.length} agent tools`);
  },
};

export default plugin;
