<?php
session_start();
require_once 'conexion.php';

header('Content-Type: application/json');

// Verificar que el usuario esté logueado
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Usuario no autenticado'
    ]);
    exit();
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $user_id = $_SESSION['user_id'];
    
    // Obtener datos
    $event_id = intval($_POST['event_id']);
    $participant_id = intval($_POST['participant_id']);
    $amount = floatval($_POST['amount']);
    $amount_with_surcharge = isset($_POST['amount_with_surcharge']) ? floatval($_POST['amount_with_surcharge']) : null;
    $payment_date = $_POST['payment_date'];
    $due_date = isset($_POST['due_date']) ? $_POST['due_date'] : null;
    $payment_type = $conn->real_escape_string($_POST['payment_type']);
    $payment_method = isset($_POST['payment_method']) ? $conn->real_escape_string($_POST['payment_method']) : null;
    $status = isset($_POST['status']) ? $_POST['status'] : 'pending';
    $notes = isset($_POST['notes']) ? $conn->real_escape_string($_POST['notes']) : null;
    
    // Manejar imagen de comprobante
    $proof_image = null;
    if (isset($_POST['proof_image']) && !empty($_POST['proof_image'])) {
        $proof_image = $_POST['proof_image']; // URL o base64
    }
    
    try {
        $sql = "INSERT INTO payments (
                    event_id, 
                    participant_id, 
                    user_id, 
                    amount, 
                    amount_with_surcharge,
                    payment_date, 
                    due_date,
                    payment_type, 
                    payment_method,
                    status, 
                    proof_image,
                    notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param(
            "iiiddsssssss",
            $event_id,
            $participant_id,
            $user_id,
            $amount,
            $amount_with_surcharge,
            $payment_date,
            $due_date,
            $payment_type,
            $payment_method,
            $status,
            $proof_image,
            $notes
        );
        
        if ($stmt->execute()) {
            $payment_id = $stmt->insert_id;
            
            // Si el pago está confirmado, actualizar estado del participante
            if ($status === 'confirmed') {
                $update_sql = "UPDATE participants SET paid = 1 WHERE id = ?";
                $update_stmt = $conn->prepare($update_sql);
                $update_stmt->bind_param("i", $participant_id);
                $update_stmt->execute();
                $update_stmt->close();
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Pago registrado exitosamente',
                'payment_id' => $payment_id
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Error al guardar el pago: ' . $stmt->error
            ]);
        }
        
        $stmt->close();
        
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