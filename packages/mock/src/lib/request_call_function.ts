import httpClient from 'urllib';

const { port, method, args, property, needResult } = JSON.parse(process.argv[2]);
const url = `http://127.0.0.1:${port}/__egg_mock_call_function`;

httpClient.request(url, {
  method: 'POST',
  data: {
    method,
    args,
    property,
    needResult,
  },
  contentType: 'json',
  dataType: 'json',
}).then(({ data }) => {
  if (!data.success) {
    // console.log('POST %s error, method: %s, args: %j, result data: %j',
    //   url, method, args, data);
    if (data.error) {
      console.error(data.error);
    } else if (data.message) {
      const err = new Error(data.message);
      err.stack = data.stack;
      console.error(err);
    }
    process.exit(2);
  }

  if (data.result) {
    console.log('%j', data.result);
  }
  process.exit(0);
}).catch(err => {
  // ignore ECONNREFUSED error on mockRestore
  if (method === 'mockRestore' && err.message.includes('ECONNREFUSED')) {
    process.exit(0);
  }

  console.error('POST %s error, method: %s, args: %j', url, method, args);
  console.error(err.stack);

  // ignore all error on mockRestore
  if (method === 'mockRestore') {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
