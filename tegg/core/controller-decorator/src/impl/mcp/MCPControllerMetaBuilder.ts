import assert from 'node:assert';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { ControllerType } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ControllerMetaBuilderFactory } from '../../builder/ControllerMetaBuilderFactory.ts';
import { MCPPromptMeta, MCPResourceMeta, MCPToolMeta } from '../../model/index.ts';
import { MCPControllerMeta } from '../../model/MCPControllerMeta.ts';
import { ControllerInfoUtil } from '../../util/ControllerInfoUtil.ts';
import { MCPInfoUtil } from '../../util/MCPInfoUtil.ts';
import { ControllerValidator } from '../../util/validator/ControllerValidator.ts';
import { MCPControllerPromptMetaBuilder } from './MCPControllerPromptMetaBuilder.ts';
import { MCPControllerResourceMetaBuilder } from './MCPControllerResourceMetaBuilder.ts';
import { MCPControllerToolMetaBuilder } from './MCPControllerToolMetaBuilder.ts';

export class MCPControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  private buildResource(): MCPResourceMeta[] {
    const methodNames = MCPInfoUtil.getMCPResource(this.clazz);
    const methods: MCPResourceMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new MCPControllerResourceMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  private buildPrompt(): MCPPromptMeta[] {
    const methodNames = MCPInfoUtil.getMCPPrompt(this.clazz);
    const methods: MCPPromptMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new MCPControllerPromptMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  private buildTool(): MCPToolMeta[] {
    const methodNames = MCPInfoUtil.getMCPTool(this.clazz);
    const methods: MCPToolMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new MCPControllerToolMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  build(): MCPControllerMeta {
    ControllerValidator.validate(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    assert(controllerType === ControllerType.MCP, 'invalidate controller type');
    const mcpMiddlewares = ControllerInfoUtil.getControllerMiddlewares(this.clazz);
    const resources = this.buildResource();
    const prompts = this.buildPrompt();
    const tools = this.buildTool();
    const property = PrototypeUtil.getProperty(this.clazz);
    const protoName = property!.name as string;
    const clazzName = this.clazz.name;
    const controllerName = ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    const name = MCPInfoUtil.getMCPName(this.clazz);
    const version = MCPInfoUtil.getMCPVersion(this.clazz) || '1.0.0';
    const needAcl = ControllerInfoUtil.hasControllerAcl(this.clazz);
    const aclCode = ControllerInfoUtil.getControllerAcl(this.clazz);
    const meta = MCPInfoUtil.getMCPControllerParams(this.clazz);
    return new MCPControllerMeta(
      clazzName,
      protoName,
      controllerName,
      version,
      tools,
      resources,
      prompts,
      mcpMiddlewares,
      name,
      needAcl,
      aclCode,
      meta,
    );
  }

  static create(clazz: EggProtoImplClass): MCPControllerMetaBuilder {
    return new MCPControllerMetaBuilder(clazz);
  }
}

ControllerMetaBuilderFactory.registerControllerMetaBuilder(ControllerType.MCP, MCPControllerMetaBuilder.create);
