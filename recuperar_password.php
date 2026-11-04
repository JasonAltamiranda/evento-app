// recuperar_password.php
<?php
require_once 'conexion.php';
header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = $conn->real_escape_string($_POST['email']);
    
    // Verificar si existe el email
    $sql = "SELECT id FROM users WHERE email = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        // Generar token único
        $token = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        // Guardar token en BD
        $update = "UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = ?";
        $stmt2 = $conn->prepare($update);
        $stmt2->bind_param("sss", $token, $expiry, $email);
        $stmt2->execute();
        
        // Enviar email (necesitas configurar mail())
        $reset_link = "https://tudominio.com/restablecer.php?token=" . $token;
        // mail($email, "Recuperar contraseña", $reset_link);
        
        echo json_encode(["success" => true, "message" => "Email enviado"]);
    } else {
        echo json_encode(["success" => false, "message" => "Email no encontrado"]);
    }
}
?>