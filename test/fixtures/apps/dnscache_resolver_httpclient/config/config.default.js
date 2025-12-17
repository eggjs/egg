'use strict';

exports.httpclient = {
  enableDNSCache: true,
  useDNSResolver: true, // Use dns.resolve mode instead of dns.lookup
  dnsAddressRotation: true, // Rotate among multiple A/AAAA records

  httpAgent: {
    keepAlive: false,
    timeout: 30000,
  },
};

exports.keys = 'test key';
