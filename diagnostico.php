<?php
// ARCHIVO DE DIAGNÓSTICO - Ejecutar en el navegador
// URL: http://localhost/tu_proyecto/diagnostico.php

require_once 'conexion.php';

echo "<style>
    body { 
        font-family: Arial; 
        background: #121212; 
        color: #fff; 
        padding: 20px; 
    }
    h2 { 
        color: #7047EB; 
        border-bottom: 2px solid #7047EB; 
        padding-bottom: 10px; 
    }
    table { 
        width: 100%; 
        border-collapse: collapse; 
        background: #1E1E1E; 
        margin: 20px 0;
    }
    th, td { 
        padding: 12px; 
        text-align: left; 
        border: 1px solid #333; 
    }
    th { 
        background: #2A2A2A; 
        color: #7047EB; 
    }
    .success { 
        color: #10B981; 
        font-weight: bold; 
    }
    .error { 
        color: #EF4444; 
        font-weight: bold; 
    }
    .info { 
        background: #2A2A2A; 
        padding: 15px; 
        border-radius: 8px; 
        margin: 10px 0; 
    }
</style>";

echo "<h1>🔍 Diagnóstico del Sistema</h1>";

// 1. Verificar conexión
echo "<h2>1. Conexión a la Base de Datos</h2>";
if ($conn) {
    echo "<div class='info'><span class='success'>✅ Conexión exitosa</span><br>";
    echo "Servidor: " . DB_SERVER . "<br>";
    echo "Puerto: " . DB_PORT . "<br>";
    echo "Base de datos: " . DB_NAME . "</div>";
} else {
    echo "<div class='info'><span class='error'>❌ Error de conexión</span></div>";
    exit();
}

// 2. Verificar tabla events
echo "<h2>2. Tabla 'events'</h2>";
$result = $conn->query("DESCRIBE events");
if ($result) {
    echo "<div class='info'><span class='success'>✅ Tabla existe</span></div>";
    echo "<table><tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    while ($row = $result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>{$row['Field']}</td>";
        echo "<td>{$row['Type']}</td>";
        echo "<td>{$row['Null']}</td>";
        echo "<td>{$row['Key']}</td>";
        echo "<td>{$row['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<div class='info'><span class='error'>❌ Tabla no existe</span></div>";
}

// 3. Contar eventos
echo "<h2>3. Eventos en la Base de Datos</h2>";
$count_result = $conn->query("SELECT COUNT(*) as total FROM events");
$count = $count_result->fetch_assoc();
echo "<div class='info'><span class='success'>Total de eventos: " . $count['total'] . "</span></div>";

