(function () {
    let allEvents = [];
    let filteredEvents = [];
    let currentView = 'month';
    let currentDate = new Date();
    let selectedType = 'all';

    const calendarView = document.getElementById('calendarView');
    const typeFilter = document.getElementById('typeFilter');
    const viewButtons = document.querySelectorAll('.view-btn');

    // Event type labels
    const typeLabels = {
        'info': 'Информация',
        'important': 'Важное',
        'event': 'Мероприятие'
    };

    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    const monthNamesShort = [
        'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
        'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'
    ];

    const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    // Initialize
    async function init() {
        await loadEvents();
        setupEventListeners();
        render();
    }

    // Load events from API
    async function loadEvents() {
        try {
            const res = await fetch('/api/calendar/events');
            const data = await res.json();
            if (data.ok) {
                allEvents = data.events;
                filterEvents();
            }
        } catch (error) {
            }
    }

    // Setup event listeners
    function setupEventListeners() {
        // View switcher
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                viewButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                render();
            });
        });

        // Type filter
        typeFilter.addEventListener('change', (e) => {
            selectedType = e.target.value;
            filterEvents();
            render();
        });

        // Modal close on background click
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') {
                closeModal();
            }
        });
    }

    // Filter events by type
    function filterEvents() {
        if (selectedType === 'all') {
            filteredEvents = [...allEvents];
        } else {
            filteredEvents = allEvents.filter(e => e.type === selectedType);
        }
    }

    // Render calendar based on current view
    function render() {
        if (currentView === 'month') {
            renderMonthView();
        } else if (currentView === 'list') {
            renderListView();
        }
    }

    // Render month view
    function renderMonthView() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month (adjust for Monday start)
        const firstDay = new Date(year, month, 1);
        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Adjust for Monday start

        // Last day of month
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        let html = `
            <div class="month-header">
                <h2 class="month-title">${monthNames[month]} ${year}</h2>
                <div class="month-nav">
                    <button onclick="window.calendarApp.prevMonth()">← Пред.</button>
                    <button onclick="window.calendarApp.today()">Сегодня</button>
                    <button onclick="window.calendarApp.nextMonth()">След. →</button>
                </div>
            </div>
            <div class="calendar-grid">
        `;

        // Day headers
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Previous month days
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = prevMonthLastDay - i;
            html += `<div class="calendar-day other-month"><div class="day-number">${day}</div></div>`;
        }

        // Current month days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDate(date);
            const isToday =
                today.getDate() === day &&
                today.getMonth() === month &&
                today.getFullYear() === year;

            const dayEvents = filteredEvents.filter(e => e.date === dateStr);

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="day-number">${day}</div>
                    <div class="day-events">
            `;

            dayEvents.slice(0, 3).forEach(event => {
                html += `
                    <div class="day-event event-${event.type}" onclick="window.calendarApp.showEvent('${event.id}')">
                        ${event.time ? event.time + ' ' : ''}${event.title_ru}
                    </div>
                `;
            });

            if (dayEvents.length > 3) {
                html += `<div class="day-event">+${dayEvents.length - 3} ещё</div>`;
            }

            html += `
                    </div>
                </div>
            `;
        }

        // Next month days
        const totalCells = firstDayOfWeek + daysInMonth;
        const remainingCells = 7 - (totalCells % 7);
        if (remainingCells < 7) {
            for (let day = 1; day <= remainingCells; day++) {
                html += `<div class="calendar-day other-month"><div class="day-number">${day}</div></div>`;
            }
        }

        html += `</div>`;
        calendarView.innerHTML = html;
    }

    // Render list view
    function renderListView() {
        if (filteredEvents.length === 0) {
            calendarView.innerHTML = `
                <div class="no-events">
                    <p>📅 Нет предстоящих событий</p>
                </div>
            `;
            return;
        }

        let html = '<div class="event-list">';

        filteredEvents.forEach(event => {
            const date = new Date(event.date);
            const day = date.getDate();
            const month = monthNamesShort[date.getMonth()];

            html += `
                <div class="event-card" onclick="window.calendarApp.showEvent('${event.id}')">
                    <div class="event-date-badge">
                        <div class="event-day">${day}</div>
                        <div class="event-month">${month}</div>
                    </div>
                    <div class="event-details">
                        <div class="event-title">${event.title_ru}</div>
                        <div class="event-meta">
                            ${event.time ? `<span>🕐 ${event.time}</span>` : ''}
                            ${event.location_ru ? `<span>📍 ${event.location_ru}</span>` : ''}
                            <span class="event-type-badge badge-${event.type}">${typeLabels[event.type] || 'Событие'}</span>
                        </div>
                        ${event.description_ru ? `<div class="event-description">${event.description_ru}</div>` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        calendarView.innerHTML = html;
    }

    // Show event modal
    function showEvent(eventId) {
        const event = allEvents.find(e => e.id === eventId);
        if (!event) return;

        const modal = document.getElementById('eventModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMeta = document.getElementById('modalMeta');
        const modalDescription = document.getElementById('modalDescription');

        const date = new Date(event.date);
        const formattedDate = `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;

        modalTitle.textContent = event.title_ru;

        let metaHtml = `
            <div class="modal-meta-item">
                <span class="modal-meta-icon">📅</span>
                <span>${formattedDate}</span>
            </div>
        `;

        if (event.time) {
            metaHtml += `
                <div class="modal-meta-item">
                    <span class="modal-meta-icon">🕐</span>
                    <span>${event.time}</span>
                </div>
            `;
        }

        if (event.location_ru) {
            metaHtml += `
                <div class="modal-meta-item">
                    <span class="modal-meta-icon">📍</span>
                    <span>${event.location_ru}</span>
                </div>
            `;
        }

        metaHtml += `
            <div class="modal-meta-item">
                <span class="modal-meta-icon">🏷️</span>
                <span class="event-type-badge badge-${event.type}">${typeLabels[event.type] || 'Событие'}</span>
            </div>
        `;

        modalMeta.innerHTML = metaHtml;
        modalDescription.innerHTML = event.description_ru ? `<p>${event.description_ru}</p>` : '';

        modal.classList.add('active');
    }

    // Close modal
    window.closeModal = function () {
        document.getElementById('eventModal').classList.remove('active');
    };

    // Navigation methods
    function prevMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        render();
    }

    function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        render();
    }

    function today() {
        currentDate = new Date();
        render();
    }

    // Helper function to format date as YYYY-MM-DD
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Expose methods globally
    window.calendarApp = {
        showEvent,
        prevMonth,
        nextMonth,
        today
    };

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

