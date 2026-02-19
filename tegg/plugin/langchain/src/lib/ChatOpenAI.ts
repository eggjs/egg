import { ChatModelInjectName, ChatModelQualifierAttribute } from '@eggjs/langchain-decorator';
import { AccessLevel, Inject, MultiInstanceInfo, MultiInstanceProto, ObjectInitType } from '@eggjs/tegg';
import type { MultiInstancePrototypeGetObjectsContext, ObjectInfo } from '@eggjs/tegg';
import type { ModuleConfig } from '@eggjs/tegg-common-util';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import { ChatOpenAI } from '@langchain/openai';
import { fetch, FetchFactory, Agent } from 'urllib';

import { ChatModelHelper } from './ChatModelHelper.ts';
import { QualifierUtil } from './config/QualifierUtil.ts';
import { getChatModelConfig, getClientNames } from './util.ts';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config: ModuleConfig = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath);
    const moduleName = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    return getClientNames(config, 'ChatModel')
      .filter((name) => {
        return (config as any).ChatModel.clients[name].type === 'openai';
      })
      .map((name) => {
        return {
          name: ChatModelInjectName,
          qualifiers: ChatModelHelper.getChatModelQualifier(name)[ChatModelInjectName],
          properQualifiers: {
            ...QualifierUtil.getModuleConfigQualifier(moduleName),
          },
        };
      });
  },
})
export class ChatOpenAIModel extends ChatOpenAI {
  declare readonly moduleConfig: ModuleConfig;

  constructor(
    @Inject() moduleConfig: ModuleConfig,
    @MultiInstanceInfo([ChatModelQualifierAttribute]) objInfo: ObjectInfo,
  ) {
    const chatConfig = getChatModelConfig(moduleConfig, objInfo) as any;
    chatConfig.configuration = chatConfig.configuration || {};
    // 如果依赖中存在低版本 urllib 会引发问题，因此需要手动设置好
    FetchFactory.setDispatcher(new Agent({ allowH2: true }));
    chatConfig.configuration.fetch = fetch as any;
    super(chatConfig);
  }
}
