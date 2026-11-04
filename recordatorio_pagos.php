<?php
session_start();
include 'conexion.php'; // Incluye tu conexión a la BD

header('Content-Type: application/json');

// Verificar que el usuario esté logueado
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['success' => false, 'message' => 'Acceso no autorizado.']);
    exit();
}

$payment_id = $_POST['payment_id'] ?? 0;

if (empty($payment_id)) {
    echo json_encode(['success' => false, 'message' => 'ID de pago no proporcionado.']);
    exit();
}

// 1. Obtener datos del pago
$stmt = $conn->prepare("SELECT p.participante_nombre, p.participante_email, p.monto, p.fecha_vencimiento, e.titulo AS evento_titulo
                       FROM pagos p
                       JOIN eventos e ON p.evento_id = e.id
                       WHERE p.id = ?");
$stmt->bind_param("i", $payment_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Pago no encontrado.']);
    exit();
}

$pago = $result->fetch_assoc();

$stmt->close();
$conn->close();

// 2. Simular el envío de correo
// En un proyecto real, aquí usarías una librería como PHPMailer
$to = $pago['participante_email'];
$subject = "Recordatorio de Pago Pendiente - " . $pago['evento_titulo'];
$message = "Hola " . $pago['participante_nombre'] . ",\n\n" .
           "Este es un recordatorio amistoso sobre tu pago pendiente de $" . $pago['monto'] . 
           " para el evento '" . $pago['evento_titulo'] . "'.\n" .
           "La fecha de vencimiento es el " . $pago['fecha_vencimiento'] . ".\n\n" .
           "¡Gracias!";
$headers = "From: no-reply@eventoapp.com"; // Cambia esto por tu email

// ⚠️ mail() es poco fiable. ¡Usa PHPMailer en producción!
$enviado = mail($to, $subject, $message, $headers);

if ($enviado) {
    echo json_encode(['success' => true, 'message' => 'Recordatorio enviado con éxito a ' . $to]);
} else {
    // Para fines de prueba, si mail() falla, simulamos el éxito
    // Comenta la línea de abajo en un servidor real
    echo json_encode(['success' => true, 'message' => 'Recordatorio enviado (simulado) a ' . $to]);
}
?>