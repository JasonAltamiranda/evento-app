<?php
session_start(); // 🆕 Agregar sesión

require_once 'conexion.php';

header('Content-Type: application/json');

// 🆕 Verificar autenticación
if (!isset($_SESSION['user_id'])) {
    echo json_encode(["success" => false, "message" => "No autenticado"]);
    exit;
}

$user_id = $_SESSION['user_id'];

if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echo json_encode(["success" => false, "message" => "Método no válido"]);
    exit;
}

$title = $conn->real_escape_string(trim($_POST['title']));
$description = $conn->real_escape_string(trim($_POST['description']));
$event_date = $conn->real_escape_string(trim($_POST['date']));
$event_time = isset($_POST['time']) && !empty(trim($_POST['time'])) ? $conn->real_escape_string(trim($_POST['time'])) : '20:00:00';
$location = $conn->real_escape_string(trim($_POST['location']));
$cost = intval($_POST['cost']);
$capacity = intval($_POST['capacity']);
$address = $conn->real_escape_string(trim($_POST['address']));
$imageUrl = isset($_POST['imageUrl']) && !empty($_POST['imageUrl']) ? trim($_POST['imageUrl']) : 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=160&fit=crop';

$event_id = isset($_POST['event_id']) && !empty($_POST['event_id']) ? intval($_POST['event_id']) : null;

if ($event_id) {
    // ===============================================
    // MODO EDICIÓN - UPDATE
    // ===============================================
    
    // 🆕 Verificar permisos: solo el admin puede editar
    $check_sql = "SELECT admin_user_id FROM events WHERE id = ?";
    $check_stmt = $conn->prepare($check_sql);
    $check_stmt->bind_param("i", $event_id);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    $event_data = $result->fetch_assoc();
    $check_stmt->close();
    
    if (!$event_data) {
        echo json_encode(["success" => false, "message" => "Evento no encontrado"]);
        exit;
    }
    
    if ($event_data['admin_user_id'] != $user_id) {
        echo json_encode(["success" => false, "message" => "No tienes permisos para editar este evento"]);
        exit;
    }
    
    $sql = "UPDATE events SET 
            title = ?, 
            description = ?, 
            event_date = ?, 
            event_time = ?,
            location = ?, 
            cost = ?, 
            capacity = ?, 
            address = ?, 
            image_url = ? 
            WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Error preparando UPDATE: " . $conn->error]);
        exit;
    }
    
    $stmt->bind_param("sssssiissi", $title, $description, $event_date, $event_time, $location, $cost, $capacity, $address, $imageUrl, $event_id);
    
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Error ejecutando UPDATE: " . $stmt->error]);
        exit;
    }
    
    echo json_encode(["success" => true, "message" => "Evento actualizado exitosamente"]);
    
} else {
    // ===============================================
    // MODO CREACIÓN - INSERT
    // ===============================================
    
    // 🆕 El creador es automáticamente el administrador
    $sql = "INSERT INTO events (title, description, event_date, event_time, location, cost, capacity, address, image_url, created_by, admin_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Error preparando INSERT: " . $conn->error]);
        exit;
    }
    
    // 11 parámetros (9 anteriores + 2 nuevos)
    $stmt->bind_param("sssssiissii", $title, $description, $event_date, $event_time, $location, $cost, $capacity, $address, $imageUrl, $user_id, $user_id);
    
    if (!$stmt->execute()) {
        echo json_encode(["success" => false, "message" => "Error ejecutando INSERT: " . $stmt->error]);
        exit;
    }
    
    echo json_encode(["success" => true, "message" => "Evento creado exitosamente. Eres el administrador."]);
}

$stmt->close();
$conn->close();
?>