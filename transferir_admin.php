<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$user_id = $_SESSION['user_id'];
$event_id = isset($_POST['event_id']) ? intval($_POST['event_id']) : 0;
$new_admin_email = isset($_POST['new_admin_email']) ? trim($_POST['new_admin_email']) : '';

if ($event_id === 0 || empty($new_admin_email)) {
    echo json_encode(['success' => false, 'message' => 'Datos incompletos']);
    exit;
}

try {
    // Verificar que el usuario actual sea el admin
    $stmt = $conn->prepare("SELECT admin_user_id, title FROM events WHERE id = ?");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $event = $result->fetch_assoc();
    $stmt->close();
    
    if (!$event) {
        echo json_encode(['success' => false, 'message' => 'Evento no encontrado']);
        exit;
    }
    
    if ($event['admin_user_id'] != $user_id) {
        echo json_encode(['success' => false, 'message' => 'Solo el administrador puede transferir permisos']);
        exit;
    }
    
    // Buscar el nuevo admin por email
    $stmt = $conn->prepare("SELECT id, name FROM users WHERE email = ?");
    $stmt->bind_param("s", $new_admin_email);
    $stmt->execute();
    $result = $stmt->get_result();
    $new_admin = $result->fetch_assoc();
    $stmt->close();
    
    if (!$new_admin) {
        echo json_encode(['success' => false, 'message' => 'Usuario no encontrado con ese email']);
        exit;
    }
    
    // Transferir administración
    $stmt = $conn->prepare("UPDATE events SET admin_user_id = ? WHERE id = ?");
    $stmt->bind_param("ii", $new_admin['id'], $event_id);
    $stmt->execute();
    $stmt->close();
    
    echo json_encode([
        'success' => true, 
        'message' => "Administración transferida exitosamente a {$new_admin['name']}"
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

$conn->close();
?>