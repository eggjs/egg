exports['test/csrf.test.ts should update form with csrf token 1'] = {
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
  },
  "ignore": [
    {},
    null
  ]
}

exports['test/csrf.test.ts apps/csrf-supported-requests-default-config should works without error because csrf = false override default config 1'] = {
  "enable": false,
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
}
