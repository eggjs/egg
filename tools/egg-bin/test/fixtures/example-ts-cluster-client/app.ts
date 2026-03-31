import { Application } from 'egg';

export default async (app: Application) => {
  const RegistryClient = (await import('./lib/registry_client.ts')).default;
  const registryClient = (app as any).cluster(RegistryClient).create();
  (app as any).registryClient = registryClient;
  registryClient.subscribe({ dataId: 'demo.DemoService' }, (val: any) => {
    (app as any).val = val;
  });
  await registryClient.ready();
};
