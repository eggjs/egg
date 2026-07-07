export default (): {
  dnsCache: {
    mode: 'lookup' | 'resolve';
    maxCacheLength: number;
    lookupInterval: number;
    addressRotation: boolean;
    dnsServers: string[] | undefined;
  };
} => {
  const config = {
    /**
     * DNS Cache Configuration
     *
     * The DNS cache plugin provides DNS caching and resolution capabilities to improve performance
     * by caching DNS lookups and supports both dns.lookup and dns.resolve modes with address rotation.
     *
     * @property {'lookup' | 'resolve'} mode - Use dns.lookup or dns.resolve, default is 'resolve'.
     *   - lookup: Use dns.lookup mode (old behavior), respects system DNS configuration and /etc/hosts, but does not support ttl.
     *   - resolve: Use dns.resolve mode (new feature), queries DNS servers directly, ttl supported.
     *     Note: When using resolve mode, /etc/hosts is not respected. You may need to implement custom logic
     *     if you want to include /etc/hosts resolution.
     * @property {Number} maxCacheLength - Maximum number of DNS cache entries, default is 1000.
     *   Uses LRU (Least Recently Used) algorithm to evict old entries when cache is full.
     * @property {Number} lookupInterval - Only works when mode is 'lookup'. DNS cache lookup interval in milliseconds, default is 10000 (10 seconds).
     * @property {Boolean} addressRotation - Enable round-robin address rotation when multiple IP addresses
     *   are returned for a hostname, default is true. Helps distribute load across multiple servers.
     * @property {Array<String>} dnsServers - Custom DNS nameservers for dns.resolve mode, e.g. ['8.8.8.8', '1.1.1.1'].
     *   Only effective when mode is 'resolve'. If not set, uses system default DNS servers.
     */
    dnsCache: {
      mode: 'resolve' as 'lookup' | 'resolve',
      maxCacheLength: 1000,
      lookupInterval: 10000,
      addressRotation: true,
      dnsServers: undefined as string[] | undefined,
    },
  };

  return config;
};
