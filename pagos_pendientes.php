<?php
session_start();
include 'conexion.php'; // Incluye tu conexión a la BD

// Establecer la cabecera como JSON
header('Content-Type: application/json');

// Verificar que el usuario esté logueado
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado.']);
    exit();
}

// Obtenemos el ID del usuario logueado (asumiendo que lo guardas en la sesión)
$user_id = $_SESSION['user_id'] ?? 0; // 0 para admin, o usa el ID real

$action = $_REQUEST['action'] ?? '';

switch ($action) {
    case 'register':
        handlePaymentRegistration($conn);
        break;
    case 'list':
        listPayments($conn);
        break;
    case 'detail':
        getPaymentDetail($conn, $_GET['id'] ?? 0);
        break;
    case 'update_status':
        updatePaymentStatus($conn);
        break;
    case 'stats':
        getPaymentStats($conn);
        break;
    // Agrega aquí más casos: 'delete', 'send_reminder', etc.
    default:
        echo json_encode(['success' => false, 'message' => 'Acción no válida.']);
}

$conn->close();

// --- FUNCIONES DE LÓGICA ---

function handlePaymentRegistration($conn) {
    // 1. Manejar la subida del comprobante (si existe)
    $comprobante_url = null;
    if (isset($_FILES['payment-proof']) && $_FILES['payment-proof']['error'] == 0) {
        $target_dir = "uploads/pagos/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0755, true);
        }
        $file_extension = pathinfo($_FILES["payment-proof"]["name"], PATHINFO_EXTENSION);
        $safe_filename = "pago_" . uniqid() . "." . $file_extension;
        $target_file = $target_dir . $safe_filename;

        if (move_uploaded_file($_FILES["payment-proof"]["tmp_name"], $target_file)) {
            $comprobante_url = $target_file; // Guardamos la ruta
        } else {
            // Opcional: fallar si la subida no funciona
            // echo json_encode(['success' => false, 'message' => 'Error al subir el comprobante.']);
            // exit();
        }
    }

    // 2. Recolectar datos del formulario
    // (Aquí deberías añadir más validación y sanitización)
    $evento_id = $_POST['event-id'] ?? null; // Asumimos que el <select> de evento tiene el ID en su value
    $evento_nombre = $_POST['event-name'] ?? ''; // Y el nombre en un data-attribute o texto
    $nombre = $_POST['participant-name'] ?? '';
    $email = $_POST['participant-email'] ?? '';
    $telefono = $_POST['participant-phone'] ?? null;
    $monto = $_POST['amount'] ?? 0;
    $tipo_pago = $_POST['payment-type'] ?? '';
    $metodo_pago = $_POST['payment-method'] ?? '';
    $estado = $_POST['payment-status'] ?? 'pending';
    $fecha_pago = $_POST['payment-date'] ?? '';
    $fecha_vencimiento = !empty($_POST['due-date']) ? $_POST['due-date'] : null;
    $notas = $_POST['notes'] ?? null;

    // 3. Insertar en la Base de Datos
    $sql = "INSERT INTO pagos (evento_id, evento_nombre, participante_nombre, participante_email, participante_telefono, monto, tipo_pago, metodo_pago, estado, fecha_pago, fecha_vencimiento, comprobante_url, notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    if ($stmt === false) {
        echo json_encode(['success' => false, 'message' => 'Error preparando la consulta: ' . $conn->error]);
        return;
    }
    
    $stmt->bind_param("issssssssssss", 
        $evento_id, 
        $evento_nombre, 
        $nombre, 
        $email, 
        $telefono, 
        $monto, 
        $tipo_pago, 
        $metodo_pago, 
        $estado, 
        $fecha_pago, 
        $fecha_vencimiento, 
        $comprobante_url, 
        $notas
    );

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Pago registrado con éxito.', 'payment_id' => $conn->insert_id]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al registrar el pago: ' . $stmt->error]);
    }
    $stmt->close();
}

