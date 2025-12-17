'use strict';

exports.httpclient = {
  enableDNSCache: true,
  useDNSResolver: true, // Use dns.resolve mode instead of dns.lookup
  dnsAddressRotation: true, // Rotate among multiple A/AAAA records
  useHttpClientNext: true,
  httpAgent: {
    keepAlive: false,
    timeout: 30000,
  },
  request: {
    timeout: 5000,
    reset: true, // disable agent keepAlive
  },
};

exports.keys = 'test key';
