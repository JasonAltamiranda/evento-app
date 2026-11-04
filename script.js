// ===============================================
// 1. BASE DE DATOS Y ESTRUCTURA DE DATOS
// ===============================================

let currentScreen = 'screen-events'; 
let activeEventId = null; 
let editingEventId = null;
let db = {
    events: [],
    participants: [],
    payments: [],
    assistances: []
}; 

// Array de imágenes de placeholder temáticas para eventos
const defaultEventImages = [
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=160&fit=crop',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=160&fit=crop',
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=160&fit=crop',
    'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=400&h=160&fit=crop',
    'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=400&h=160&fit=crop',
];

function getRandomDefaultImage() {
    return defaultEventImages[Math.floor(Math.random() * defaultEventImages.length)];
}

async function fetchDatabaseData() {
    try {
        const response = await fetch('obtener_eventos.php'); 
        if (!response.ok) {
            console.error("Error al obtener datos del servidor:", response.statusText);
            throw new Error('Error al cargar la base de datos desde PHP.');
        }
        
        const eventsData = await response.json();
        console.log('Eventos recibidos:', eventsData); // DEBUG
        
        return {
            events: eventsData.events || [], 
            participants: [], 
            payments: [],     
            assistances: []   
        };

    } catch (e) {
        console.error("Fallo al obtener datos del servidor:", e);
        return { events: [], participants: [], payments: [], assistances: [] };
    }
}

async function loadDatabase() {
    console.log('Cargando base de datos...'); // DEBUG
    const data = await fetchDatabaseData();
    db = data;
    console.log('Base de datos cargada:', db); // DEBUG
    loadEvents();
}

// ===============================================
// 2. FUNCIONES DE NAVEGACIÓN Y UTILIDAD
// ===============================================

function navigate(screenId, navElement = null, eventId = null) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    activeEventId = eventId;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (navElement) {
        navElement.classList.add('active');
    } else {
        if (screenId.includes('event') && screenId !== 'screen-events') {
            const eventsNav = document.querySelector('.nav-item[onclick*="screen-events"]');
            if (eventsNav) eventsNav.classList.add('active');
        } else if (screenId.includes('payment')) {
            const paymentsNav = document.querySelector('.nav-item[onclick*="screen-payments"]');
            if (paymentsNav) paymentsNav.classList.add('active');
        } else if (screenId.includes('assistance')) {
            const assistNav = document.querySelector('.nav-item[onclick*="screen-assistances"]');
            if (assistNav) assistNav.classList.add('active');
        }
    }

    if (screenId === 'screen-events') loadEvents();
    if (screenId === 'screen-event-details' && eventId) loadEventDetails(eventId);
    if (screenId === 'screen-payments') loadPayments(currentPaymentFilter);
    if (screenId === 'screen-assistances') loadAssistances();
}

function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day} de ${getMonthName(parseInt(month))} de ${year}`;
}

function getMonthName(month) {
    const names = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return names[month - 1];
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'pending';
        case 'processing': return 'processing';
        case 'confirmed': return 'confirmed';
        case 'overdue': return 'pending';
        default: return 'default';
    }
}

// ===============================================
// 3. CARGA DE DATOS EN PANTALLAS - EVENTOS
// ===============================================

function loadEvents(events = db.events) {
    console.log('loadEvents llamado con:', events); // DEBUG
    const listContainer = document.getElementById('events-list');
    
    if (!listContainer) {
        console.error('No se encontró el contenedor events-list');
        return;
    }
    
    if (!events || events.length === 0) {
        listContainer.innerHTML = '<p class="text-text-light text-center mt-8">No hay eventos disponibles. ¡Crea tu primer evento!</p>';
        return;
    }
    
    listContainer.innerHTML = events.map(event => {
        let imageUrl = event.imageUrl;
        if (!imageUrl || imageUrl.includes('placeholder') || imageUrl.includes('via.placeholder')) {
            imageUrl = getRandomDefaultImage();
        }
        
        return `
        <div class="event-card-item" onclick="navigate('screen-event-details', null, ${event.id})">
            <img src="${imageUrl}" alt="${event.title}" onerror="this.src='${getRandomDefaultImage()}'">
            <div class="event-card-details">
                <div class="event-card-title">${event.title}</div>
                <div class="event-card-info">${formatDate(event.date)}</div>
                <div class="event-card-info">${event.location}</div>
            </div>
        </div>
    `}).join('');
}

function filterEvents(query) {
    const filtered = db.events.filter(event => 
        event.title.toLowerCase().includes(query.toLowerCase()) || 
        event.location.toLowerCase().includes(query.toLowerCase()) ||
        event.description.toLowerCase().includes(query.toLowerCase())
    );
    loadEvents(filtered);
}

function loadEventDetails(eventId) {
    const event = db.events.find(e => e.id === eventId);
    if (!event) {
        alert('Evento no encontrado.');
        navigate('screen-events');
        return;
    }

    let imageUrl = event.imageUrl;
    if (!imageUrl || imageUrl.includes('placeholder') || imageUrl.includes('via.placeholder')) {
        imageUrl = getRandomDefaultImage();
    }

    document.getElementById('event-details-title-header').innerText = event.title;
    document.getElementById('event-details-image').src = imageUrl;
    document.getElementById('event-details-image').onerror = function() {
        this.src = getRandomDefaultImage();
    };
    document.getElementById('event-details-title').innerText = event.title;
    document.getElementById('event-details-date-location').innerText = `${formatDate(event.date)} ${event.time} • ${event.location}`;
    document.getElementById('event-details-address').innerText = event.address;

    // Usar los participantes que vienen desde la BD
    const registeredCount = event.registeredParticipants || 0;

    document.getElementById('event-capacity').innerText = event.capacity === 0 ? 'Ilimitada' : event.capacity;

    // Calcular disponibles correctamente
    if (event.capacity === 0) {
        document.getElementById('event-available-spots').innerText = 'Ilimitada';
    } else {
        const availableSpots = event.capacity - registeredCount;
        document.getElementById('event-available-spots').innerText = availableSpots >= 0 ? availableSpots : '0';
    }

    document.getElementById('event-price').innerText = event.costPerPerson === 0 ? 'Gratis' : formatCurrency(event.costPerPerson);
    document.getElementById('event-details-description').innerText = event.description;
    document.getElementById('event-details-datetime').innerText = `${formatDate(event.date)} a las ${event.time}`;
    document.getElementById('event-details-location').innerText = event.location;
    document.getElementById('event-details-full-address').innerText = event.address;

    // 🆕 GENERAR BOTONES DINÁMICAMENTE SEGÚN PERMISOS
    // 🆕 GENERAR BOTONES DINÁMICAMENTE SEGÚN PERMISOS
    const actionButtonsContainer = document.getElementById('event-action-buttons');
    if (actionButtonsContainer) {
        let buttonsHTML = `
            <button onclick="manageEventAdmin()" class="event-action-button">
                <i class="fas fa-dollar-sign"></i> 
                <span>Administrar</span>
            </button>
            <button onclick="generateReport()" class="event-action-button">
                <i class="fas fa-chart-pie"></i> 
                <span>Reportes</span>
            </button>
        `;
        
        // Solo mostrar botones de admin si es administrador
        if (event.isAdmin) {
            buttonsHTML += `
                <button onclick="editCurrentEvent()" class="event-action-button">
                    <i class="fas fa-edit"></i> 
                    <span>Editar Evento</span>
                </button>
                <button onclick="confirmDeleteEvent()" class="event-action-button event-action-button-danger">
                    <i class="fas fa-trash-alt"></i> 
                    <span>Eliminar Evento</span>
                </button>
                <button onclick="showTransferAdminModal()" class="event-action-button" style="grid-column: span 2;">
                    <i class="fas fa-user-shield"></i> 
                    <span>Transferir Admin</span>
                </button>
            `;
        } else {
            buttonsHTML += `
                <button class="event-action-button opacity-50 cursor-not-allowed" disabled title="Solo el administrador puede editar">
                    <i class="fas fa-lock"></i> 
                    <span>Solo Admin</span>
                </button>
            `;
        }
        
        actionButtonsContainer.innerHTML = buttonsHTML;
    }

    // Cargar participantes desde la API
// ========== CARGAR PARTICIPANTES ==========
    async function loadParticipants() {
        console.log('🔄 Cargando participantes para evento:', eventId);
        
        try {
            const response = await fetch(`obtener_participantes.php?event_id=${eventId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const text = await response.text();
            console.log('📥 Respuesta:', text.substring(0, 200) + '...');
            
            const result = JSON.parse(text);
            console.log('📦 Resultado:', result);
            
            const eventParticipantsList = document.getElementById('event-details-participants-list');
            
            if (!eventParticipantsList) {
                console.error('❌ No se encontró el elemento event-details-participants-list');
                return;
            }
            
            if (result.success && result.participants && result.participants.length > 0) {
                console.log(`✅ ${result.participants.length} participantes encontrados`);
                
                // Guardar globalmente para el filtro
                window.currentEventParticipants = result.participants;
                
                // Renderizar participantes
                eventParticipantsList.innerHTML = result.participants.map(p => `
                    <div class="event-participant-row">
                        <div class="flex items-center gap-3">
                            <img 
                                src="${p.profilePic}" 
                                alt="${p.name}" 
                                class="w-8 h-8 rounded-full object-cover"
                                onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff'"
                            >
                            <div>
                                <span class="text-white text-sm font-medium">${p.name}</span>
                                <span class="text-text-light text-xs block">${p.email}</span>
                            </div>
                        </div>
                        <span class="status-badge ${p.confirmed ? 'confirmed' : 'pending'}">
                            ${p.confirmed ? '✓ Confirmado' : '⏳ Pendiente'}
                        </span>
                        <span class="status-badge ${p.paid ? 'confirmed' : 'default'}">
                            ${p.paid ? '💳 Pagado' : '⚠️ No Pagado'}
                        </span>
                    </div>
                `).join('');
                
            } else {
                console.log('ℹ️ No hay participantes');
                window.currentEventParticipants = [];
                eventParticipantsList.innerHTML = `
                    <p class="text-text-light text-center mt-4">
                        No hay participantes inscritos aún para este evento.
                    </p>
                `;
            }
            
        } catch (error) {
            console.error('❌ Error cargando participantes:', error);
            const eventParticipantsList = document.getElementById('event-details-participants-list');
            if (eventParticipantsList) {
                eventParticipantsList.innerHTML = `
                    <p class="text-red-400 text-center mt-4">
                        Error: ${error.message}
                    </p>
                `;
            }
        }
    }
    
    // Llamar a la función
    loadParticipants();
    // ========== FIN CARGAR PARTICIPANTES ==========
}

