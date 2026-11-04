<?php
session_start();
require_once 'conexion.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Obtener datos del formulario
    $name = $conn->real_escape_string(trim($_POST['name']));
    $email = $conn->real_escape_string(trim($_POST['email']));
    $event_id = isset($_POST['event_id']) ? intval($_POST['event_id']) : 0;
    
    // Validaciones básicas
    if (empty($name) || empty($email)) {
        echo json_encode([
            'success' => false,
            'message' => 'Por favor, completa todos los campos obligatorios.'
        ]);
        exit();
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'El formato del correo electrónico no es válido.'
        ]);
        exit();
    }
    
    if ($event_id === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Debes seleccionar un evento válido.'
        ]);
        exit();
    }
    
    // Verificar que el evento existe
    $check_event = $conn->prepare("SELECT id, title FROM events WHERE id = ?");
    $check_event->bind_param("i", $event_id);
    $check_event->execute();
    $result_event = $check_event->get_result();
    
    if ($result_event->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'El evento seleccionado no existe.'
        ]);
        exit();
    }
    
    $event = $result_event->fetch_assoc();
    $check_event->close();
    
    // Manejar imagen de comprobante (opcional)
    $proof_image = null;
    if (isset($_POST['proof_image']) && !empty($_POST['proof_image'])) {
        $proof_image = $_POST['proof_image']; // Base64 o URL
    }
    
    try {
        // Verificar si el participante ya existe para este evento
        $check_participant = $conn->prepare("
            SELECT id FROM participants 
            WHERE email = ? AND event_id = ?
        ");
        $check_participant->bind_param("si", $email, $event_id);
        $check_participant->execute();
        $result_check = $check_participant->get_result();
        
        if ($result_check->num_rows > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Ya estás registrado en este evento con este correo electrónico.'
            ]);
            $check_participant->close();
            exit();
        }
        $check_participant->close();
        
        // Insertar participante
        $sql_participant = "INSERT INTO participants (
                                event_id, 
                                name, 
                                email, 
                                confirmed, 
                                paid,
                                profile_pic,
                                created_at
                            ) VALUES (?, ?, ?, 0, 0, ?, NOW())";
        
        // Generar avatar por defecto
        $default_avatar = 'https://i.pravatar.cc/150?u=' . urlencode($email);
        
        $stmt_participant = $conn->prepare($sql_participant);
        $stmt_participant->bind_param("isss", $event_id, $name, $email, $default_avatar);
        
        if (!$stmt_participant->execute()) {
            throw new Exception('Error al registrar participante: ' . $stmt_participant->error);
        }
        
        $participant_id = $stmt_participant->insert_id;
        $stmt_participant->close();
        
        // Insertar asistencia confirmada
        $sql_assistance = "INSERT INTO assistances (
                                event_id,
                                participant_id,
                                state,
                                confirmed_by,
                                confirmed_at,
                                proof_image
                           ) VALUES (?, ?, 'PENDIENTE', 'Auto-registro', NOW(), ?)";
        
        $stmt_assistance = $conn->prepare($sql_assistance);
        $stmt_assistance->bind_param("iis", $event_id, $participant_id, $proof_image);
        
        if (!$stmt_assistance->execute()) {
            throw new Exception('Error al registrar asistencia: ' . $stmt_assistance->error);
        }
        
        $stmt_assistance->close();
        
        echo json_encode([
            'success' => true,
            'message' => '¡Asistencia registrada exitosamente!',
            'data' => [
                'participant_id' => $participant_id,
                'event_title' => $event['title'],
                'name' => $name,
                'email' => $email
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
    
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método no válido'
    ]);
}

$conn->close();
?>