function listPayments($conn) {
    // 1. Construir la consulta base
    $sql = "SELECT id, participante_nombre, monto, estado, fecha_vencimiento, tipo_pago FROM pagos";
    
    // 2. Añadir filtros (¡importante para que funcionen las tabs y la búsqueda!)
    $where = [];
    $params = [];
    $types = "";

    // Filtro de búsqueda
    if (!empty($_GET['search'])) {
        $search = "%" . $_GET['search'] . "%";
        $where[] = "(participante_nombre LIKE ? OR participante_email LIKE ?)";
        $params[] = $search;
        $params[] = $search;
        $types .= "ss";
    }

    // Filtro de estado (de las tabs o filtros avanzados)
    if (!empty($_GET['status'])) {
        $status_filters = explode(',', $_GET['status']); // Permite 'pending,overdue'
        $placeholders = implode(',', array_fill(0, count($status_filters), '?'));
        
        $custom_where = [];
        foreach($status_filters as $status) {
            if ($status == 'overdue') {
                $custom_where[] = "(estado = 'pending' AND fecha_vencimiento < CURDATE())";
            } else {
                $custom_where[] = "estado = ?";
                $params[] = $status;
                $types .= "s";
            }
        }
        if (!empty($custom_where)) {
             $where[] = "(" . implode(' OR ', $custom_where) . ")";
        }
    }
    
    // 3. Unir la consulta
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    
    $sql .= " ORDER BY fecha_registro DESC"; // O por fecha_vencimiento

    $stmt = $conn->prepare($sql);
    
    // 4. Bindear parámetros si existen
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }

    $stmt->execute();
    $result = $stmt->get_result();
    $payments = [];
    while($row = $result->fetch_assoc()) {
        // Chequeo de estado "vencido"
        if ($row['estado'] == 'pending' && $row['fecha_vencimiento'] && $row['fecha_vencimiento'] < date('Y-m-d')) {
            $row['estado'] = 'overdue';
        }
        $payments[] = $row;
    }
    
    echo json_encode(['success' => true, 'payments' => $payments]);
    $stmt->close();
}

function getPaymentStats($conn) {
    // Esta es una consulta más compleja para obtener los stats correctos
    $sql = "SELECT 
                SUM(CASE WHEN estado = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                SUM(CASE WHEN estado = 'pending' AND (fecha_vencimiento >= CURDATE() OR fecha_vencimiento IS NULL) THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN estado = 'pending' AND fecha_vencimiento < CURDATE() THEN 1 ELSE 0 END) as overdue
            FROM pagos";
    
    $result = $conn->query($sql);
    $stats = $result->fetch_assoc();
    
    echo json_encode(['success' => true, 'stats' => $stats]);
}


function getPaymentDetail($conn, $id) {
    if (empty($id)) {
        echo json_encode(['success' => false, 'message' => 'ID de pago no proporcionado.']);
        return;
    }

    $sql = "SELECT * FROM pagos WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $payment = $result->fetch_assoc();
        // Chequeo de estado "vencido"
        if ($payment['estado'] == 'pending' && $payment['fecha_vencimiento'] && $payment['fecha_vencimiento'] < date('Y-m-d')) {
            $payment['estado_real'] = 'overdue'; // Añadimos un campo para no sobreescribir
        } else {
             $payment['estado_real'] = $payment['estado'];
        }
        echo json_encode(['success' => true, 'payment' => $payment]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Pago no encontrado.']);
    }
    $stmt->close();
}

function updatePaymentStatus($conn) {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $new_status = $data['status'] ?? '';

    if (empty($id) || empty($new_status)) {
        echo json_encode(['success' => false, 'message' => 'Datos incompletos.']);
        return;
    }

    $sql = "UPDATE pagos SET estado = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("si", $new_status, $id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Estado actualizado.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Error al actualizar: ' . $stmt->error]);
    }
    $stmt->close();
}

?>