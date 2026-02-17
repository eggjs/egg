# @eggjs/co-busboy

Multipart form data handling with async/await support for Egg.js and Koa.

A TypeScript port of [co-busboy](https://github.com/cojs/busboy), providing a promise-based wrapper around [busboy](https://github.com/mscdex/busboy) for parsing multipart/form-data.

## Installation

```bash
npm install @eggjs/co-busboy
```

## Usage

```typescript
import { parse } from '@eggjs/co-busboy';

// In a Koa middleware
app.use(async (ctx) => {
  const parts = parse(ctx, { autoFields: true });
  let part;

  while ((part = await parts())) {
    if (Array.isArray(part)) {
      // It's a field: [name, value, nameTruncated, valueTruncated]
      console.log('Field:', part[0], '=', part[1]);
    } else {
      // It's a file stream with additional properties
      console.log('File:', part.filename, part.mimeType);
      // Consume the stream
      part.pipe(fs.createWriteStream(`./uploads/${part.filename}`));
    }
  }

  // Access auto-collected fields (when autoFields: true)
  console.log(parts.field);  // { fieldName: value }
  console.log(parts.fields); // [[name, value, nameTrunc, valTrunc], ...]
});
```

## API

### `parse(request, options?)`

Parse multipart form data from a request.

#### Parameters

- `request` - Node.js IncomingMessage or Koa context
- `options` - Optional configuration object

#### Options

All standard [busboy options](https://github.com/mscdex/busboy#api) are supported, plus:

- `autoFields` (boolean, default: `false`) - When true, automatically collects all form fields. Fields will be available via `parts.field` (object lookup) and `parts.fields` (array lookup). Only file streams will be returned in the iteration.

- `checkField` (function) - Hook to validate form fields. Return an Error to reject the field.

  ```typescript
  checkField: (name, value, fieldnameTruncated, valueTruncated) => {
    if (name === '_csrf' && !isValidToken(value)) {
      return new Error('Invalid CSRF token');
    }
  }
  ```

- `checkFile` (function) - Hook to validate file uploads. Return an Error to reject the file.
  ```typescript
  checkFile: (fieldname, stream, filename, encoding, mimetype) => {
    if (!filename.endsWith('.jpg')) {
      const err = new Error('Only JPG files allowed');
      err.status = 400;
      return err;
    }
  }
  ```

#### Return Value

Returns a `Parts` function that yields parts when called:

```typescript
interface Parts {
  (): Promise<Part | null>;
  field: Record<string, string | string[]>;
  fields: FieldTuple[];
}
```

- Call `parts()` repeatedly to get each part
- Returns `null` when parsing is complete
- When `autoFields` is true, fields are collected in `parts.field` and `parts.fields`

#### Part Types

**Field** - An array with 4 elements:

```typescript
type FieldTuple = [
  string,  // name
  string,  // value
  boolean, // fieldnameTruncated
  boolean  // valueTruncated
];
```

**File** - A Readable stream with additional properties:

```typescript
interface FileStream extends Readable {
  fieldname: string;
  filename: string;
  encoding: string;
  transferEncoding: string;
  mime: string;
  mimeType: string;
}
```

## Error Handling

Limit errors include status and code properties:

```typescript
try {
  while ((part = await parts())) {
    // process part
  }
} catch (err) {
  console.log(err.status); // 413
  console.log(err.code);   // 'Request_files_limit', 'Request_fields_limit', or 'Request_parts_limit'
}
```

## Compression Support

Gzip and deflate compressed requests are automatically decompressed via the `inflation` library.

## License

[MIT](LICENSE)
