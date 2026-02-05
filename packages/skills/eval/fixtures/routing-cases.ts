import type { RoutingCase } from '../lib/types.ts';

export const routingCases: RoutingCase[] = [
  // === 明确的 controller 意图 ===
  {
    query: '如何创建 HTTP controller？',
    expectedSkill: 'controller',
    reason: '明确提到 controller，属于协议实现',
  },
  {
    query: '如何创建返回 JSON 的 HTTP controller？',
    expectedSkill: 'controller',
    reason: '明确的 HTTP 协议实现',
  },
  {
    query: '如何创建定时任务？',
    expectedSkill: 'controller',
    reason: 'schedule 属于控制器类型',
  },
  {
    query: '如何实现 MCP tool？',
    expectedSkill: 'controller',
    reason: 'MCP 属于控制器类型',
  },
  {
    query: 'How to create an API endpoint that accepts POST requests?',
    expectedSkill: 'controller',
    reason: '英文查询，API endpoint 属于 HTTP controller',
  },

  // === 明确的 core 意图 ===
  {
    query: '@SingletonProto 和 @ContextProto 有什么区别？',
    expectedSkill: 'tegg-core',
    reason: '关于对象生命周期，属于核心概念',
  },
  {
    query: '如何在 EGG 中创建模块？',
    expectedSkill: 'tegg-core',
    reason: '模块架构是核心概念',
  },
  {
    query: '如何注入服务？',
    expectedSkill: 'tegg-core',
    reason: '依赖注入是核心概念',
  },
  {
    query: '如何访问其他模块的对象？',
    expectedSkill: 'tegg-core',
    reason: '跨模块访问（AccessLevel）是核心概念',
  },
  {
    query: 'What is AccessLevel in TEGG?',
    expectedSkill: 'tegg-core',
    reason: '英文查询，AccessLevel 是核心概念',
  },

  // === 模糊意图（按规则应路由到 core） ===
  {
    query: '我需要创建一个可以被 HTTP 控制器使用的服务',
    expectedSkill: 'tegg-core',
    reason: '模糊意图，按规则 1（基础优先）应路由到 core',
  },
  {
    query: '如何实现一个需要跨模块访问的服务？',
    expectedSkill: 'tegg-core',
    reason: '跨模块访问是核心概念，基础优先',
  },
];
