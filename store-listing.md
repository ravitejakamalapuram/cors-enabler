# Store Listing: CORS Enabler Engine

## Summary
Relax CORS for local web development using DeclarativeNetRequest. Fine-grained rules, instant presets, and diagnostics.

## Description
CORS Enabler Engine is a professional Manifest V3 Chrome extension designed to solve Cross-Origin Resource Sharing (CORS) blocks during local frontend and backend development.

Built on Chrome's privacy-preserving declarativeNetRequest API, CORS Enabler Engine dynamically appends the necessary Access-Control-* response headers to cross-origin development requests without compromising browser security or leaking request payloads.

KEY FEATURES
• One-Click Enable/Disable: Instantly toggle CORS relaxation on or off with a single click.
• Privacy-Preserving MV3 Architecture: Uses native Chromium declarative rules instead of legacy blocking webRequest scripts. Your network traffic and payloads are never exposed to the extension.
• Fine-Grained Rules: Target specific origins and endpoints, or use global development mode.
• Built-In Presets: Ready-to-use presets for React, Vite, Next.js, Angular, and localhost environments.
• Credentialed CORS Support: Supports specific origin mapping with Access-Control-Allow-Credentials: true.
• Private Network Access: Automatically handles Access-Control-Allow-Private-Network for public-to-localhost communication.
• Live Diagnostics: Test and verify headers with an integrated diagnostics view before running requests.

HOW TO USE
1. Click the CORS Enabler icon in your Chrome toolbar.
2. Click "Enable CORS" to activate development rules.
3. Test your frontend against local microservices or staging endpoints seamlessly.
4. Use the Options dashboard to customize domain rules or activate specialized framework presets.

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
