<?php
session_start();
header('Content-Type: application/json');

// Verificar si el usuario está autenticado
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'No autenticado']);
    exit;
}

require_once 'conexion.php';

// Obtener mes y año (por defecto: actual)
$month = isset($_GET['month']) ? intval($_GET['month']) : date('n');
$year = isset($_GET['year']) ? intval($_GET['year']) : date('Y');

try {
    // Eventos realizados en el mes
    $stmt = $conn->prepare("
        SELECT 
            id, title, event_date as date, location, cost as cost_per_person, capacity,
            (SELECT COUNT(*) FROM participants WHERE event_id = events.id) as participants_count
        FROM events 
        WHERE MONTH(event_date) = ? 
        AND YEAR(event_date) = ?
        ORDER BY event_date DESC
    ");
    $stmt->bind_param("ii", $month, $year);
    $stmt->execute();
    $result = $stmt->get_result();
    $events = $result->fetch_all(MYSQLI_ASSOC);
    $stmt->close();
    
    // Resumen de pagos del mes
    $stmt = $conn->prepare("
        SELECT 
            COALESCE(SUM(CASE WHEN p.status = 'confirmed' THEN p.amount ELSE 0 END), 0) as confirmed_total,
            COALESCE(SUM(CASE WHEN p.status IN ('pending', 'overdue') THEN p.amount ELSE 0 END), 0) as pending_total,
            COUNT(CASE WHEN p.status = 'confirmed' THEN 1 END) as confirmed_count,
            COUNT(CASE WHEN p.status IN ('pending', 'overdue') THEN 1 END) as pending_count
        FROM payments p
        INNER JOIN events e ON p.event_id = e.id
        WHERE MONTH(e.event_date) = ?
        AND YEAR(e.event_date) = ?
    ");
    $stmt->bind_param("ii", $month, $year);
    $stmt->execute();
    $result = $stmt->get_result();
    $paymentsSummary = $result->fetch_assoc();
    $stmt->close();
    
    // Detalle de pagos por evento
    $eventsWithPayments = [];
    foreach ($events as $event) {
        $stmt = $conn->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) as confirmed,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as pending,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
                COUNT(CASE WHEN status IN ('pending', 'overdue') THEN 1 END) as pending_count
            FROM payments
            WHERE event_id = ?
        ");
        $stmt->bind_param("i", $event['id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $payments = $result->fetch_assoc();
        $stmt->close();
        
        $eventsWithPayments[] = [
            'event' => $event,
            'payments' => $payments
        ];
    }
    
    // Nombre del mes en español
    $monthNames = [
        1 => 'Enero', 2 => 'Febrero', 3 => 'Marzo', 4 => 'Abril',
        5 => 'Mayo', 6 => 'Junio', 7 => 'Julio', 8 => 'Agosto',
        9 => 'Septiembre', 10 => 'Octubre', 11 => 'Noviembre', 12 => 'Diciembre'
    ];
    
    echo json_encode([
        'success' => true,
        'period' => [
            'month' => $month,
            'year' => $year,
            'month_name' => $monthNames[$month],
            'display' => $monthNames[$month] . ' ' . $year
        ],
        'summary' => [
            'total_events' => count($events),
            'total_participants' => array_sum(array_column($events, 'participants_count')),
            'payments' => [
                'confirmed' => (float)$paymentsSummary['confirmed_total'],
                'pending' => (float)$paymentsSummary['pending_total'],
                'confirmed_count' => (int)$paymentsSummary['confirmed_count'],
                'pending_count' => (int)$paymentsSummary['pending_count']
            ]
        ],
        'events' => $eventsWithPayments
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error en la base de datos: ' . $e->getMessage()
    ]);
}

$conn->close();
?>