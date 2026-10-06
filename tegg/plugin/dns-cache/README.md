# @eggjs/dns-cache-plugin

DNS cache plugin for tegg framework. This plugin provides DNS caching capabilities to improve performance and reduce DNS lookup time.

## Features

- 🚀 DNS lookup caching with LRU algorithm
- ⚖️ Round-robin address rotation for load balancing
- 🔄 Support both `dns.lookup` and `dns.resolve` modes
- ⏱️ Configurable cache TTL
- 🔌 Automatic integration with egg httpclient
- 🎯 Custom DNS nameservers support

## Installation

```bash
npm install @eggjs/dns-cache-plugin --save
```

## Usage

### Enable Plugin

```js
// config/plugin.js
exports.dnsCache = {
  enable: true,
  package: '@eggjs/dns-cache-plugin',
};
```

### Configuration

```js
// config/config.default.js
exports.dnsCache = {
  // DNS resolution mode: 'lookup' or 'resolve' (default: 'resolve')
  // - lookup: Use dns.lookup, respects /etc/hosts, but no TTL support
  // - resolve: Use dns.resolve, queries DNS directly, TTL supported
  mode: 'resolve',

  // Custom DNS nameservers (only for 'resolve' mode)
  dnsServers: ['8.8.8.8', '1.1.1.1'],

  // Maximum cache entries (default: 1000)
  maxCacheLength: 1000,

  // Cache lookup interval in ms (only for 'lookup' mode, default: 10000)
  lookupInterval: 10000,

  // Enable address rotation for multiple IPs (default: true)
  addressRotation: true,
};
```

## DNS Resolution Modes

### Resolve Mode (Recommended)

Uses `dns.resolve4()` to query DNS servers directly. Supports TTL from DNS records.

**Advantages:**

- Respects DNS TTL from authoritative servers
- More control over DNS resolution
- Can specify custom nameservers

**Note:** Does not respect `/etc/hosts` file.

```js
exports.dnsCache = {
  mode: 'resolve',
  dnsServers: ['8.8.8.8', '1.1.1.1'], // Optional custom DNS servers
};
```

### Lookup Mode

Uses `dns.lookup()` which respects system DNS configuration and `/etc/hosts`.

**Advantages:**

- Respects `/etc/hosts` entries
- Uses system DNS configuration

**Disadvantages:**

- Fixed cache interval (no real TTL)
- Less control over resolution

```js
exports.dnsCache = {
  mode: 'lookup',
  lookupInterval: 10000, // Cache refresh interval in ms
};
```

## API

### Access DNS Resolver

```js
// In controller or service
const resolver = this.app.dnsResolver;

// Get cached DNS record
const record = resolver.getCacheRecord('example.com');
console.log(record); // { ip: '93.184.216.34', family: 4, ttl: 60000, ... }

// Clear DNS cache
resolver.resetCache();

// Get the underlying LRU cache
const cache = resolver.getDnsCache();
```

## Address Rotation

When a hostname resolves to multiple IP addresses, the plugin can automatically rotate through them for load balancing:

```js
exports.dnsCache = {
  addressRotation: true, // Enable round-robin rotation
};
```

Each request to the same hostname will use the next IP address in rotation.

## Integration with HttpClient

The plugin automatically integrates with egg's built-in httpclient. All HTTP requests will benefit from DNS caching:

```js
// This request will use cached DNS
await this.app.httpclient.request('https://example.com/api');
```

## Performance Benefits

- **Reduced DNS lookup time**: Cached DNS results eliminate network round trips
- **Lower DNS server load**: Fewer queries to DNS servers
- **Improved request throughput**: Faster connection establishment
- **Load distribution**: Address rotation spreads load across multiple IPs

## License

MIT