function filterEventParticipants(query) {
    console.log('🔍 Filtrando:', query);
    
    if (!window.currentEventParticipants || window.currentEventParticipants.length === 0) {
        console.log('⚠️ No hay participantes para filtrar');
        return;
    }
    
    const queryLower = query.toLowerCase().trim();
    
    const filtered = window.currentEventParticipants.filter(p => 
        p.name.toLowerCase().includes(queryLower) || 
        p.email.toLowerCase().includes(queryLower) ||
        (p.phone && p.phone.toLowerCase().includes(queryLower))
    );

    console.log(`📋 ${filtered.length} encontrados`);

    const eventParticipantsList = document.getElementById('event-details-participants-list');
    
    if (filtered.length === 0) {
        eventParticipantsList.innerHTML = `
            <p class="text-text-light text-center mt-4">
                No se encontraron participantes.
            </p>
        `;
    } else {
        eventParticipantsList.innerHTML = filtered.map(p => `
            <div class="event-participant-row">
                <div class="flex items-center gap-3">
                    <img 
                        src="${p.profilePic}" 
                        alt="${p.name}" 
                        class="w-8 h-8 rounded-full object-cover"
                        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=6366f1&color=fff'"
                    >
                    <div>
                        <span class="text-white text-sm font-medium">${p.name}</span>
                        <span class="text-text-light text-xs block">${p.email}</span>
                    </div>
                </div>
                <span class="status-badge ${p.confirmed ? 'confirmed' : 'pending'}">
                    ${p.confirmed ? '✓ Confirmado' : '⏳ Pendiente'}
                </span>
                <span class="status-badge ${p.paid ? 'confirmed' : 'default'}">
                    ${p.paid ? '💳 Pagado' : '⚠️ No Pagado'}
                </span>
            </div>
        `).join('');
    }
}

// ===============================================
// SISTEMA DE PAGOS CON FILTROS
// ===============================================

let currentPaymentFilter = 'all';
let allPayments = [];
let filteredPayments = [];

