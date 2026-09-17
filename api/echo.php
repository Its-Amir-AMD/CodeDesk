<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$maxBytes = 1024 * 1024;
$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > $maxBytes) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'Request body is too large'], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$raw = file_get_contents('php://input') ?: '';
$jsonBody = json_decode($raw, true);

$headers = [];
foreach ($_SERVER as $key => $value) {
    if (str_starts_with($key, 'HTTP_')) {
        $name = str_replace('_', '-', strtolower(substr($key, 5)));
        $headers[$name] = $value;
    }
}

$response = [
    'ok' => true,
    'app' => 'CodeDesk',
    'method' => $method,
    'path' => parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/',
    'query' => $_GET,
    'headers' => $headers,
    'body' => json_last_error() === JSON_ERROR_NONE && $raw !== '' ? $jsonBody : $raw,
    'receivedAt' => gmdate('c'),
];

http_response_code(200);
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
