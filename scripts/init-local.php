<?php
declare(strict_types=1);

// Local evaluation account only. The credential and password hash are ignored by Git.
$root = dirname(__DIR__);
$account = $root . '/site/user/accounts/yxyadmin.yaml';
$local = $root . '/.local';
if (!is_dir($local)) { mkdir($local, 0700, true); }
if (!file_exists($account)) {
    $password = 'Yxy!' . bin2hex(random_bytes(8)) . '9a';
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $yaml = "email: admin@example.invalid\nfullname: 屹鑫元本地管理员\ntitle: 本地试用\nstate: enabled\nlanguage: zh-Hans\naccess:\n  site:\n    login: true\n  admin:\n    login: true\n    super: true\n  api:\n    access: true\n    super: true\nhashed_password: '" . $hash . "'\nadmin_next:\n  preferences:\n    adminLanguage: zh-Hans\n    colorMode: light\n    pagesViewMode: tree\n";
    file_put_contents($account, $yaml);
    file_put_contents($local . '/admin-credentials.json', json_encode([
        'url' => 'http://127.0.0.1:8099/admin',
        'username' => 'yxyadmin',
        'password' => $password,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    echo "Created local evaluation account; credentials: .local/admin-credentials.json\n";
} else {
    echo "Existing account preserved.\n";
}
