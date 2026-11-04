<?php
session_start();
require_once 'conexion.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $payment_id = intval($_POST['payment_id']);
    $status = $_POST['status'];
    
    try {
        $sql = "UPDATE payments SET status = ?, updated_at = NOW() WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $status, $payment_id);
        
        if ($stmt->execute()) {
            // Si se marca como pagado, actualizar participante
            if ($status === 'confirmed') {
                $update_participant = "UPDATE participants p 
                                    INNER JOIN payments pay ON p.id = pay.participant_id 
                                    SET p.paid = 1 
                                    WHERE pay.id = ?";
                $stmt2 = $conn->prepare($update_participant);
                $stmt2->bind_param("i", $payment_id);
                $stmt2->execute();
                $stmt2->close();
            }
            
            echo json_encode(['success' => true, 'message' => 'Pago actualizado']);
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