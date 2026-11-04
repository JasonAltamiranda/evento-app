<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

session_start();

// Verificar sesión
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'No autorizado']);
    exit();
}

// Conexión
require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

try {
    // Obtener datos del POST
    $event_id = isset($_POST['event_id']) ? intval($_POST['event_id']) : 0;
    $participant_name = isset($_POST['participant_name']) ? trim($_POST['participant_name']) : '';
    $participant_email = isset($_POST['participant_email']) ? trim($_POST['participant_email']) : '';
    $participant_phone = isset($_POST['participant_phone']) ? trim($_POST['participant_phone']) : '';
    $amount = isset($_POST['amount']) ? floatval($_POST['amount']) : 0;
    $payment_type = isset($_POST['payment_type']) ? trim($_POST['payment_type']) : '';
    $payment_method = isset($_POST['payment_method']) ? trim($_POST['payment_method']) : '';
    $status = isset($_POST['status']) ? trim($_POST['status']) : 'pending';
    $payment_date = isset($_POST['payment_date']) ? $_POST['payment_date'] : date('Y-m-d');
    $due_date = !empty($_POST['due_date']) ? $_POST['due_date'] : null;
    $notes = isset($_POST['notes']) && !empty($_POST['notes']) ? trim($_POST['notes']) : null;
    
    // Validaciones básicas
    if ($event_id === 0) {
        throw new Exception('Debe seleccionar un evento');
    }
    
    if (empty($participant_name)) {
        throw new Exception('El nombre del participante es obligatorio');
    }
    
    if (empty($participant_email)) {
        throw new Exception('El email del participante es obligatorio');
    }
    
    if ($amount <= 0) {
        throw new Exception('El monto debe ser mayor a 0');
    }
    
    if (empty($payment_type)) {
        throw new Exception('Debe seleccionar un tipo de pago');
    }
    
    // ==========================================
    // BLOQUE DE IMAGEN
    // ==========================================
    $proof_image = null;
    
    // 1. Verificamos si se envió algo en el campo 'proof_image'
    if (isset($_FILES['proof_image']) && $_FILES['proof_image']['name'] != '') {
        
        $file_error = $_FILES['proof_image']['error'];
        $file_name = $_FILES['proof_image']['name'];
        $file_tmp = $_FILES['proof_image']['tmp_name'];
        
        // 2. Revisar errores nativos de PHP
        if ($file_error !== UPLOAD_ERR_OK) {
            $errores_php = [
                1 => 'El archivo excede upload_max_filesize en php.ini',
                2 => 'El archivo excede MAX_FILE_SIZE del formulario',
                3 => 'El archivo se subió parcialmente',
                4 => 'No se subió ningún archivo',
                6 => 'Falta la carpeta temporal en el servidor',
                7 => 'No se pudo escribir en el disco',
                8 => 'Una extensión de PHP detuvo la subida',
            ];
            throw new Exception('Error PHP al subir: ' . ($errores_php[$file_error] ?? 'Error desconocido'));
        }

        // 3. Definir y crear carpeta
        $upload_dir = 'uploads/proofs/';
        
        // Intentar crear la carpeta si no existe
        if (!file_exists($upload_dir)) {
            if (!mkdir($upload_dir, 0777, true)) {
                // Si falla, intentamos una ruta absoluta para ver si es eso
                throw new Exception('No se pudo crear la carpeta "uploads/proofs/". Verifica los permisos.');
            }
        }
        
        // 4. Validar extensión
        $file_extension = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'webp'];
        
        if (!in_array($file_extension, $allowed)) {
            throw new Exception('Formato no permitido (' . $file_extension . '). Solo se aceptan: JPG, PNG, PDF.');
        }

        // 5. Mover el archivo
        $new_file_name = 'proof_' . time() . '_' . uniqid() . '.' . $file_extension;
        $destination = $upload_dir . $new_file_name;
        
        if (move_uploaded_file($file_tmp, $destination)) {
            $proof_image = $destination; // ¡ÉXITO!
        } else {
            $error_details = error_get_last();
            throw new Exception('Falló move_uploaded_file. Verifique permisos de la carpeta uploads.');
        }
    }
    
    
    // PASO 1: Buscar o crear participante
    $participant_id = null;
    $user_id = $_SESSION['user_id'];
    
    $check_sql = "SELECT id FROM participants WHERE email = ? AND event_id = ? LIMIT 1";
    $check_stmt = $conn->prepare($check_sql);
    
    if (!$check_stmt) {
        throw new Exception('Error al preparar búsqueda: ' . $conn->error);
    }
    
    $check_stmt->bind_param("si", $participant_email, $event_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    if ($check_result->num_rows > 0) {
        // Participante ya existe
        $participant_id = $check_result->fetch_assoc()['id'];
    } else {
        // Crear nuevo participante
        $profile_pic = 'https://i.pravatar.cc/150?u=' . urlencode($participant_email);
        
        // IMPORTANTE: Orden correcto según tu tabla
        $insert_participant = "INSERT INTO participants 
                               (event_id, user_id, name, email, phone, confirmed, paid, profile_pic) 
                               VALUES (?, ?, ?, ?, ?, 0, 0, ?)";
        $insert_stmt = $conn->prepare($insert_participant);
        
        if (!$insert_stmt) {
            throw new Exception('Error al preparar insert: ' . $conn->error);
        }
        
        $insert_stmt->bind_param("iissss", 
            $event_id, 
            $user_id, 
            $participant_name, 
            $participant_email, 
            $participant_phone, 
            $profile_pic
        );
        
        if (!$insert_stmt->execute()) {
            throw new Exception('Error al crear participante: ' . $insert_stmt->error);
        }
        
        $participant_id = $insert_stmt->insert_id;
        $insert_stmt->close();
    }
    
    $check_stmt->close();
    
    if (!$participant_id) {
        throw new Exception('No se pudo obtener el ID del participante');
    }
    
    // PASO 2: Crear el pago
    $sql = "INSERT INTO payments (
                event_id, 
                participant_id, 
                user_id, 
                amount, 
                payment_date, 
                due_date, 
                payment_type, 
                payment_method, 
                status, 
                proof_image, 
                notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception('Error al preparar insert de pago: ' . $conn->error);
    }
    
    $stmt->bind_param("iiidsssssss", 
        $event_id,
        $participant_id,
        $user_id,
        $amount,
        $payment_date,
        $due_date,
        $payment_type,
        $payment_method,
        $status,
        $proof_image,
        $notes
    );
    
    if (!$stmt->execute()) {
        throw new Exception('Error al crear pago: ' . $stmt->error);
    }
    
    $payment_id = $stmt->insert_id;
    $stmt->close();
    
    // PASO 3: Actualizar participante si está confirmado
    if ($status === 'confirmed') {
        $update_sql = "UPDATE participants SET paid = 1, confirmed = 1 WHERE id = ?";
        $update_stmt = $conn->prepare($update_sql);
        
        if ($update_stmt) {
            $update_stmt->bind_param("i", $participant_id);
            $update_stmt->execute();
            $update_stmt->close();
        }
    }
    
    // Respuesta exitosa
    echo json_encode([
        'success' => true,
        'message' => 'Pago registrado exitosamente',
        'payment_id' => $payment_id,
        'participant_id' => $participant_id
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>