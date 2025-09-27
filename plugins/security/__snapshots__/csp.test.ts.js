exports['test/csp.test.ts should ignore path 1'] = {
  "domainWhiteList": [],
  "protocolWhiteList": [],
  "defaultMiddleware": "csp",
  "csrf": {
    "enable": true,
    "type": "ctoken",
    "ignoreJSON": false,
    "cookieName": "csrfToken",
    "sessionName": "csrfToken",
    "headerName": "x-csrf-token",
    "bodyName": "_csrf",
    "queryName": "_csrf",
    "rotateWhenInvalid": false,
    "useSession": false,
    "supportedRequests": [
      {
        "path": {},
        "methods": [
          "POST",
          "PATCH",
          "DELETE",
          "PUT",
          "CONNECT"
        ]
      }
    ],
    "refererWhiteList": [],
    "cookieOptions": {
      "signed": false,
      "httpOnly": false,
      "overwrite": true
    }
  },
  "xframe": {
    "enable": true,
    "value": "SAMEORIGIN"
  },
  "hsts": {
    "enable": false,
    "maxAge": 31536000,
    "includeSubdomains": false
  },
  "methodnoallow": {
    "enable": true
  },
  "noopen": {
    "enable": true
  },
  "nosniff": {
    "enable": true
  },
  "xssProtection": {
    "enable": true,
    "value": "1; mode=block"
  },
  "csp": {
    "enable": true,
    "policy": {
      "script-src": [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "www.google-analytics.com"
      ],
      "style-src": [
        "'unsafe-inline'",
        "www.google-analytics.com"
      ],
      "img-src": [
        "'self'",
        "data:",
        "www.google-analytics.com"
      ],
      "frame-ancestors": [
        "'self'"
      ],
      "report-uri": "http://pointman.domain.com/csp?app=csp"
    },
    "ignore": [
      "/api/",
      {}
    ]
  },
  "referrerPolicy": {
    "enable": false,
    "value": "no-referrer-when-downgrade"
  },
  "dta": {
    "enable": true
  },
  "ssrf": {}
}
