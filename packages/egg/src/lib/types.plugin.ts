// import plugins types
import '@eggjs/i18n';
import '@eggjs/security';
import '@eggjs/session';
import '@eggjs/logrotator';
import '@eggjs/multipart';
import '@eggjs/view';
// FIXME: can't use reference types here, development plugin depends on watcher plugin
import '@eggjs/watcher';

/// <reference types="@eggjs/schedule" />
/// <reference types="@eggjs/development" />
/// <reference types="@eggjs/static" />
/// <reference types="@eggjs/onerror" />
/// <reference types="@eggjs/jsonp" />
