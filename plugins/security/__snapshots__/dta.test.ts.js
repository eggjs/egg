exports['test/dta.test.ts should ok when path is normal 1'] = {
  "domainWhiteList": [],
  "protocolWhiteList": [],
  "defaultMiddleware": "dta",
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
    "enable": false,
    "policy": {}
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
