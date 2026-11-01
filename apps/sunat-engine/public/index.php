<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Engine\ErrorDatos;
use Engine\Rutas;

header('Content-Type: application/json; charset=utf-8');
$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($ruta === '/salud') {
    echo json_encode(['ok' => true]);
    exit;
}

$token = getenv('ENGINE_TOKEN') ?: '';
$recibido = $_SERVER['HTTP_X_ENGINE_TOKEN'] ?? '';
if ($token === '' || !hash_equals($token, $recibido)) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

$cuerpo = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($cuerpo)) {
    http_response_code(422);
    echo json_encode(['error' => 'JSON inválido']);
    exit;
}

try {
    echo json_encode((new Rutas())->atender($ruta, $cuerpo), JSON_UNESCAPED_UNICODE);
} catch (ErrorDatos $e) {
    http_response_code(422);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    // Nunca se registran el cuerpo ni los secretos: solo el error.
    error_log(get_class($e) . ': ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del motor: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
