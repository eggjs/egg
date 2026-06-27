import typeis from 'type-is';

export class RequestUtils {
  static ContentTypes = {
    json: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
      'application/scim+json',
    ],
    form: [ 'application/x-www-form-urlencoded' ],
    text: [ 'text/plain' ],
  };

  static async getRequestBody(request: Request) {
    if (RequestUtils.matchContentTypes(request, RequestUtils.ContentTypes.json)) {
      return await request.json();
    }
    if (RequestUtils.matchContentTypes(request, RequestUtils.ContentTypes.text)) {
      return await request.text();
    }
    if (RequestUtils.matchContentTypes(request, RequestUtils.ContentTypes.form)) {
      return await request.formData();
    }
  }

  static matchContentTypes(request: Request, types: string[]) {
    const contentType = request.headers.get('content-type');
    const contentTypeValue = typeof contentType === 'string'
      // trim extra semicolon
      ? contentType.replace(/;$/, '')
      : contentType;

    return typeis.is(contentTypeValue!, types);
  }
}
