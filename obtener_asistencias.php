<?php
session_start();
require_once 'conexion.php';

header('Content-Type: application/json');

// Verificar que el usuario esté logueado (opcional, depende de tu lógica)
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Usuario no autenticado'
    ]);
    exit();
}

$event_id = isset($_GET['event_id']) ? intval($_GET['event_id']) : null;

$assistances = [];

try {
    $sql = "SELECT 
                a.id,
                a.event_id,
                a.participant_id,
                a.state,
                a.confirmed_by,
                a.confirmed_at,
                a.proof_image,
                p.name as participant_name,
                p.email as participant_email,
                p.phone as participant_phone,
                p.profile_pic as participant_pic,
                p.confirmed as participant_confirmed,
                p.paid as participant_paid,
                e.title as event_title,
                e.event_date,
                e.location
            FROM assistances a
            INNER JOIN participants p ON a.participant_id = p.id
            INNER JOIN events e ON a.event_id = e.id";
    
    $params = [];
    $types = "";
    
    // Filtrar por evento si se especifica
    if ($event_id) {
        $sql .= " WHERE a.event_id = ?";
        $params[] = $event_id;
        $types .= "i";
    }
    
    $sql .= " ORDER BY a.confirmed_at DESC";
    
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
        $row['participant_confirmed'] = (bool)$row['participant_confirmed'];
        $row['participant_paid'] = (bool)$row['participant_paid'];
        
        $assistances[] = $row;
    }
    
    $stmt->close();
    
    // Estadísticas
    $stats = [
        'total' => count($assistances),
        'confirmadas' => 0,
        'pendientes' => 0
    ];
    
    foreach ($assistances as $assistance) {
        if ($assistance['state'] === 'CONFIRMADO') {
            $stats['confirmadas']++;
        } else {
            $stats['pendientes']++;
        }
    }
    
    echo json_encode([
        'success' => true,
        'assistances' => $assistances,
        'stats' => $stats
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error al obtener asistencias: ' . $e->getMessage()
    ]);
}

$conn->close();
?>