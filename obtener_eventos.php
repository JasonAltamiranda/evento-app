<?php
session_start(); // 🆕 Agregar sesión

require_once 'conexion.php';

$events_array = [];
$current_user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;

$sql = "SELECT 
            e.id, 
            e.title, 
            e.description, 
            e.event_date AS date,
            e.event_time AS time,
            e.location, 
            e.cost AS costPerPerson, 
            e.capacity, 
            e.address,
            e.image_url AS imageUrl,
            e.created_by,
            e.admin_user_id,
            COUNT(DISTINCT a.id) AS registeredParticipants
        FROM events e
        LEFT JOIN assistances a ON e.id = a.event_id AND a.state = 'CONFIRMADO'
        GROUP BY e.id
        ORDER BY e.event_date DESC";

$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        
        $row['id'] = (int)$row['id'];
        $row['costPerPerson'] = (float)$row['costPerPerson'];
        $row['capacity'] = (int)$row['capacity'];
        $row['registeredParticipants'] = (int)$row['registeredParticipants'];
        $row['created_by'] = (int)$row['created_by'];
        $row['admin_user_id'] = (int)$row['admin_user_id'];
        
        // 🆕 Indicar si el usuario actual es admin
        $row['isAdmin'] = ($current_user_id && $row['admin_user_id'] == $current_user_id);
        
        if (empty($row['time'])) {
            $row['time'] = '20:00';
        }
        
        $row['reminderDays'] = 0;
        
        if (empty($row['imageUrl'])) {
            $row['imageUrl'] = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=160&fit=crop';
        }

        $events_array[] = $row;
    }
}

header('Content-Type: application/json');
echo json_encode(['events' => $events_array]);

$conn->close();
?>