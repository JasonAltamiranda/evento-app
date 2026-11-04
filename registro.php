<?php
require_once 'conexion.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    $name = $conn->real_escape_string(trim($_POST['name']));
    $email = $conn->real_escape_string(trim($_POST['email']));
    $password = $_POST['password'];
    
    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode([
            "success" => false, 
            "message" => "Por favor, completa todos los campos."
        ]);
        exit();
    }
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            "success" => false,
            "message" => "El formato del correo electrónico no es válido."
        ]);
        exit();
    }
    
    if (strlen($password) < 6) {
        echo json_encode([
            "success" => false,
            "message" => "La contraseña debe tener al menos 6 caracteres."
        ]);
        exit();
    }
    
    $check_sql = "SELECT id FROM users WHERE email = ? LIMIT 1";
    if ($check_stmt = $conn->prepare($check_sql)) {
        $check_stmt->bind_param("s", $email);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows > 0) {
            echo json_encode([
                "success" => false,
                "message" => "Este correo electrónico ya está registrado."
            ]);
            $check_stmt->close();
            exit();
        }
        $check_stmt->close();
    }
    
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    
    $sql = "INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())";
    
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("sss", $name, $email, $hashed_password);
        
        if ($stmt->execute()) {
            echo json_encode([
                "success" => true,
                "message" => "¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...",
                "user_id" => $stmt->insert_id
            ]);
        } else {
            echo json_encode([
                "success" => false,
                "message" => "Error al crear la cuenta: " . $stmt->error
            ]);
        }
        
        $stmt->close();
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Error de preparación: " . $conn->error
        ]);
    }
} else {
    echo json_encode([
        "success" => false,
        "message" => "Método de solicitud no válido."
    ]);
}

$conn->close();
?>