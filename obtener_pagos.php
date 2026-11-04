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

$user_id = $_SESSION['user_id'];
$filter = isset($_GET['filter']) ? $_GET['filter'] : 'all'; // all, my_payments, pending
$event_id = isset($_GET['event_id']) ? intval($_GET['event_id']) : null;

$payments = [];

try {
    // Base de la consulta
    $sql = "SELECT 
                p.id,
                p.event_id,
                e.title as event_title,
                p.participant_id,
                pt.name as participant_name,
                pt.email as participant_email,
                pt.phone as participant_phone,
                pt.profile_pic as participant_pic,
                p.user_id,
                u.name as payer_name,
                p.amount,
                p.amount_with_surcharge,
                p.payment_date,
                p.due_date,
                p.payment_type,
                p.payment_method,
                p.status,
                p.proof_image,
                p.notes,
                p.created_at,
                CASE 
                    WHEN p.status = 'pending' AND p.due_date < CURDATE() THEN 'overdue'
                    ELSE p.status
                END as actual_status
            FROM payments p
            INNER JOIN participants pt ON p.participant_id = pt.id
            INNER JOIN events e ON p.event_id = e.id
            LEFT JOIN users u ON p.user_id = u.id
            WHERE 1=1";
    
    $params = [];
    $types = "";
    
    // Filtrar por evento si se especifica
    if ($event_id) {
        $sql .= " AND p.event_id = ?";
        $params[] = $event_id;
        $types .= "i";
    }
    
    // Aplicar filtros
    switch ($filter) {
        case 'my_payments':
            // SOLO pagos donde el usuario logueado es el que pagó
            $sql .= " AND p.user_id = ?";
            $params[] = $user_id;
            $types .= "i";
            break;
            
        case 'pending':
            // SOLO pagos pendientes o vencidos (de cualquier usuario)
            // Pero SOLO del usuario logueado si es participante
            $sql .= " AND p.status IN ('pending', 'overdue')";
            $sql .= " AND (pt.user_id = ? OR pt.email = (SELECT email FROM users WHERE id = ?))";
            $params[] = $user_id;
            $params[] = $user_id;
            $types .= "ii";
            break;
            
        case 'all':
        default:
            // ✅ TODOS LOS PAGOS - SIN FILTRAR POR USUARIO
            // No agregamos ninguna condición adicional
            break;
    }
    
    $sql .= " ORDER BY 
                CASE p.status
                    WHEN 'overdue' THEN 1
                    WHEN 'pending' THEN 2
                    WHEN 'processing' THEN 3
                    WHEN 'confirmed' THEN 4
                END,
                p.due_date ASC,
                p.payment_date DESC";
    
    $stmt = $conn->prepare($sql);
    
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    
    $stmt->execute();
    $result = $stmt->get_result();
    
    while ($row = $result->fetch_assoc()) {
        // Formatear datos
        $row['id'] = (int)$row['id'];
        $row['event_id'] = (int)$row['event_id'];
        $row['participant_id'] = (int)$row['participant_id'];
        $row['user_id'] = $row['user_id'] ? (int)$row['user_id'] : null;
        $row['amount'] = (float)$row['amount'];
        $row['amount_with_surcharge'] = $row['amount_with_surcharge'] ? (float)$row['amount_with_surcharge'] : null;
        
        // Calcular si está vencido
        if ($row['status'] === 'pending' && $row['due_date']) {
            $today = new DateTime();
            $due = new DateTime($row['due_date']);
            if ($due < $today) {
                $row['actual_status'] = 'overdue';
                $row['days_overdue'] = $today->diff($due)->days;
            } else {
                $row['days_until_due'] = $today->diff($due)->days;
            }
        }
        
        $payments[] = $row;
    }
    
    $stmt->close();
    
    // Estadísticas
    $stats = [
        'total' => count($payments),
        'pending' => 0,
        'processing' => 0,
        'confirmed' => 0,
        'overdue' => 0,
        'total_amount' => 0,
        'paid_amount' => 0,
        'pending_amount' => 0
    ];
    
    foreach ($payments as $payment) {
        $stats['total_amount'] += $payment['amount'];
        
        if ($payment['actual_status'] === 'confirmed') {
            $stats['confirmed']++;
            $stats['paid_amount'] += $payment['amount'];
        } elseif ($payment['actual_status'] === 'processing') {
            $stats['processing']++;
        } elseif ($payment['actual_status'] === 'overdue') {
            $stats['overdue']++;
            $stats['pending_amount'] += $payment['amount'];
        } else {
            $stats['pending']++;
            $stats['pending_amount'] += $payment['amount'];
        }
    }
    
    echo json_encode([
        'success' => true,
        'payments' => $payments,
        'stats' => $stats,
        'filter' => $filter
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener pagos: ' . $e->getMessage()
    ]);
}
$conn->close();
?>