async function loadPayments(filter = 'all') {
    console.log('Cargando pagos con filtro:', filter); // DEBUG
    currentPaymentFilter = filter;
    
    const loadingEl = document.getElementById('payments-loading');
    const listEl = document.getElementById('payments-list');
    const emptyEl = document.getElementById('payments-empty');
    
    if (!loadingEl || !listEl || !emptyEl) {
        console.error('Elementos de pagos no encontrados');
        return;
    }
    
    loadingEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    
    try {
        const response = await fetch(`obtener_pagos.php?filter=${filter}`);
        const result = await response.json();
        
        console.log('Respuesta de pagos:', result); // DEBUG
        
        if (result.success) {
            allPayments = result.payments;
            filteredPayments = allPayments;
            
            updatePaymentStats(result.stats);
            renderPayments(filteredPayments);
            
            loadingEl.classList.add('hidden');
            
            if (filteredPayments.length === 0) {
                emptyEl.classList.remove('hidden');
            } else {
                listEl.classList.remove('hidden');
            }
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error al cargar pagos:', error);
        loadingEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        alert('Error al cargar los pagos: ' + error.message);
    }
}

function updatePaymentStats(stats) {
    const confirmedEl = document.getElementById('stat-confirmed');
    const pendingEl = document.getElementById('stat-pending');
    const overdueEl = document.getElementById('stat-overdue');
    
    if (confirmedEl) confirmedEl.textContent = stats.confirmed;
    if (pendingEl) pendingEl.textContent = stats.pending;
    if (overdueEl) overdueEl.textContent = stats.overdue;
    
    const pendingBadge = document.getElementById('pending-badge');
    const totalPending = stats.pending + stats.overdue;
    if (pendingBadge) {
        if (totalPending > 0) {
            pendingBadge.textContent = totalPending;
            pendingBadge.classList.remove('hidden');
        } else {
            pendingBadge.classList.add('hidden');
        }
    }
    
    const statsEl = document.getElementById('payment-stats');
    if (statsEl) {
        if (currentPaymentFilter === 'all') {
            statsEl.classList.remove('hidden');
        } else {
            statsEl.classList.add('hidden');
        }
    }
}

function renderPayments(payments) {
    const listContainer = document.getElementById('payments-list');
    
    if (!listContainer) return;
    
    if (payments.length === 0) {
        const emptyEl = document.getElementById('payments-empty');
        if (emptyEl) emptyEl.classList.remove('hidden');
        listContainer.classList.add('hidden');
        return;
    }
    
    listContainer.innerHTML = payments.map(payment => {
        const statusClass = getStatusClass(payment.actual_status);
        const statusText = getStatusText(payment.actual_status);
        const statusIcon = getStatusIcon(payment.actual_status);
        
        const paymentDate = formatDate(payment.payment_date);
        const dueDate = payment.due_date ? formatDate(payment.due_date) : null;
        
        let dateDisplay = paymentDate;
        if (payment.actual_status === 'pending' || payment.actual_status === 'overdue') {
            dateDisplay = dueDate ? `Vence: ${dueDate}` : paymentDate;
        }
        
        let overdueAlert = '';
        if (payment.actual_status === 'overdue' && payment.days_overdue) {
            overdueAlert = `<span class="text-xs text-red-400 mt-1 block"><i class="fas fa-exclamation-triangle"></i> Vencido hace ${payment.days_overdue} días</span>`;
        } else if (payment.days_until_due && payment.days_until_due <= 3) {
            overdueAlert = `<span class="text-xs text-yellow-400 mt-1 block"><i class="fas fa-clock"></i> Vence en ${payment.days_until_due} días</span>`;
        }
        
        return `
            <div class="list-card payment-list-item cursor-pointer" data-status="${payment.actual_status}" onclick="showPaymentDetail(${payment.id})">
                <div class="flex items-start gap-3 flex-1">
                    ${payment.participant_pic ? 
                        `<img src="${payment.participant_pic}" class="w-12 h-12 rounded-full object-cover" alt="${payment.participant_name}">` : 
                        `<div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <i class="fas fa-user text-gray-400"></i>
                        </div>`
                    }
                    <div class="flex-1">
                        <div class="font-bold text-white">${payment.participant_name}</div>
                        <div class="text-sm text-text-light">${payment.payment_type} • ${payment.event_title}</div>
                        <div class="text-xs text-text-light mt-1">${dateDisplay}</div>
                        ${overdueAlert}
                        ${payment.payment_method ? `<span class="text-xs text-text-light mt-1 block"><i class="fas fa-credit-card"></i> ${payment.payment_method}</span>` : ''}
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span class="text-lg font-bold text-white">${formatCurrency(payment.amount)}</span>
                    <span class="status-badge ${statusClass}">
                        <i class="${statusIcon}"></i> ${statusText}
                    </span>
                </div>
            </div>
        `;
    }).join('');
}

function filterPaymentsByTab(filter, tabElement) {
    document.querySelectorAll('.payment-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    tabElement.classList.add('active');
    
    loadPayments(filter);
}

function searchPayments(query) {
    if (!query.trim()) {
        filteredPayments = allPayments;
    } else {
        const lowerQuery = query.toLowerCase();
        filteredPayments = allPayments.filter(payment => 
            payment.participant_name.toLowerCase().includes(lowerQuery) ||
            payment.payment_type.toLowerCase().includes(lowerQuery) ||
            payment.event_title.toLowerCase().includes(lowerQuery) ||
            (payment.payment_method && payment.payment_method.toLowerCase().includes(lowerQuery))
        );
    }
    
    renderPayments(filteredPayments);
}

function togglePaymentFilters() {
    const filtersEl = document.getElementById('advanced-filters');
    if (filtersEl) filtersEl.classList.toggle('hidden');
}

function applyAdvancedFilters() {
    const checkboxes = document.querySelectorAll('#advanced-filters input[type="checkbox"]:checked');
    const selectedStatuses = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedStatuses.length === 0) {
        filteredPayments = [];
    } else {
        filteredPayments = allPayments.filter(payment => 
            selectedStatuses.includes(payment.actual_status)
        );
    }
    
    renderPayments(filteredPayments);
}

function showPaymentDetail(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const statusClass = getStatusClass(payment.actual_status);
    const statusText = getStatusText(payment.actual_status);
    
    const modalBody = document.getElementById('payment-detail-body');
    if (!modalBody) return;
    
    // ✅ CORRECCIÓN: Validar y formatear URL del comprobante
    let proofImageHtml = '';
    if (payment.proof_image && payment.proof_image.trim() !== '') {
        let imageUrl = payment.proof_image;
        
        // Si es una ruta relativa (uploads/proofs/...), dejarla así
        // Si es base64, también funcionará
        // Si es URL completa (https://...), también funcionará
        
        proofImageHtml = `
        <div class="mt-4">
            <div class="text-sm font-semibold text-white mb-2">
                <i class="fas fa-receipt mr-2"></i>Comprobante de Pago
            </div>
            <div class="bg-gray-900 p-2 rounded-lg">
                <img 
                    src="${imageUrl}" 
                    class="w-full rounded-lg cursor-pointer hover:opacity-90 transition" 
                    alt="Comprobante"
                    onclick="openImageInNewTab('${imageUrl}')"
                    onerror="handleProofImageError(this)"
                    style="max-height: 400px; object-fit: contain;"
                >
            </div>
            <p class="text-xs text-text-light mt-2 text-center">
                <i class="fas fa-search-plus mr-1"></i>Click en la imagen para ampliar
            </p>
        </div>`;
    } else {
        proofImageHtml = `
        <div class="mt-4 bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
            <i class="fas fa-file-invoice text-gray-600 text-3xl mb-2"></i>
            <p class="text-text-light text-sm">Sin comprobante adjunto</p>
        </div>`;
    }
    
    modalBody.innerHTML = `
        <div class="space-y-4">
            <div class="text-center pb-4 border-b border-border-color">
                <div class="text-sm text-text-light mb-2">${formatDate(payment.payment_date)} • ${payment.payment_type}</div>
                <div class="text-3xl font-bold text-white mb-2">${formatCurrency(payment.amount)}</div>
                <span class="status-badge ${statusClass} text-base">${statusText}</span>
            </div>
            
            <div class="space-y-3">
                <div class="detail-row">
                    <span class="detail-label">Evento</span>
                    <span class="detail-value">${payment.event_title}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Participante</span>
                    <span class="detail-value">${payment.participant_name}</span>
                </div>
                ${payment.participant_email ? `
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${payment.participant_email}</span>
                </div>` : ''}
                ${payment.participant_phone ? `
                <div class="detail-row">
                    <span class="detail-label">Teléfono</span>
                    <span class="detail-value">${payment.participant_phone}</span>
                </div>` : ''}
                <div class="detail-row">
                    <span class="detail-label">Fecha de Pago</span>
                    <span class="detail-value">${formatDate(payment.payment_date)}</span>
                </div>
                ${payment.due_date ? `
                <div class="detail-row">
                    <span class="detail-label">Vencimiento</span>
                    <span class="detail-value">${formatDate(payment.due_date)}</span>
                </div>` : ''}
                ${payment.payment_method ? `
                <div class="detail-row">
                    <span class="detail-label">Método</span>
                    <span class="detail-value">${payment.payment_method}</span>
                </div>` : ''}
                ${payment.notes ? `
                <div class="detail-row">
                    <span class="detail-label">Notas</span>
                    <span class="detail-value">${payment.notes}</span>
                </div>` : ''}
            </div>
            
            ${proofImageHtml}
            
            <div class="flex gap-3 mt-6">
                ${payment.actual_status === 'pending' || payment.actual_status === 'overdue' ? `
                <button onclick="markPaymentAsPaid(${payment.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition">
                    <i class="fas fa-check mr-2"></i>Marcar Pagado
                </button>` : ''}
                <button onclick="closePaymentDetailModal()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.remove('hidden');
}

function closePaymentDetailModal() {
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.add('hidden');
}

async function markPaymentAsPaid(paymentId) {
    if (!confirm('¿Marcar este pago como pagado?')) return;
    
    try {
        const response = await fetch('actualizar_pago.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                payment_id: paymentId,
                status: 'confirmed'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Pago marcado como pagado');
            closePaymentDetailModal();
            loadPayments(currentPaymentFilter);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Pendiente';
        case 'processing': return 'Procesando';
        case 'confirmed': return 'Pagado';
        case 'overdue': return 'Vencido';
        default: return status;
    }
}

function getStatusIcon(status) {
    switch(status) {
        case 'pending': return 'fas fa-clock';
        case 'processing': return 'fas fa-spinner';
        case 'confirmed': return 'fas fa-check-circle';
        case 'overdue': return 'fas fa-exclamation-triangle';
        default: return 'fas fa-circle';
    }
}

// ===============================================
// RESTO DE FUNCIONES (Asistencias, etc)
// ===============================================

// ===============================================
// SISTEMA DE ASISTENCIAS
// ===============================================

let allAssistances = [];
let filteredAssistances = [];

async function loadAssistances() {
    const loadingContainer = document.getElementById('assistances-list');
    if (!loadingContainer) return;
    
    loadingContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-4xl text-accent-blue"></i><p class="text-text-light mt-2">Cargando asistencias...</p></div>';
    
    try {
        const response = await fetch('obtener_asistencias.php');
        const result = await response.json();
        
        if (result.success) {
            allAssistances = result.assistances;
            filteredAssistances = allAssistances;
            renderAssistances(filteredAssistances);
        } else {
            loadingContainer.innerHTML = '<p class="text-text-light text-center mt-8">Error al cargar asistencias: ' + result.message + '</p>';
        }
    } catch (error) {
        console.error('Error:', error);
        loadingContainer.innerHTML = '<p class="text-text-light text-center mt-8">Error de conexión al cargar asistencias.</p>';
    }
}

function renderAssistances(assistances) {
    const listContainer = document.getElementById('assistances-list');
    if (!listContainer) return;
    
    if (assistances.length === 0) {
        listContainer.innerHTML = '<p class="text-text-light text-center mt-8">No hay asistencias registradas aún.</p>';
        return;
    }
    
    listContainer.innerHTML = assistances.map(a => {
        const statusClass = a.state === 'CONFIRMADO' ? 'confirmed' : 'pending';
        const paidClass = a.participant_paid ? 'confirmed' : 'default';
        const confirmedClass = a.participant_confirmed ? 'confirmed' : 'pending';
        
        return `
            <div class="list-card border-l-4 ${statusClass === 'confirmed' ? 'border-green-500' : 'border-yellow-500'} cursor-pointer" onclick="showAssistanceDetail(${a.id})">
                <div class="flex items-start gap-3 flex-1">
                    ${a.participant_pic ? 
                        `<img src="${a.participant_pic}" class="w-12 h-12 rounded-full object-cover" alt="${a.participant_name}">` : 
                        `<div class="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <i class="fas fa-user text-gray-400"></i>
                        </div>`
                    }
                    <div class="flex-1">
                        <div class="font-bold text-white">${a.participant_name}</div>
                        <div class="text-sm text-text-light">${a.participant_email}</div>
                        <div class="text-xs text-text-light mt-1">
                            <i class="fas fa-calendar"></i> ${a.event_title}
                        </div>
                        <div class="text-xs text-text-light">
                            <i class="fas fa-user-check"></i> Confirmado por: ${a.confirmed_by}
                        </div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span class="status-badge ${statusClass}">${a.state}</span>
                    <span class="status-badge ${paidClass} text-xs">${a.participant_paid ? 'Pagado' : 'No Pagado'}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterAssistances(query) {
    if (!query.trim()) {
        filteredAssistances = allAssistances;
    } else {
        const lowerQuery = query.toLowerCase();
        filteredAssistances = allAssistances.filter(a => 
            a.participant_name.toLowerCase().includes(lowerQuery) ||
            a.participant_email.toLowerCase().includes(lowerQuery) ||
            a.event_title.toLowerCase().includes(lowerQuery) ||
            a.confirmed_by.toLowerCase().includes(lowerQuery)
        );
    }
    renderAssistances(filteredAssistances);
}

function showAssistanceDetail(assistanceId) {
    const assistance = allAssistances.find(a => a.id === assistanceId);
    if (!assistance) return;
    
    const statusClass = assistance.state === 'CONFIRMADO' ? 'confirmed' : 'pending';
    
    const modalContent = `
        <div class="space-y-4">
            <div class="text-center pb-4 border-b border-border-color">
                <div class="text-sm text-text-light mb-2">${assistance.event_title}</div>
                <div class="text-2xl font-bold text-white mb-2">${assistance.participant_name}</div>
                <span class="status-badge ${statusClass} text-base">${assistance.state}</span>
            </div>
            
            <div class="space-y-3">
                <div class="detail-row">
                    <span class="detail-label">Email</span>
                    <span class="detail-value">${assistance.participant_email}</span>
                </div>
                ${assistance.participant_phone ? `
                <div class="detail-row">
                    <span class="detail-label">Teléfono</span>
                    <span class="detail-value">${assistance.participant_phone}</span>
                </div>` : ''}
                <div class="detail-row">
                    <span class="detail-label">Evento</span>
                    <span class="detail-value">${assistance.event_title}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Fecha Evento</span>
                    <span class="detail-value">${formatDate(assistance.event_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ubicación</span>
                    <span class="detail-value">${assistance.location}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Confirmado por</span>
                    <span class="detail-value">${assistance.confirmed_by}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Pagado</span>
                    <span class="detail-value">${assistance.participant_paid ? 'Sí' : 'No'}</span>
                </div>
            </div>
            
            ${assistance.proof_image ? `
            <div class="mt-4">
                <div class="text-sm font-semibold text-white mb-2">Comprobante</div>
                <img src="${assistance.proof_image}" class="w-full rounded-lg" alt="Comprobante">
            </div>` : ''}
            
            <div class="flex gap-3 mt-6">
                ${assistance.state === 'PENDIENTE' ? `
                <button onclick="confirmAssistance(${assistance.id})" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition">
                    <i class="fas fa-check mr-2"></i>Confirmar
                </button>` : ''}
                <button onclick="closeAssistanceDetailModal()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('payment-detail-modal');
    if (modal) {
        document.getElementById('payment-detail-body').innerHTML = modalContent;
        modal.classList.remove('hidden');
    }
}

function closeAssistanceDetailModal() {
    const modal = document.getElementById('payment-detail-modal');
    if (modal) modal.classList.add('hidden');
}

async function confirmAssistance(assistanceId) {
    if (!confirm('¿Confirmar esta asistencia?')) return;
    
    try {
        const response = await fetch('confirmar_asistencia.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                assistance_id: assistanceId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Asistencia confirmada');
            closeAssistanceDetailModal();
            loadAssistances();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión');
    }
}

// ===============================================
// FORMULARIOS
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando app...'); // DEBUG
    loadDatabase();
    
    // Formulario crear evento
const createEventForm = document.getElementById('form-create-event');
if (createEventForm) {
    createEventForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // 🆕 Usar FormData para obtener todos los valores
        const form = e.target;
        
        const formData = {
            title: form.querySelector('#event-title').value,
            description: form.querySelector('#event-description').value,
            date: form.querySelector('#event-date').value,
            time: form.querySelector('#event-time').value,
            location: form.querySelector('#event-location').value,
            address: form.querySelector('#event-address').value,
            cost: form.querySelector('#event-cost').value,
            capacity: form.querySelector('#event-capacity').value,
            reminderDays: form.querySelector('#reminder-days')?.value || 0
        };
        
        console.log('🔍 Form data capturado:', formData);
        console.log('🔍 Capacity:', formData.capacity);

        const imageFile = form.querySelector('#event-image').files[0];
        let imageUrl = getRandomDefaultImage();
        
        if (imageFile) {
            const reader = new FileReader();
            reader.onloadend = async function() {
                imageUrl = reader.result;
                await saveEvent(formData, imageUrl);
            };
            reader.readAsDataURL(imageFile);
        } else {
            await saveEvent(formData, imageUrl);
        }
    });
}
    
    // Preview imagen evento
    const eventImageInput = document.getElementById('event-image');
    if (eventImageInput) {
        eventImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('image-preview');
                    const container = document.getElementById('image-preview-container');
                    if (preview && container) {
                        preview.src = event.target.result;
                        container.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    // 🆕 RESETEAR MODO EDICIÓN cuando se navega a crear evento desde el botón principal
    const createEventBtn = document.querySelector('[onclick*="screen-create-event"]');
    if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
            if (currentScreen !== 'screen-create-event') {
                editingEventId = null;
                
                const screenHeader = document.querySelector('#screen-create-event .screen-header h2');
                if (screenHeader) {
                    screenHeader.innerHTML = '<i class="fas fa-arrow-left text-lg mr-3 cursor-pointer" onclick="navigate(\'screen-events\')"></i> Crear Nuevo Evento';
                }
                
                const submitButton = document.querySelector('#form-create-event button[type="submit"]');
                if (submitButton) {
                    submitButton.innerHTML = 'Crear Evento';
                }
            }
        });
    }
    
    // ===============================================
    // FORMULARIO CONFIRMAR ASISTENCIA
    // ===============================================
    const confirmAssistanceForm = document.getElementById('form-confirm-assistance');
    if (confirmAssistanceForm) {
        confirmAssistanceForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('assistance-name').value;
            const email = document.getElementById('assistance-email').value;
            
            // Verificar que haya un evento activo
            if (!activeEventId) {
                alert('❌ Por favor, selecciona un evento primero desde la pantalla de eventos.');
                return;
            }
            
            // Manejar comprobante de pago (opcional)
            const proofFile = document.getElementById('assistance-payment-proof').files[0];
            let proofImage = null;
            
            const submitButton = confirmAssistanceForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Registrando...';
            
            const processSubmit = async (imageData = null) => {
                try {
                    const formData = new URLSearchParams({
                        name: name,
                        email: email,
                        event_id: activeEventId
                    });
                    
                    if (imageData) {
                        formData.append('proof_image', imageData);
                    }
                    
                    const response = await fetch('guardar_asistencia.php', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        alert(`✅ ${result.message}`);
                        confirmAssistanceForm.reset();
                        // Recargar lista de asistencias si estamos en esa pantalla
                        if (currentScreen === 'screen-assistances') {
                            loadAssistances();
                        }
                        // Volver a la pantalla de eventos
                        navigate('screen-events');
                    } else {
                        alert(`❌ Error: ${result.message}`);
                    }
                } catch (error) {
                    console.error('Error:', error);
                    alert('❌ Error de conexión. Intenta nuevamente.');
                } finally {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Asistencia';
                }
            };
            
            // Si hay archivo, leerlo como base64
            if (proofFile) {
                const reader = new FileReader();
                reader.onloadend = async function() {
                    await processSubmit(reader.result);
                };
                reader.readAsDataURL(proofFile);
            } else {
                await processSubmit();
            }
        });
    }
    // ===============================================
    // SECCIÓN 3: FUNCIONES PARA REGISTRAR PAGOS
    // ===============================================
    
    // Cargar eventos en selector de pagos
    const paymentEventSelect = document.getElementById('payment-event');
    if (paymentEventSelect) {
        function loadEventOptions() {
            if (!db.events || db.events.length === 0) {
                paymentEventSelect.innerHTML = '<option value="">No hay eventos disponibles</option>';
                return;
            }
            
            paymentEventSelect.innerHTML = '<option value="">Seleccionar evento...</option>' +
                db.events.map(event => 
                    `<option value="${event.id}">${event.title} - ${formatDate(event.date)}</option>`
                ).join('');
        }
        
        // Cargar eventos cuando se navega a la pantalla
        const paymentScreen = document.getElementById('screen-register-payment');
        if (paymentScreen) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.classList.contains('active')) {
                        loadEventOptions();
                        const today = new Date().toISOString().split('T')[0];
                        const dateInput = document.getElementById('payment-date');
                        if (dateInput) dateInput.value = today;
                    }
                });
            });
            
            observer.observe(paymentScreen, { attributes: true, attributeFilter: ['class'] });
        }
    }
    
    // Preview de comprobante de pago
    const proofInput = document.getElementById('payment-proof');
    if (proofInput) {
        proofInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('proof-preview');
                    const container = document.getElementById('proof-preview-container');
                    if (preview && container) {
                        preview.src = event.target.result;
                        container.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Formulario de registro de pago
const registerPaymentForm = document.getElementById('form-register-payment');
if (registerPaymentForm) {
    registerPaymentForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // ✅ USAR FormData PARA ENVIAR ARCHIVOS
        const formData = new FormData();
        
        formData.append('event_id', document.getElementById('payment-event').value);
        formData.append('participant_name', document.getElementById('payment-participant-name').value);
        formData.append('participant_email', document.getElementById('payment-participant-email').value);
        formData.append('participant_phone', document.getElementById('payment-participant-phone').value);
        formData.append('amount', document.getElementById('payment-amount').value);
        formData.append('payment_type', document.getElementById('payment-type').value);
        formData.append('payment_method', document.getElementById('payment-method').value);
        formData.append('status', document.getElementById('payment-status').value);
        formData.append('payment_date', document.getElementById('payment-date').value);
        formData.append('due_date', document.getElementById('payment-due-date').value);
        formData.append('notes', document.getElementById('payment-notes').value);
        
        // ✅ AGREGAR ARCHIVO DE COMPROBANTE
        const proofFile = document.getElementById('payment-proof').files[0];
        if (proofFile) {
            console.log('📎 Adjuntando comprobante:', proofFile.name, '(' + (proofFile.size/1024).toFixed(2) + 'KB)');
            formData.append('proof_image', proofFile);
        } else {
            console.log('ℹ️ Sin comprobante adjunto');
        }
        
        // Deshabilitar botón mientras se procesa
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Registrando...';
        
        try {
            const response = await fetch('registrar_pago.php', {
                method: 'POST',
                body: formData
                // ⚠️ NO incluir Content-Type header cuando usas FormData
            });
            
            const result = await response.json();
            
            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                alert('✅ ' + result.message);
                registerPaymentForm.reset();
                document.getElementById('proof-preview-container').classList.add('hidden');
                navigate('screen-payments');
                loadPayments(currentPaymentFilter);
            } else {
                alert('❌ Error: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            alert('❌ Error al registrar el pago');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });}
});
async function saveEvent(data, imageUrl) {  
    try {
        data.imageUrl = imageUrl;
        
        // Si estamos editando, agregar el ID del evento
        if (editingEventId) {
            data.event_id = editingEventId;
        }
        
        console.log('📤 Datos a enviar:', data);
        
        const response = await fetch('guardar_evento.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded', 
            },
            body: new URLSearchParams(data),
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);
        
        const text = await response.text();
        console.log('📄 Response RAW (primeros 500 chars):', text.substring(0, 500));
        
        if (!text) {
            alert('❌ Error: Respuesta vacía del servidor.');
            return;
        }

        // Intentar limpiar el texto antes de parsear
        let cleanText = text.trim();
        
        // Si empieza con <, es HTML
        if (cleanText.startsWith('<')) {
            console.error('❌ El servidor devolvió HTML, no JSON:', cleanText);
            alert('❌ Error del servidor. Revisa la consola para ver el HTML completo.');
            return;
        }

        let result;
        try {
            result = JSON.parse(cleanText);
            console.log('✅ Response parsed:', result);
        } catch (parseError) {
            console.error('❌ Error parsing JSON:', parseError);
            console.error('Raw text completo:', text);
            alert('❌ Error: Respuesta inválida del servidor.\n\n' + text.substring(0, 200));
            return;
        }

        if (result.success) {
            alert(`✅ ${result.message}`);
            
            // Resetear el modo de edición
            editingEventId = null;
            
            // Restaurar el título del formulario
            const screenHeader = document.querySelector('#screen-create-event .screen-header h2');
            if (screenHeader) {
                screenHeader.innerHTML = '<i class="fas fa-arrow-left text-lg mr-3 cursor-pointer" onclick="navigate(\'screen-events\')"></i> Crear Nuevo Evento';
            }
            
            // Restaurar el botón
            const submitButton = document.querySelector('#form-create-event button[type="submit"]');
            if (submitButton) {
                submitButton.innerHTML = 'Crear Evento';
            }
            
            document.getElementById('form-create-event').reset();
            const previewContainer = document.getElementById('image-preview-container');
            if (previewContainer) previewContainer.classList.add('hidden');
            
            await loadDatabase(); 
            navigate('screen-events');
        } else {
            alert(`❌ Error: ${result.message}`);
            console.error('Error del servidor:', result.message);
        }
    } catch (error) {
        console.error('❌ Error crítico:', error);
        console.error('Stack:', error.stack);
        alert('❌ Error crítico: ' + error.message + '\n\nRevisa la consola para más detalles.');
    }
}

function manageEventAdmin() {
    alert(`Simulación: Administrar Evento ID ${activeEventId}.`);
}

function controlEventAssistance() {
    alert(`Simulación: Control de Asistencia para Evento ID ${activeEventId}.`);
}

function editCurrentEvent() {
    const event = db.events.find(e => e.id === activeEventId);
    if (!event) {
        alert('No hay evento activo para editar.');
        return;
    }
    // 🆕 Guardar el ID del evento que estamos editando
    editingEventId = activeEventId;
    
    // Cambiar el título del formulario
    const screenHeader = document.querySelector('#screen-create-event .screen-header h2');
    if (screenHeader) {
        screenHeader.innerHTML = '<i class="fas fa-arrow-left text-lg mr-3 cursor-pointer" onclick="cancelEditEvent()"></i> Editar Evento';
    }
    
    // Cambiar el texto del botón de submit
    const submitButton = document.querySelector('#form-create-event button[type="submit"]');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar Cambios';
    }

    // Cargar los datos del evento en el formulario
    document.getElementById('event-title').value = event.title;
    document.getElementById('event-description').value = event.description;
    document.getElementById('event-date').value = event.date;
    document.getElementById('event-time').value = event.time;
    document.getElementById('event-location').value = event.location;
    document.getElementById('event-address').value = event.address;
    document.getElementById('event-cost').value = event.costPerPerson;
    document.getElementById('event-capacity').value = event.capacity;
    
    
    const reminderInput = document.getElementById('reminder-days');
    if (reminderInput) reminderInput.value = event.reminderDays || 0;
    
    // Mostrar la imagen actual si existe
    if (event.imageUrl && !event.imageUrl.includes('placeholder')) {
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        if (preview && container) {
            preview.src = event.imageUrl;
            container.classList.remove('hidden');
        }
    }
    
    navigate('screen-create-event');
}
// 🆕 Función para cancelar la edición y volver a modo creación
function cancelEditEvent() {
    editingEventId = null;
    
    // Restaurar el título original
    const screenHeader = document.querySelector('#screen-create-event .screen-header h2');
    if (screenHeader) {
        screenHeader.innerHTML = '<i class="fas fa-arrow-left text-lg mr-3 cursor-pointer" onclick="navigate(\'screen-events\')"></i> Crear Nuevo Evento';
    }
    
    // Restaurar el texto del botón
    const submitButton = document.querySelector('#form-create-event button[type="submit"]');
    if (submitButton) {
        submitButton.innerHTML = 'Crear Evento';
    }
    
    // Limpiar el formulario
    document.getElementById('form-create-event').reset();
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) previewContainer.classList.add('hidden');
    
    navigate('screen-events');
}

// ===============================================
// RF5: RESUMEN DEL EVENTO
// ===============================================

async function generateReport() {
    // La variable activeEventId debe estar definida globalmente
    if (!activeEventId) {
        alert("❌ Seleccione un evento para generar el reporte.");
        return;
    }
    
    try {
        const response = await fetch(`obtener_resumen_evento.php?event_id=${activeEventId}`);
        const result = await response.json();
        
        if (result.success) {
            showEventSummaryModal(result);
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al generar el reporte');
    }
}

function showEventSummaryModal(data) {
    const modalBody = document.getElementById('event-summary-body');
    if (!modalBody) return;
    
    const event = data.event;
    const participants = data.participants;
    const payments = data.payments;
    const capacity = data.capacity;
    
    // Generación dinámica del contenido (Tu código original)
    modalBody.innerHTML = `
        <div class="space-y-6">
            <div class="text-center pb-4 border-b border-border-color">
                <h3 class="text-2xl font-bold text-white mb-2">${event.title}</h3>
                <p class="text-text-light">${formatDate(event.date)} • ${event.location}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-bg-card p-4 rounded-lg border border-border-color">
                    <div class="text-text-light text-sm mb-1">Participantes</div>
                    <div class="text-2xl font-bold text-white">${participants.total}</div>
                    <div class="text-xs text-text-light mt-1">
                        ${participants.confirmed} confirmados • ${participants.pending} pendientes
                    </div>
                </div>
                
                <div class="bg-bg-card p-4 rounded-lg border border-border-color">
                    <div class="text-text-light text-sm mb-1">Capacidad</div>
                    <div class="text-2xl font-bold text-white">${capacity.total}</div>
                    <div class="text-xs text-text-light mt-1">
                        ${capacity.available !== 'N/A' ? `${capacity.available} disponibles` : 'Ilimitada'}
                    </div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(112,71,235,0.2), rgba(147,51,234,0.2)); padding: 16px; border-radius: 12px; border: 1px solid rgba(112,71,235,0.3);">
                <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
                    <i class="fas fa-dollar-sign"></i> Resumen Financiero
                </h4>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-text-light">Pagos Confirmados</span>
                        <span class="font-bold text-lg" style="color: #10B981;">${formatCurrency(payments.confirmed)}</span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-text-light">Pagos Pendientes</span>
                        <span class="font-bold text-lg" style="color: #FACC15;">${formatCurrency(payments.pending)}</span>
                    </div>
                    
                    ${payments.processing > 0 ? `
                    <div class="flex justify-between items-center">
                        <span class="text-text-light">En Proceso</span>
                        <span class="font-bold text-lg" style="color: #3B82F6;">${formatCurrency(payments.processing)}</span>
                    </div>
                    ` : ''}
                    
                    <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                        <div class="flex justify-between items-center">
                            <span class="text-white font-semibold">Total Recaudado/Por Recaudar</span>
                            <span class="text-white font-bold text-xl">${formatCurrency(payments.total)}</span>
                        </div>
                    </div>
                    
                    ${capacity.potential_revenue > 0 ? `
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-text-light">Potencial Máximo</span>
                        <span class="text-text-light">${formatCurrency(capacity.potential_revenue)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-bg-card p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" 
                    style="border: 1px solid rgba(16,185,129,0.3);"
                    onclick="alert('✅ Confirmados:\\n' + '${data.payment_counts.names_confirmed || "Nadie"}')"
                    title="Ver nombres">
                    <div class="font-semibold mb-1 flex items-center gap-2" style="color: #10B981;">
                        <i class="fas fa-check-circle"></i> Confirmados
                    </div>
                    <div class="text-2xl font-bold text-white">${data.payment_counts.confirmed}</div>
                </div>
                
                <div class="bg-bg-card p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" 
                    style="border: 1px solid rgba(250,204,21,0.3);"
                    onclick="alert('⏳ Pendientes:\\n' + '${data.payment_counts.names_pending || "Nadie"}')"
                    title="Ver nombres">
                    <div class="font-semibold mb-1 flex items-center gap-2" style="color: #FACC15;">
                        <i class="fas fa-clock"></i> Pendientes
                    </div>
                    <div class="text-2xl font-bold text-white">${data.payment_counts.pending}</div>
                </div>
                
                ${data.payment_counts.overdue > 0 ? `
                <div class="bg-bg-card p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" 
                    style="border: 1px solid rgba(239,68,68,0.3);"
                    onclick="alert('⚠️ Vencidos:\\n' + '${data.payment_counts.names_overdue || "Nadie"}')"
                    title="Ver nombres">
                    <div class="font-semibold mb-1 flex items-center gap-2" style="color: #EF4444;">
                        <i class="fas fa-exclamation-triangle"></i> Vencidos
                    </div>
                    <div class="text-2xl font-bold text-white">${data.payment_counts.overdue}</div>
                </div>
                ` : ''}
                
                ${data.payment_counts.processing > 0 ? `
                <div class="bg-bg-card p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition" 
                    style="border: 1px solid rgba(59,130,246,0.3);"
                    onclick="alert('🔄 Procesando:\\n' + '${data.payment_counts.names_processing || "Nadie"}')"
                    title="Ver nombres">
                    <div class="font-semibold mb-1 flex items-center gap-2" style="color: #3B82F6;">
                        <i class="fas fa-spinner"></i> Procesando
                    </div>
                    <div class="text-2xl font-bold text-white">${data.payment_counts.processing}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="flex gap-3 pt-4">
                <button onclick="downloadEventReport()" class="flex-1 text-white py-3 rounded-lg font-semibold transition" style="background-color: var(--accent-blue);">
                    <i class="fas fa-download mr-2"></i>Descargar
                </button>
                <button onclick="closeEventSummaryModal()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition">
                    Cerrar
                </button>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('event-summary-modal');
    if (modal) modal.classList.remove('hidden'); // Muestra el modal
}

// 🛑 FUNCIÓN DE CIERRE DE RF5 (ASIGNADA AL BOTÓN 'X' Y 'CERRAR')
function closeEventSummaryModal() {
    const modal = document.getElementById('event-summary-modal');
    if (modal) modal.classList.add('hidden'); // Oculta el modal
}

// ===============================================
// RF6: PAGOS PENDIENTES ()
// ===============================================

function checkForPendingReminders(payments) {
    const container = document.getElementById('payment-reminders-container');
    if (!container) return;
    
    // Pagos que vencen en 3 días o menos, y que no estén vencidos
    const upcoming = payments.filter(p => 
        p.actual_status === 'pending' &&
        p.days_until_due !== null &&
        p.days_until_due <= 3 &&
        p.days_until_due >= 0 
    );

    if (upcoming.length > 0) {
        const count = upcoming.length;
        const message = count === 1
            ? 'Tienes 1 pago próximo a vencer.'
            : `Tienes ${count} pagos próximos a vencer.`;
        
        container.innerHTML = `
            <div class="reminder-banner" onclick="focusOnPending()">
                <i class="fas fa-bell fa-shake"></i>
                <div class="reminder-banner-content">
                    <div class="title">Atención Requerida</div>
                    <div class="message">${message}</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = ''; 
    }
}


function focusOnPending() {
    const pendingTab = document.querySelector('.payment-tab[data-filter="pending"]');
    if (pendingTab) {
        pendingTab.click();
    }
}


async function sendPaymentReminder(paymentId, button) {
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...`;
    
    try {
        const formData = new URLSearchParams();
        formData.append('payment_id', paymentId);
        
        // Asume que has creado 'api_enviar_recordatorio.php'
        const response = await fetch('api_enviar_recordatorio.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ ¡Recordatorio enviado!\n' + result.message);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Error al enviar recordatorio:', error);
        alert('❌ Error: ' + error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

const originalLoadPayments = window.loadPayments;

window.loadPayments = async function(filter) {
    
    if (originalLoadPayments) {
        await originalLoadPayments(filter);
    }
    
    if (window.allPayments) {
        checkForPendingReminders(allPayments);
    }
};

// 2. Envoltorio para showPaymentDetail
const originalShowPaymentDetail = window.showPaymentDetail;

window.showPaymentDetail = function(paymentId) {
    
    if (originalShowPaymentDetail) {
        originalShowPaymentDetail(paymentId);
    }
    
    if (!window.allPayments) return;
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;

    if (payment.actual_status === 'pending' || payment.actual_status === 'overdue') {
        
        const modalBody = document.getElementById('payment-detail-body');
        if (!modalBody) return;

        const buttonContainer = modalBody.querySelector('.flex.gap-3.mt-6');
        const closeButton = buttonContainer ? buttonContainer.querySelector('button[onclick="closePaymentDetailModal()"]') : null;
        
        const existingReminderButton = buttonContainer ? buttonContainer.querySelector('.bg-blue-600') : null;

        if (buttonContainer && closeButton && !existingReminderButton) {
            const reminderButton = document.createElement('button');
            reminderButton.className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition';
            reminderButton.innerHTML = `<i class="fas fa-paper-plane mr-2"></i>Enviar Recordatorio`;
            
            reminderButton.onclick = function() {
                sendPaymentReminder(paymentId, this);
            };
            
            buttonContainer.insertBefore(reminderButton, closeButton);
        }
    }
};




// ===============================================
// RF9: REPORTE MENSUAL
// ===============================================

/// ===============================================
// RF9: REPORTE MENSUAL (Código Final y Funcional)
// ===============================================

// 🛑 FUNCIÓN PRINCIPAL DE RF9 (ASIGNADA AL BOTÓN FLOTANTE) 🛑
async function showMonthlyReport() {
    const modal = document.getElementById('monthly-report-modal');
    if (!modal) return;
    
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    
    // 1. Muestra el modal (Quitando la clase 'hidden')
    modal.classList.remove('hidden');
    
    // 2. Inicia la carga real del reporte
    await loadMonthlyReport(month, year);
}

// 🛑 FUNCIÓN DE CIERRE DE RF9 (necesaria para el botón X) 🛑
function closeMonthlyReportModal() {
    const modal = document.getElementById('monthly-report-modal');
    if (modal) {
        modal.classList.add('hidden'); // Oculta el modal
    }
}

// 🛑 FUNCIÓN DE CARGA REAL (CONEXIÓN A PHP) 🛑
async function loadMonthlyReport(month, year) {
    const loadingEl = document.getElementById('monthly-report-loading');
    const contentEl = document.getElementById('monthly-report-content');
    
    // Muestra el spinner de carga y oculta el contenido
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (contentEl) contentEl.classList.add('hidden');
    
    try {
        // Asegúrate de que el nombre del archivo PHP sea 'obtener_reporte_mensual.php'
        const response = await fetch(`obtener_reporte_mensual.php?month=${month}&year=${year}`);
        
        // Comprobación de que la respuesta HTTP fue exitosa
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            renderMonthlyReport(result);
            if (loadingEl) loadingEl.classList.add('hidden');
            if (contentEl) contentEl.classList.remove('hidden');
        } else {
            alert('❌ Error de Servidor: ' + result.message);
            closeMonthlyReportModal();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`❌ Error al cargar el reporte mensual. Revise la consola: ${error.message}`);
        closeMonthlyReportModal();
    }
}

// ... La función renderMonthlyReport(data) y todas las demás deben seguir intactas.

function renderMonthlyReport(data) {
    const contentEl = document.getElementById('monthly-report-content');
    if (!contentEl) return;
    
    const summary = data.summary;
    const events = data.events;
    
    // Generación dinámica del contenido (Tu código original)
    contentEl.innerHTML = `
        <div class="space-y-6">
            <div class="text-center pb-4 border-b border-border-color">
                <h3 class="text-2xl font-bold text-white mb-2">Reporte Mensual</h3>
                <p class="text-text-light">${data.period.display}</p>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-bg-card p-4 rounded-lg border border-border-color text-center">
                    <div class="text-text-light text-xs mb-1">Eventos</div>
                    <div class="text-3xl font-bold text-white">${summary.total_events}</div>
                </div>
                
                <div class="bg-bg-card p-4 rounded-lg border border-border-color text-center">
                    <div class="text-text-light text-xs mb-1">Participantes</div>
                    <div class="text-3xl font-bold text-white">${summary.total_participants}</div>
                </div>
                
                <div class="bg-bg-card p-4 rounded-lg border border-border-color text-center">
                    <div class="text-text-light text-xs mb-1">Pagos</div>
                    <div class="text-3xl font-bold text-white">${summary.payments.confirmed_count}</div>
                </div>
            </div>
            
            <div style="background: linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.2)); padding: 16px; border-radius: 12px; border: 1px solid rgba(16,185,129,0.3);">
                <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
                    <i class="fas fa-chart-line"></i> Resumen Financiero
                </h4>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-text-light">Pagos Confirmados</span>
                        <span class="font-bold text-lg" style="color: #10B981;">${formatCurrency(summary.payments.confirmed)}</span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-text-light">Pagos Pendientes</span>
                        <span class="font-bold text-lg" style="color: #FACC15;">${formatCurrency(summary.payments.pending)}</span>
                    </div>
                    
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-text-light">${summary.payments.confirmed_count} confirmados • ${summary.payments.pending_count} pendientes</span>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="text-white font-semibold mb-3 flex items-center gap-2">
                    <i class="fas fa-calendar"></i> Eventos del Mes (${events.length})
                </h4>
                
                ${events.length === 0 ? `
                    <p class="text-text-light text-center py-8">No hay eventos en este período</p>
                ` : `
                    <div class="space-y-3" style="max-height: 400px; overflow-y: auto;">
                        ${events.map(item => `
                            <div class="bg-bg-card p-4 rounded-lg border border-border-color">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex-1">
                                        <div class="font-semibold text-white">${item.event.title}</div>
                                        <div class="text-sm text-text-light">${formatDate(item.event.date)} • ${item.event.location}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm text-text-light">Participantes</div>
                                        <div class="font-bold text-white">${item.event.participants_count}</div>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border-color">
                                    <div>
                                        <div class="text-xs text-text-light">Confirmados</div>
                                        <div class="font-semibold" style="color: #10B981;">${formatCurrency(item.payments.confirmed)}</div>
                                        <div class="text-xs text-text-light">${item.payments.confirmed_count} pagos</div>
                                    </div>
                                    <div>
                                        <div class="text-xs text-text-light">Pendientes</div>
                                        <div class="font-semibold" style="color: #FACC15;">${formatCurrency(item.payments.pending)}</div>
                                        <div class="text-xs text-text-light">${item.payments.pending_count} pagos</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
            
            <div class="flex gap-3 pt-4">
                <button onclick="downloadMonthlyReport()" class="flex-1 text-white py-3 rounded-lg font-semibold transition" style="background-color: var(--accent-blue);">
                    <i class="fas fa-download mr-2"></i>Descargar
                </button>
                <button onclick="closeMonthlyReportModal()" class="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition">
                    Cerrar
                </button>
            </div>
        </div>
    `;
}

// 🛑 FUNCIÓN DE CIERRE DE RF9 (ASIGNADA AL BOTÓN 'X' Y 'CERRAR')
function closeMonthlyReportModal() {
    const modal = document.getElementById('monthly-report-modal');
    if (modal) {
        modal.classList.add('hidden'); // Oculta el modal
    }
}

// ===============================================
// OTRAS FUNCIONES (Incluidas para completar)
// ===============================================

function downloadEventReport() {
    alert('🚧 Función de descarga PDF en desarrollo. Por ahora puedes imprimir esta pantalla (Ctrl+P)');
    window.print();
}

function downloadMonthlyReport() {
    alert('🚧 Función de descarga PDF en desarrollo. Por ahora puedes imprimir esta pantalla (Ctrl+P)');
    window.print();
}

function logout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        window.location.href = 'logout.php';
    }
}


// ===============================================
// SELECTOR DE EVENTO PARA ASISTENCIAS
// ===============================================

// Función para mostrar el selector de eventos antes del formulario
function showEventSelector() {
    const selectorContainer = document.getElementById('event-selector-container');
    
    if (!selectorContainer) {
        console.error('No se encontró el contenedor del selector');
        return;
    }
    
    if (db.events.length === 0) {
        selectorContainer.innerHTML = `
            <div class="bg-red-600/20 border border-red-500/30 rounded-lg p-4 mb-4">
                <div class="flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-red-400 text-lg"></i>
                    <div>
                        <p class="text-red-200 text-sm font-semibold">No hay eventos disponibles</p>
                        <p class="text-red-300 text-xs mt-1">Crea un evento primero desde la pantalla de Eventos.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }
    
    selectorContainer.innerHTML = `
        <div class="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <label class="block text-sm font-semibold text-white mb-2">
                <i class="fas fa-calendar-check mr-2"></i>Selecciona el Evento *
            </label>
            <select id="event-selector" class="form-control" required onchange="handleEventSelection()">
                <option value="">-- Elige un evento --</option>
                ${db.events.map(event => `
                    <option value="${event.id}" ${activeEventId === event.id ? 'selected' : ''}>
                        ${event.title} - ${formatDate(event.date)}
                    </option>
                `).join('')}
            </select>
        </div>
    `;
    
    // Si ya hay un evento activo, seleccionarlo
    if (activeEventId) {
        handleEventSelection();
    }
}

// Manejar cuando se selecciona un evento del dropdown
function handleEventSelection() {
    const selector = document.getElementById('event-selector');
    if (!selector) return;
    
    const selectedEventId = parseInt(selector.value);
    
    if (selectedEventId) {
        activeEventId = selectedEventId;
        const event = db.events.find(e => e.id === selectedEventId);
        
        if (event) {
            // Mostrar información del evento seleccionado
            const selectedInfo = document.getElementById('selected-event-info');
            const selectedName = document.getElementById('selected-event-name');
            
            if (selectedInfo && selectedName) {
                selectedName.textContent = `${event.title} - ${formatDate(event.date)}`;
                selectedInfo.classList.remove('hidden');
            }
            
            // Habilitar el formulario
            const formInputs = document.querySelectorAll('#form-confirm-assistance input, #form-confirm-assistance button');
            formInputs.forEach(input => input.disabled = false);
        }
    } else {
        activeEventId = null;
        
        // Ocultar info y deshabilitar formulario
        const selectedInfo = document.getElementById('selected-event-info');
        if (selectedInfo) {
            selectedInfo.classList.add('hidden');
        }
        
        const formInputs = document.querySelectorAll('#form-confirm-assistance input, #form-confirm-assistance button');
        formInputs.forEach(input => input.disabled = true);
    }
}

// Modificar la función navigate existente para cargar el selector
const originalNavigateFunc = navigate;
navigate = function(screenId, navElement = null, eventId = null) {
    // Llamar a la función original
    originalNavigateFunc(screenId, navElement, eventId);
    
    // Si navegamos a confirmar asistencia, mostrar el selector
    if (screenId === 'screen-confirm-assistance') {
        setTimeout(() => {
            showEventSelector();
        }, 100);
    }
};
// ===============================================
// TRANSFERIR ADMINISTRACIÓN
// ===============================================

function showTransferAdminModal() {
    const modal = document.getElementById('transfer-admin-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('new-admin-email').value = '';
    }
}

function closeTransferAdminModal() {
    const modal = document.getElementById('transfer-admin-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Listener del formulario de transferencia
document.addEventListener('DOMContentLoaded', () => {
    // ... tu código existente ...
    
    // 🆕 Formulario transferir admin
    const transferAdminForm = document.getElementById('form-transfer-admin');
    if (transferAdminForm) {
        transferAdminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!activeEventId) {
                alert('❌ No hay evento activo');
                return;
            }
            
            const newAdminEmail = document.getElementById('new-admin-email').value;
            
            if (!confirm(`¿Estás seguro de transferir la administración a ${newAdminEmail}?\n\nPerderás los permisos para editar este evento.`)) {
                return;
            }
            
            try {
                const response = await fetch('transferir_admin.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        event_id: activeEventId,
                        new_admin_email: newAdminEmail
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(`✅ ${result.message}`);
                    closeTransferAdminModal();
                    await loadDatabase(); // Recargar eventos
                    navigate('screen-events'); // Volver a la lista
                } else {
                    alert(`❌ ${result.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('❌ Error de conexión');
            }
        });
    }
});
// ============================================
// FUNCIONES PARA ELIMINAR EVENTOS
// ============================================

/**
 * Mostrar modal de confirmación para eliminar evento
 */
function confirmDeleteEvent() {
    const event = db.events.find(e => e.id === activeEventId);
    
    if (!event) {
        alert('No hay evento activo para eliminar.');
        return;
    }
    
    // Verificar que sea administrador
    if (!event.isAdmin) {
        alert('Solo el administrador puede eliminar este evento.');
        return;
    }
    
    // Crear modal de confirmación personalizado
    const modalHTML = `
        <div id="delete-event-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header" style="background-color: #DC2626; border-bottom: 2px solid #B91C1C;">
                    <h3 style="color: white; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Confirmar Eliminación
                    </h3>
                </div>
                <div class="modal-body" style="padding: 25px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <i class="fas fa-trash-alt" style="font-size: 48px; color: #DC2626;"></i>
                    </div>
                    <p style="font-size: 16px; margin-bottom: 15px; text-align: center;">
                        ¿Estás seguro de que deseas eliminar este evento?
                    </p>
                    <div style="background-color: rgba(220, 38, 38, 0.1); border: 1px solid #DC2626; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <p style="font-weight: bold; margin-bottom: 5px; color: #DC2626;">
                            📅 ${event.title}
                        </p>
                        <p style="font-size: 14px; color: var(--text-light);">
                            ${formatDate(event.date)} • ${event.location}
                        </p>
                    </div>
                    <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
                        <p style="font-size: 13px; color: #92400E; margin: 0;">
                            <i class="fas fa-exclamation-circle"></i>
                            <strong>Advertencia:</strong> Esta acción eliminará:
                        </p>
                        <ul style="margin: 8px 0 0 25px; font-size: 13px; color: #92400E;">
                            <li>El evento completo</li>
                            <li>Todas las asistencias registradas</li>
                            <li>Todos los pagos asociados</li>
                            <li>Esta acción NO se puede deshacer</li>
                        </ul>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="closeDeleteModal()" class="btn-secondary" style="flex: 1;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button onclick="executeDeleteEvent()" class="btn-danger" style="flex: 1; background-color: #DC2626;">
                            <i class="fas fa-trash"></i> Eliminar Definitivamente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Agregar modal al body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Cerrar modal de confirmación
 */
function closeDeleteModal() {
    const modal = document.getElementById('delete-event-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Ejecutar la eliminación del evento
 */
async function executeDeleteEvent() {
    const event = db.events.find(e => e.id === activeEventId);
    
    if (!event) {
        alert('Error: No se encontró el evento.');
        closeDeleteModal();
        return;
    }
    
    // Mostrar indicador de carga
    const deleteButton = document.querySelector('#delete-event-modal .btn-danger');
    if (deleteButton) {
        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
        deleteButton.disabled = true;
    }
    
    try {
        const formData = new FormData();
        formData.append('event_id', activeEventId);
        
        const response = await fetch('eliminar_evento.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Cerrar modal
            closeDeleteModal();
            
            // Mostrar mensaje de éxito
            showSuccessMessage(result.message || 'Evento eliminado correctamente');
            
            // Actualizar la lista de eventos
            await loadEvents();
            
            // Volver a la pantalla de eventos
            navigate('screen-events');
            
        } else {
            alert('Error: ' + (result.message || 'No se pudo eliminar el evento'));
            closeDeleteModal();
        }
        
    } catch (error) {
        console.error('Error al eliminar evento:', error);
        alert('Error al eliminar el evento. Por favor, intenta de nuevo.');
        closeDeleteModal();
    }
}

/**
 * Mostrar mensaje de éxito temporal
 */
function showSuccessMessage(message) {
    const messageHTML = `
        <div id="success-toast" style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #10B981;
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideDown 0.3s ease;
        ">
            <i class="fas fa-check-circle" style="font-size: 20px;"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', messageHTML);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        const toast = document.getElementById('success-toast');
        if (toast) {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// Agregar animaciones CSS si no existen
if (!document.getElementById('delete-event-animations')) {
    const style = document.createElement('style');
    style.id = 'delete-event-animations';
    style.textContent = `
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(-100%);
                opacity: 0;
            }
        }
        
        .btn-danger {
            background-color: #DC2626;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .btn-danger:hover:not(:disabled) {
            background-color: #B91C1C;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        }
        
        .btn-danger:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Funciones de eliminación de eventos cargadas');
/**
 * Abrir imagen en nueva pestaña
 */
window.openImageInNewTab = function(imageUrl) {
    window.open(imageUrl, '_blank');
};

/**
 * Manejar error de imagen de comprobante
 */
window.handleProofImageError = function(img) {
    console.warn('Error al cargar comprobante:', img.src);
    
    // Intentar con diferentes rutas
    const originalSrc = img.src;
    
    if (!originalSrc.startsWith('http') && !originalSrc.startsWith('data:')) {
        // Si es ruta relativa, intentar con barra al inicio
        if (!originalSrc.startsWith('/')) {
            img.src = '/' + originalSrc;
            img.onerror = function() {
                // Si falla de nuevo, mostrar placeholder
                showProofErrorPlaceholder(img);
            };
            return;
        }
    }
    
    // Si todo falla, mostrar placeholder
    showProofErrorPlaceholder(img);
};

/**
 * Mostrar placeholder cuando la imagen no se puede cargar
 */
function showProofErrorPlaceholder(img) {
    const placeholder = `
        <div style="
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #1f2937, #374151);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
        ">
            <i class="fas fa-image-slash text-4xl mb-3"></i>
            <p>Comprobante no disponible</p>
            <p class="text-xs mt-1">El archivo puede haber sido eliminado</p>
        </div>
    `;
    
    img.outerHTML = placeholder;
}

console.log('✅ Funciones de comprobante de pago cargadas');

/**
 * Abrir imagen en nueva pestaña
 */
window.openImageInNewTab = function(imageUrl) {
    window.open(imageUrl, '_blank');
};

/**
 * Manejar error de imagen de comprobante
 */
window.handleProofImageError = function(img) {
    console.warn('Error al cargar comprobante:', img.src);
    
    // Intentar con diferentes rutas
    const originalSrc = img.src;
    
    if (!originalSrc.startsWith('http') && !originalSrc.startsWith('data:')) {
        // Si es ruta relativa, intentar con barra al inicio
        if (!originalSrc.startsWith('/')) {
            img.src = '/' + originalSrc;
            img.onerror = function() {
                // Si falla de nuevo, mostrar placeholder
                showProofErrorPlaceholder(img);
            };
            return;
        }
    }
    
    // Si todo falla, mostrar placeholder
    showProofErrorPlaceholder(img);
};

/**
 * Mostrar placeholder cuando la imagen no se puede cargar
 */
function showProofErrorPlaceholder(img) {
    const placeholder = `
        <div style="
            width: 100%;
            height: 200px;
            background: linear-gradient(135deg, #1f2937, #374151);
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
        ">
            <i class="fas fa-image-slash text-4xl mb-3"></i>
            <p>Comprobante no disponible</p>
            <p class="text-xs mt-1">El archivo puede haber sido eliminado</p>
        </div>
    `;
    
    img.outerHTML = placeholder;
}

console.log('✅ Funciones de comprobante de pago cargadas');