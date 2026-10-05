# Store Listing: CORS Enabler Engine

## Summary and description
The listing text and images live in `chrome-store/store.config.json`, which PR checks validate. Edit them there.

## Category
Developer Tools

## Language
English

## Privacy Policy URL
https://ravitejakamalapuram.github.io/cors-enabler.html

## Single Purpose
CORS Enabler Engine relaxes Cross-Origin Resource Sharing (CORS) constraints for local development environments using Chrome's declarativeNetRequest API, enabling developers to test frontend applications against local APIs and microservices without backend code modifications.

## Permissions Justifications

### storage
Persists user-configured CORS rules, domain presets, and enable/disable toggle state locally on the user device.

### declarativenetrequest
Installs dynamic declarative rules that append required Access-Control-* response headers to cross-origin development requests without exposing network payloads.

### declarativenetrequestfeedback
Enables rule-matching diagnostics and debugging views for developer-configured rules in unpacked builds.

### host_permissions
Modifying cross-origin response headers via declarativeNetRequest requires host access to the target API endpoints that developers test locally.
