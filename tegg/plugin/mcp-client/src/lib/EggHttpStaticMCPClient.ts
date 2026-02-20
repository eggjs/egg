import assert from 'node:assert';

import {
  getMCPClientConfig,
  getMCPClientName,
  MCPClientInjectName,
  MCPClientQualifierAttribute,
} from '@eggjs/mcp-client';
import { AccessLevel, Inject, LifecycleInit, MultiInstanceProto, ObjectInitType, MultiInstanceInfo } from '@eggjs/tegg';
import type {
  Logger,
  ModuleConfig,
  MultiInstancePrototypeGetObjectsContext,
  ObjectInfo,
  QualifierInfo,
} from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg/helper';
import { fetch } from 'urllib';

import { EggHttpMCPClient } from './EggHttpMCPClient.ts';
import { QualifierUtil } from './QualifierUtil.ts';

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as ModuleConfig | undefined;
    const moduleName = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    const clients = (config as any)?.mcp?.clients;
    if (!clients) return [];
    return Object.keys(clients)
      .filter((clientName) => {
        return clients[clientName].type === 'http';
      })
      .map((clientName: string) => {
        const properQualifiers: Record<PropertyKey, QualifierInfo[]> = {
          ...QualifierUtil.getModuleConfigQualifier(moduleName),
        };
        return {
          name: MCPClientInjectName,
          qualifiers: [
            {
              attribute: MCPClientQualifierAttribute,
              value: clientName,
            },
          ],
          properQualifiers,
        };
      });
  },
})
export class EggHttpStaticMCPClient extends EggHttpMCPClient {
  constructor(
    @Inject() moduleConfig: ModuleConfig,
    @Inject() logger: Logger,
    @MultiInstanceInfo([MCPClientQualifierAttribute]) objInfo: ObjectInfo,
  ) {
    const configName = getMCPClientName(objInfo);
    const sseClientConfig = getMCPClientConfig(moduleConfig, objInfo);
    const clientName = sseClientConfig.clientName ?? configName;
    const mcpServerSubConfig = {
      ...sseClientConfig,
    };

    assert(mcpServerSubConfig.url, `not found mcpServerSubConfig.url for ${clientName}`);

    super({
      clientName,
      clientVersion: sseClientConfig.version ?? '1.0.0',
      transportType: mcpServerSubConfig.transportType as any,
      url: mcpServerSubConfig.url,
      logger,
      fetch,
    });
  }

  @LifecycleInit()
  async _init(): Promise<void> {
    await super.init();
  }
}
