<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

require_once 'conexion.php';

$event_id = isset($_GET['event_id']) ? intval($_GET['event_id']) : 0;

if ($event_id === 0) {
    echo json_encode(['success' => false, 'message' => 'ID de evento requerido']);
    exit;
}

try {
    // Obtener información del evento
    $stmt = $conn->prepare("
        SELECT id, title, event_date as date, location, cost as cost_per_person, capacity, address
        FROM events 
        WHERE id = ?
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $event = $result->fetch_assoc();
    $stmt->close();
    
    if (!$event) {
        echo json_encode(['success' => false, 'message' => 'Evento no encontrado']);
        exit;
    }
    
    // 🆕 Total de asistencias registradas
    $stmt = $conn->prepare("
        SELECT COUNT(*) as total
        FROM assistances
        WHERE event_id = ?
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalParticipants = $result->fetch_assoc()['total'];
    $stmt->close();
    
    // 🆕 Asistencias confirmadas
    $stmt = $conn->prepare("
        SELECT COUNT(*) as confirmed
        FROM assistances
        WHERE event_id = ? AND state = 'CONFIRMADO'
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $confirmedParticipants = $result->fetch_assoc()['confirmed'];
    $stmt->close();
    
    // Pagos confirmados (suma total)
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as total_confirmed
        FROM payments
        WHERE event_id = ? AND status = 'confirmed'
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalConfirmed = $result->fetch_assoc()['total_confirmed'];
    $stmt->close();
    
    // Pagos pendientes (suma total)
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as total_pending
        FROM payments
        WHERE event_id = ? AND status IN ('pending', 'overdue')
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalPending = $result->fetch_assoc()['total_pending'];
    $stmt->close();
    
    // Pagos procesando
    $stmt = $conn->prepare("
        SELECT COALESCE(SUM(amount), 0) as total_processing
        FROM payments
        WHERE event_id = ? AND status = 'processing'
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $totalProcessing = $result->fetch_assoc()['total_processing'];
    $stmt->close();
    
// Conteo de pagos por estado y NOMBRES
    // Usamos GROUP_CONCAT para traer los nombres separados por coma
    $stmt = $conn->prepare("
        SELECT 
            SUM(CASE WHEN p.status = 'confirmed' THEN 1 ELSE 0 END) as count_confirmed,
            SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) as count_pending,
            SUM(CASE WHEN p.status = 'overdue' THEN 1 ELSE 0 END) as count_overdue,
            SUM(CASE WHEN p.status = 'processing' THEN 1 ELSE 0 END) as count_processing,
            
            GROUP_CONCAT(CASE WHEN p.status = 'confirmed' THEN pt.name ELSE NULL END SEPARATOR ', ') as names_confirmed,
            GROUP_CONCAT(CASE WHEN p.status = 'pending' THEN pt.name ELSE NULL END SEPARATOR ', ') as names_pending,
            GROUP_CONCAT(CASE WHEN p.status = 'overdue' THEN pt.name ELSE NULL END SEPARATOR ', ') as names_overdue,
            GROUP_CONCAT(CASE WHEN p.status = 'processing' THEN pt.name ELSE NULL END SEPARATOR ', ') as names_processing
            
        FROM payments p
        JOIN participants pt ON p.participant_id = pt.id
        WHERE p.event_id = ?
    ");
    $stmt->bind_param("i", $event_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $paymentCounts = $result->fetch_assoc();
    $stmt->close();
    
    // Calcular cupos disponibles
    $capacity = $event['capacity'] == 0 ? 'Ilimitada' : $event['capacity'];
    $availableSpots = $event['capacity'] == 0 ? 'N/A' : ($event['capacity'] - $totalParticipants);
    
    // Potencial a recaudar
    $potentialRevenue = $event['capacity'] == 0 ? 0 : ($event['capacity'] * $event['cost_per_person']);
    
    echo json_encode([
        'success' => true,
        'event' => [
            'id' => (int)$event['id'],
            'title' => $event['title'],
            'date' => $event['date'],
            'location' => $event['location'],
            'cost_per_person' => (float)$event['cost_per_person'],
            'capacity' => $capacity
        ],
        'participants' => [
            'total' => (int)$totalParticipants,
            'confirmed' => (int)$confirmedParticipants,
            'pending' => (int)($totalParticipants - $confirmedParticipants)
        ],
        'payments' => [
            'confirmed' => (float)$totalConfirmed,
            'pending' => (float)$totalPending,
            'processing' => (float)$totalProcessing,
            'total' => (float)($totalConfirmed + $totalPending + $totalProcessing)
        ],
        'payment_counts' => [
            'confirmed' => (int)$paymentCounts['count_confirmed'],
            'pending' => (int)$paymentCounts['count_pending'],
            'overdue' => (int)$paymentCounts['count_overdue'],
            'processing' => (int)$paymentCounts['count_processing'],
            'names_confirmed' => $paymentCounts['names_confirmed'] ?? 'Ninguno',
            'names_pending' => $paymentCounts['names_pending'] ?? 'Ninguno',
            'names_overdue' => $paymentCounts['names_overdue'] ?? 'Ninguno',
            'names_processing' => $paymentCounts['names_processing'] ?? 'Ninguno'
        ],
        'capacity' => [
            'total' => $capacity,
            'available' => $availableSpots,
            'potential_revenue' => (float)$potentialRevenue
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage()
    ]);
}

$conn->close();
?>