// 4. Mostrar todos los eventos
echo "<h2>4. Listado Completo de Eventos</h2>";
$events_result = $conn->query("SELECT * FROM events ORDER BY id DESC");
if ($events_result->num_rows > 0) {
    echo "<table>";
    echo "<tr><th>ID</th><th>Título</th><th>Fecha</th><th>Ubicación</th><th>Costo</th><th>Capacidad</th><th>Imagen URL</th></tr>";
    while ($event = $events_result->fetch_assoc()) {
        echo "<tr>";
        echo "<td>{$event['id']}</td>";
        echo "<td>{$event['title']}</td>";
        echo "<td>{$event['event_date']}</td>";
        echo "<td>{$event['location']}</td>";
        echo "<td>\${$event['cost']}</td>";
        echo "<td>{$event['capacity']}</td>";
        echo "<td style='max-width: 200px; word-break: break-all;'>" . 
             (empty($event['image_url']) ? '<span class="error">SIN IMAGEN</span>' : substr($event['image_url'], 0, 50) . '...') . 
             "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "<div class='info'><span class='error'>❌ No hay eventos en la base de datos</span></div>";
}

// 5. Verificar columna image_url
echo "<h2>5. Verificar Columna 'image_url'</h2>";
$check_column = $conn->query("SHOW COLUMNS FROM events LIKE 'image_url'");
if ($check_column->num_rows > 0) {
    echo "<div class='info'><span class='success'>✅ Columna 'image_url' existe</span></div>";
} else {
    echo "<div class='info'><span class='error'>❌ Columna 'image_url' NO existe</span><br>";
    echo "<strong>SOLUCIÓN:</strong> Ejecuta este SQL en phpMyAdmin:<br><br>";
    echo "<code style='background: #000; padding: 10px; display: block; margin: 10px 0;'>";
    echo "ALTER TABLE events ADD COLUMN image_url VARCHAR(500) DEFAULT 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=160&fit=crop' AFTER address;";
    echo "</code></div>";
}

// 6. Verificar tabla users
echo "<h2>6. Tabla 'users'</h2>";
$users_result = $conn->query("SELECT COUNT(*) as total FROM users");
if ($users_result) {
    $users_count = $users_result->fetch_assoc();
    echo "<div class='info'><span class='success'>✅ Tabla existe - Total usuarios: " . $users_count['total'] . "</span></div>";
    
    // Mostrar usuarios
    $users_list = $conn->query("SELECT id, name, email, created_at, last_login FROM users");
    if ($users_list->num_rows > 0) {
        echo "<table>";
        echo "<tr><th>ID</th><th>Nombre</th><th>Email</th><th>Creado</th><th>Último Login</th></tr>";
        while ($user = $users_list->fetch_assoc()) {
            echo "<tr>";
            echo "<td>{$user['id']}</td>";
            echo "<td>{$user['name']}</td>";
            echo "<td>{$user['email']}</td>";
            echo "<td>{$user['created_at']}</td>";
            echo "<td>" . ($user['last_login'] ?? 'Nunca') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} else {
    echo "<div class='info'><span class='error'>❌ Tabla 'users' no existe</span></div>";
}

// 7. Verificar tabla participants
echo "<h2>7. Tabla 'participants'</h2>";
$part_result = $conn->query("SELECT COUNT(*) as total FROM participants");
if ($part_result) {
    $part_count = $part_result->fetch_assoc();
    echo "<div class='info'><span class='success'>✅ Tabla existe - Total participantes: " . $part_count['total'] . "</span></div>";
} else {
    echo "<div class='info'><span class='error'>❌ Tabla 'participants' no existe</span></div>";
}

// 8. Verificar tabla payments
echo "<h2>8. Tabla 'payments'</h2>";
$pay_result = $conn->query("SELECT COUNT(*) as total FROM payments");
if ($pay_result) {
    $pay_count = $pay_result->fetch_assoc();
    echo "<div class='info'><span class='success'>✅ Tabla existe - Total pagos: " . $pay_count['total'] . "</span></div>";
    
    // Mostrar pagos
    if ($pay_count['total'] > 0) {
        $payments_list = $conn->query("SELECT p.*, e.title as event_title, pt.name as participant_name 
                                       FROM payments p 
                                       LEFT JOIN events e ON p.event_id = e.id 
                                       LEFT JOIN participants pt ON p.participant_id = pt.id 
                                       ORDER BY p.id DESC LIMIT 10");
        echo "<table>";
        echo "<tr><th>ID</th><th>Evento</th><th>Participante</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr>";
        while ($payment = $payments_list->fetch_assoc()) {
            echo "<tr>";
            echo "<td>{$payment['id']}</td>";
            echo "<td>" . ($payment['event_title'] ?? 'N/A') . "</td>";
            echo "<td>" . ($payment['participant_name'] ?? 'N/A') . "</td>";
            echo "<td>\${$payment['amount']}</td>";
            echo "<td>{$payment['status']}</td>";
            echo "<td>{$payment['payment_date']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
} else {
    echo "<div class='info'><span class='error'>❌ Tabla 'payments' no existe</span></div>";
}

// 9. Verificar obtener_eventos.php
echo "<h2>9. Prueba de obtener_eventos.php</h2>";
$eventos_response = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/obtener_eventos.php');
if ($eventos_response) {
    $eventos_data = json_decode($eventos_response, true);
    echo "<div class='info'>";
    echo "<strong>Respuesta:</strong><br>";
    echo "<pre style='background: #000; padding: 10px; overflow: auto;'>" . 
        json_encode($eventos_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . 
        "</pre>";
    echo "</div>";
} else {
    echo "<div class='info'><span class='error'>❌ No se pudo acceder a obtener_eventos.php</span></div>";
}

// 10. Recomendaciones
echo "<h2>10. Recomendaciones</h2>";
echo "<div class='info'>";
echo "<strong>Si no aparecen eventos:</strong><br>";
echo "1. Verifica que la columna 'image_url' exista en la tabla 'events'<br>";
echo "2. Verifica que obtener_eventos.php no tenga errores<br>";
echo "3. Revisa la consola del navegador (F12) en la app<br>";
echo "4. Verifica que script.js esté cargando los eventos correctamente<br><br>";
echo "<strong>Si no aparecen pagos:</strong><br>";
echo "1. Verifica que las tablas 'participants' y 'payments' existan<br>";
echo "2. Ejecuta el script SQL que te pasé para crear datos de ejemplo<br>";
echo "3. Verifica que obtener_pagos.php esté funcionando<br>";
echo "</div>";

$conn->close();

echo "<hr><p style='text-align: center; color: #7047EB;'>✅ Diagnóstico completado</p>";
?>