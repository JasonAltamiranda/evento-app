<?php
// Iniciar sesión
session_start();

// Incluir archivo de conexión
require_once 'conexion.php';

// Establecer cabecera JSON
header('Content-Type: application/json');

// Verificar que sea POST
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Obtener y sanitizar datos
    $email = $conn->real_escape_string($_POST['email']);
    $password = $_POST['password'];
    
    // Validar que los campos no estén vacíos
    if (empty($email) || empty($password)) {
        echo json_encode([
            "success" => false, 
            "message" => "Por favor, completa todos los campos."
        ]);
        exit();
    }
    
    // Buscar usuario en la base de datos
    $sql = "SELECT id, name, email, password, created_at FROM users WHERE email = ? LIMIT 1";
    
    if ($stmt = $conn->prepare($sql)) {
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 1) {
            $user = $result->fetch_assoc();
            
            // Verificar contraseña
            if (password_verify($password, $user['password'])) {
                // Login exitoso - Crear sesión
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                $_SESSION['user_email'] = $user['email'];
                $_SESSION['logged_in'] = true;
                
                // Actualizar último acceso
                $update_sql = "UPDATE users SET last_login = NOW() WHERE id = ?";
                $update_stmt = $conn->prepare($update_sql);
                $update_stmt->bind_param("i", $user['id']);
                $update_stmt->execute();
                $update_stmt->close();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Inicio de sesión exitoso",
                    "user" => [
                        "id" => $user['id'],
                        "name" => $user['name'],
                        "email" => $user['email']
                    ]
                ]);
            } else {
                echo json_encode([
                    "success" => false,
                    "message" => "Contraseña incorrecta. Por favor, intenta nuevamente."
                ]);
            }
        } else {
            echo json_encode([
                "success" => false,
                "message" => "No existe una cuenta con este correo electrónico."
            ]);
        }
        
        $stmt->close();
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Error en el servidor. Intenta más tarde."
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