<?php
session_start();
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once 'conexion.php';

// Verificar que el usuario esté logueado
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Debes iniciar sesión para eliminar eventos'
    ]);
    exit;
}

// Verificar que se envió el event_id
if (!isset($_POST['event_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'ID de evento requerido'
    ]);
    exit;
}

$event_id = intval($_POST['event_id']);
$user_id = intval($_SESSION['user_id']);

try {
    // Verificar que el evento existe y que el usuario es el administrador
    $checkQuery = "SELECT id, admin_user_id, title FROM events WHERE id = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'El evento no existe'
        ]);
        exit;
    }
    
    $event = $result->fetch_assoc();
    
    // Verificar que el usuario actual es el administrador del evento
    if ($event['admin_user_id'] != $user_id) {
        echo json_encode([
            'success' => false,
            'message' => 'Solo el administrador puede eliminar este evento'
        ]);
        exit;
    }
    
    $stmt->close();
    
    // Iniciar transacción para eliminar todo relacionado
    $conn->begin_transaction();
    
    try {
        // 1. Obtener IDs de participants relacionados con este evento
        $participantIds = [];
        $getParticipants = $conn->prepare("SELECT id FROM participants WHERE event_id = ?");
        $getParticipants->bind_param("i", $event_id);
        $getParticipants->execute();
        $participantsResult = $getParticipants->get_result();
        while ($row = $participantsResult->fetch_assoc()) {
            $participantIds[] = $row['id'];
        }
        $getParticipants->close();
        
        // 2. Eliminar pagos relacionados con estos participantes (si existe la tabla payments)
        $tablesResult = $conn->query("SHOW TABLES LIKE 'payments'");
        if ($tablesResult->num_rows > 0 && count($participantIds) > 0) {
            // Verificar si payments tiene event_id o participant_id
            $columnsResult = $conn->query("DESCRIBE payments");
            $hasEventId = false;
            $hasParticipantId = false;
            while ($col = $columnsResult->fetch_assoc()) {
                if ($col['Field'] == 'event_id') $hasEventId = true;
                if ($col['Field'] == 'participant_id') $hasParticipantId = true;
            }
            
            if ($hasEventId) {
                // Si tiene event_id, eliminar directamente
                $deletePayments = $conn->prepare("DELETE FROM payments WHERE event_id = ?");
                $deletePayments->bind_param("i", $event_id);
                $deletePayments->execute();
                $deletePayments->close();
            } elseif ($hasParticipantId) {
                // Si tiene participant_id, eliminar por participantes
                $placeholders = implode(',', array_fill(0, count($participantIds), '?'));
                $deletePayments = $conn->prepare("DELETE FROM payments WHERE participant_id IN ($placeholders)");
                $types = str_repeat('i', count($participantIds));
                $deletePayments->bind_param($types, ...$participantIds);
                $deletePayments->execute();
                $deletePayments->close();
            }
        }
        
        // 3. Eliminar recordatorios de pago (si existe la tabla)
        $remindersResult = $conn->query("SHOW TABLES LIKE 'payment_reminders'");
        if ($remindersResult->num_rows > 0) {
            // Verificar estructura de payment_reminders
            $columnsResult = $conn->query("DESCRIBE payment_reminders");
            $hasEventId = false;
            while ($col = $columnsResult->fetch_assoc()) {
                if ($col['Field'] == 'event_id') $hasEventId = true;
            }
            
            if ($hasEventId) {
                $deleteReminders = $conn->prepare("DELETE FROM payment_reminders WHERE event_id = ?");
                $deleteReminders->bind_param("i", $event_id);
                $deleteReminders->execute();
                $deleteReminders->close();
            }
        }
        
        // 4. Eliminar asistencias relacionadas
        $deleteAssistances = $conn->prepare("DELETE FROM assistances WHERE event_id = ?");
        $deleteAssistances->bind_param("i", $event_id);
        $deleteAssistances->execute();
        $deleteAssistances->close();
        
        // 5. Eliminar participantes relacionados
        $deleteParticipants = $conn->prepare("DELETE FROM participants WHERE event_id = ?");
        $deleteParticipants->bind_param("i", $event_id);
        $deleteParticipants->execute();
        $deleteParticipants->close();
        
        // 6. Finalmente, eliminar el evento
        $deleteEvent = $conn->prepare("DELETE FROM events WHERE id = ?");
        $deleteEvent->bind_param("i", $event_id);
        $deleteEvent->execute();
        $deleteEvent->close();
        
        // Confirmar transacción
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'Evento "' . $event['title'] . '" eliminado correctamente',
            'event_id' => $event_id
        ]);
        
    } catch (Exception $e) {
        // Revertir cambios si algo falla
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al eliminar: ' . $e->getMessage()
    ]);
}

$conn->close();
?>