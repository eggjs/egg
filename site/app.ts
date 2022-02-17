// @ts-ignore
import { history, Route } from 'umi';

export function onRouteChange(props: any) {
  const { location }: RouterChangeProps = props;

  let pathname = location.pathname;

  if (pathname.startsWith('/en')) {
    pathname = pathname.replace('/en', '');
    pathname = pathname.replace('.html', '');
    history.push(pathname);
  }

  if (pathname.startsWith('/zh-cn')) {
    pathname = pathname.replace('zh-cn', 'zh-CN');
    pathname = pathname.replace('.html', '');
    history.push(pathname);
  }
}

interface RouterChangeProps {
  location: Location;
  routes: Route[];
  action: string;
}
