import EggError from '../base_error';
import HttpErrorOptions from './http_error_options';
import HttpHeader from './http_header';

class HttpError extends EggError<HttpErrorOptions> {
  public status: number;
  public headers: HttpHeader;
  protected options: HttpErrorOptions;

  constructor(options?: HttpErrorOptions) {
    super(options);

    this.headers = {};
    this.status = this.options.status;
    this.headers = this.options.headers || {};
  }
}

export default HttpError;
