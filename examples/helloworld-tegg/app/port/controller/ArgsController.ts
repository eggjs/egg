import { HTTPBody, HTTPController, HTTPMethod, HTTPMethodEnum, HTTPRequest } from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/args/request' })
  async getRequest(@HTTPRequest() request: Request) {
    const headerData = request.headers.get('x-header-key');
    // Get request body arrayBuffer
    const arrayBufferData = await request.arrayBuffer();
    // ...
    return {
      headerData,
      arrayBufferDataString: new TextDecoder().decode(arrayBufferData),
    };
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/args/request2' })
  async getRequest2(@HTTPBody() body: object, @HTTPRequest() request: Request) {
    // Injecting both HTTPBody and Request, reading header, url, etc. through request works normally
    const headerData = request.headers.get('x-header-key');
    // const url = request.url;
    // ❌ Wrong example
    // When the request body has already been injected through HTTPBody
    // Consuming the request body again through request will throw an exception
    const arrayBufferData = await request.arrayBuffer();
    console.log(arrayBufferData, body, new TextDecoder().decode(arrayBufferData));
    // ...
    return {
      headerData,
      body,
      arrayBufferDataString: new TextDecoder().decode(arrayBufferData),
    };
  }
}
