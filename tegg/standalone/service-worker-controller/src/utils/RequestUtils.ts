export class RequestUtils {
  static ContentTypes = {
    json: [
      'application/json',
      'application/json-patch+json',
      'application/vnd.api+json',
      'application/csp-report',
      'application/scim+json',
    ],
    form: ['application/x-www-form-urlencoded'],
    text: ['text/plain'],
  };

  static async getRequestBody(request: Request): Promise<any> {
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

  static matchContentTypes(request: Request, types: string[]): boolean {
    const contentType = request.headers.get('content-type');
    if (!contentType) {
      return false;
    }
    // strip parameters like `; charset=utf-8` and a trailing semicolon
    const value = contentType.split(';')[0].trim().toLowerCase();
    return types.includes(value);
  }
}
