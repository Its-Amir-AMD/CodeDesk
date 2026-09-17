<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => true,
    'service' => 'CodeDesk',
    'time' => gmdate('c'),
], JSON_UNESCAPED_SLASHES);
