<?php
session_start();
require_once 'conexion.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $assistance_id = intval($_POST['assistance_id']);
    $user_name = $_SESSION['user_name'] ?? 'Admin';
    
    try {
        // Actualizar estado de asistencia
        $sql = "UPDATE assistances 
                SET state = 'CONFIRMADO', 
                    confirmed_by = ?,
                    confirmed_at = NOW() 
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $user_name, $assistance_id);
        
        if ($stmt->execute()) {
            // También actualizar el participante como confirmado
            $update_participant = "UPDATE participants p 
                                INNER JOIN assistances a ON p.id = a.participant_id 
                                SET p.confirmed = 1 
                                WHERE a.id = ?";
            $stmt2 = $conn->prepare($update_participant);
            $stmt2->bind_param("i", $assistance_id);
            $stmt2->execute();
            $stmt2->close();
            
            echo json_encode(['success' => true, 'message' => 'Asistencia confirmada']);
        } else {
            echo json_encode(['success' => false, 'message' => $stmt->error]);
        }
        
        $stmt->close();
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}

$conn->close();
?>