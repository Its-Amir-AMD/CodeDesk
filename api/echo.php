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
    'path' => $_SERVER['REQUEST_URI'] ?? '/',
    'query' => $_GET,
    'headers' => $headers,
    'body' => $jsonBody === null ? $raw : $jsonBody,
    'receivedAt' => gmdate('c'),
];

http_response_code(200);
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
