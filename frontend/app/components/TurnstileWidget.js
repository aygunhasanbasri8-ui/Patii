import { Platform } from 'react-native';

const SITE_KEY = '1x00000000000000000000AA';

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>body{margin:0;padding:4px;background:transparent;}</style>
</head>
<body>
  <div class="cf-turnstile"
       data-sitekey="${SITE_KEY}"
       data-callback="onSuccess"
       data-error-callback="onError">
  </div>
  <script>
    function onSuccess(token) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token: token }));
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
    }
  </script>
</body>
</html>`;

let WebView = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (_e) {}
}

export default function TurnstileWidget({ onToken, onError }) {
  if (Platform.OS === 'web' || !WebView) {
    return null;
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html: HTML }}
      style={{ height: 68, backgroundColor: 'transparent' }}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'token') onToken?.(data.token);
          else if (data.type === 'error') onError?.();
        } catch (_e) {}
      }}
      scrollEnabled={false}
      javaScriptEnabled
    />
  );
}
