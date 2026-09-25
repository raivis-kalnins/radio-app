<?php
declare(strict_types=1);
require __DIR__ . '/includes/bootstrap.php';
go_security_headers();
go_start_session();
go_bootstrap_storage();
header('Cache-Control: no-cache, must-revalidate');
$appName = htmlspecialchars((string)(go_config()['app']['name'] ?? 'go-app'), ENT_QUOTES, 'UTF-8');
$queryString = (string)($_SERVER['QUERY_STRING'] ?? '');
$isAdminPanel = $queryString === '=admin' || (string)($_GET['admin'] ?? '') === '1' || (string)($_GET['view'] ?? '') === 'admin';
$publicSettings = go_public_settings();
$captchaEnabled = (bool)($publicSettings['hcaptcha']['enabled'] ?? false);
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5, user-scalable=yes">
    <meta name="theme-color" content="#081115">
    <meta name="color-scheme" content="dark light">
    <meta name="screen-orientation" content="auto">
    <script src="assets/theme-init.js?v=<?= rawurlencode(GO_APP_VERSION) ?>"></script>
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="<?= $appName ?>">
    <meta name="application-name" content="<?= $appName ?>">
    <meta name="description" content="Radio 63: Latvian, British, Ukrainian, American, Canadian and Australian internet radio with favourites and background media controls.">
    <link rel="manifest" href="manifest.webmanifest?v=<?= rawurlencode(GO_APP_VERSION) ?>">
    <link rel="icon" href="assets/icon.svg" type="image/svg+xml">
    <link rel="icon" href="assets/icons/icon-192.png" type="image/png" sizes="192x192">
    <link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png" sizes="180x180">
    <link rel="stylesheet" href="assets/<?= $isAdminPanel ? 'admin.css' : 'app.css' ?>?v=<?= rawurlencode(GO_APP_VERSION) ?>">
    <title><?= $isAdminPanel ? 'Radio 63 Admin' : 'Radio 63' ?></title>
</head>
<body class="<?= $isAdminPanel ? 'admin-body' : 'app-body' ?>">
    <noscript>This application requires JavaScript.</noscript>
<?php if ($isAdminPanel): ?>
    <div id="go-admin-root"
         data-version="<?= htmlspecialchars(GO_APP_VERSION, ENT_QUOTES, 'UTF-8') ?>"
         data-captcha-enabled="<?= $captchaEnabled ? '1' : '0' ?>"
         data-captcha-site-key="<?= htmlspecialchars((string)($publicSettings['hcaptcha']['siteKey'] ?? ''), ENT_QUOTES, 'UTF-8') ?>"></div>
<?php if ($captchaEnabled): ?>
    <script src="https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off" async defer></script>
<?php endif; ?>
    <script src="assets/compat.js?v=<?= rawurlencode(GO_APP_VERSION) ?>" defer></script>
    <script src="assets/admin.js?v=<?= rawurlencode(GO_APP_VERSION) ?>" defer></script>
<?php else: ?>
    <div id="go-app-root" data-version="<?= htmlspecialchars(GO_APP_VERSION, ENT_QUOTES, 'UTF-8') ?>"></div>
    <script src="assets/compat.js?v=<?= rawurlencode(GO_APP_VERSION) ?>" defer></script>
    <script src="assets/vendor/react.production.min.js?v=16.0.0" defer></script>
    <script src="assets/vendor/react-dom.production.min.js?v=16.0.1" defer></script>
<?php if ($captchaEnabled): ?>
    <script src="https://js.hcaptcha.com/1/api.js?render=explicit&recaptchacompat=off" async defer></script>
<?php endif; ?>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.6.16/dist/hls.min.js" defer></script>
    <script src="assets/app.js?v=<?= rawurlencode(GO_APP_VERSION) ?>" defer></script>
<?php endif; ?>
</body>
</html>
