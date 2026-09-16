<?php
/**
 * CodeDesk API Handler
 * Simple PHP backend for future server-side operations
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['endpoint']) ? $_GET['endpoint'] : '';

// Sample response handler
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// Route handling
switch ($path) {
    case 'health':
        jsonResponse(['status' => 'ok', 'timestamp' => date('c')]);
        break;
    
    case 'projects':
        if ($method === 'GET') {
            // Return projects list
            jsonResponse(['success' => true, 'data' => []]);
        } elseif ($method === 'POST') {
            // Create new project
            $input = json_decode(file_get_contents('php://input'), true);
            jsonResponse(['success' => true, 'message' => 'Project created', 'data' => $input]);
        }
        break;
    
    case 'snippets':
        if ($method === 'GET') {
            jsonResponse(['success' => true, 'data' => []]);
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            jsonResponse(['success' => true, 'message' => 'Snippet created', 'data' => $input]);
        }
        break;
    
    default:
        jsonResponse([
            'success' => true,
            'message' => 'CodeDesk API is running',
            'version' => '1.0.0',
            'endpoints' => ['health', 'projects', 'snippets']
        ], 200);
}
