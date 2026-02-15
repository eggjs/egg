import type { QualityCase } from '../lib/types.ts';

export const qualityCases: QualityCase[] = [
  // === controller skill ===
  {
    skill: 'controller',
    query: '如何创建一个 POST 接口接收 JSON body？',
    criteria: [
      '使用 @HTTPController 装饰器',
      '使用 @HTTPMethod 且 method 为 POST',
      '使用 @HTTPBody() 获取请求体',
      '包含完整可运行的代码示例',
    ],
    references: ['references/http-controller.md'],
  },
  {
    skill: 'controller',
    query: '如何从 URL 路径中获取参数？',
    criteria: ['使用 @HTTPParam 装饰器', '展示路径中的参数定义（如 :id）', '包含代码示例'],
    references: ['references/http-controller.md'],
  },
  {
    skill: 'controller',
    query: '如何实现 SSE 流式响应？',
    criteria: [
      '使用 HTTPController',
      '涉及 Readable stream 或 async generator',
      '设置正确的 content-type',
      '包含代码示例',
    ],
    references: ['references/http-controller.md'],
  },

  // === tegg-core skill ===
  {
    skill: 'tegg-core',
    query: '如何让一个服务可以被其他模块访问？',
    criteria: ['提到 AccessLevel.PUBLIC', '使用 @SingletonProto 装饰器', '解释跨模块访问机制', '包含代码示例'],
    references: [],
  },
  {
    skill: 'tegg-core',
    query: 'SingletonProto 和 ContextProto 应该怎么选？',
    criteria: [
      '解释 SingletonProto 是全局单例',
      '解释 ContextProto 是每请求创建',
      '给出选择建议（默认用 Singleton，需要请求隔离用 Context）',
    ],
    references: [],
  },
  {
    skill: 'tegg-core',
    query: '如何在 EGG 中定义一个模块？',
    criteria: ['提到 package.json 中的 eggModule.name 字段', '说明模块名不能包含特殊字符', '包含 package.json 示例'],
    references: [],
  },
];
