<?php
session_start();
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 0);

require_once 'conexion.php';

if (!isset($_GET['event_id'])) {
    echo json_encode(['success' => false, 'message' => 'ID de evento requerido']);
    exit;
}

$event_id = intval($_GET['event_id']);

try {
    // JOIN correcto entre assistances y participants
    $sql = "SELECT 
                a.id as assistance_id,
                p.id as participant_id,
                p.name,
                p.email,
                p.phone,
                p.profile_pic,
                a.state,
                a.proof_image,
                a.created_at,
                CASE WHEN a.state = 'CONFIRMADO' THEN 1 ELSE 0 END as confirmed,
                COALESCE(p.paid, 0) as paid
            FROM assistances a
            INNER JOIN participants p ON a.participant_id = p.id
            WHERE a.event_id = ?
            ORDER BY p.name ASC";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Error preparando query: " . $conn->error);
    }
    
    $stmt->bind_param("i", $event_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Error ejecutando query: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    $participants = [];
    
    while ($row = $result->fetch_assoc()) {
        // Generar avatar si no tiene
        $profilePic = $row['profile_pic'];
        if (empty($profilePic)) {
            $profilePic = 'https://ui-avatars.com/api/?name=' . urlencode($row['name']) . '&background=6366f1&color=fff&size=150';
        }
        
        $participants[] = [
            'id' => (int)$row['assistance_id'],
            'participant_id' => (int)$row['participant_id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'phone' => $row['phone'] ?? '',
            'state' => $row['state'],
            'confirmed' => (int)$row['confirmed'],
            'paid' => (int)$row['paid'],
            'profilePic' => $profilePic,
            'proof_image' => $row['proof_image'] ?? null
        ];
    }
    
    $stmt->close();
    
    echo json_encode([
        'success' => true,
        'participants' => $participants,
        'total' => count($participants)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>