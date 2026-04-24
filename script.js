const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const gridContainer = document.getElementById('text-grid');
const input = document.getElementById('diary-input');
const dateLabel = document.getElementById('date-label');
const overlay = document.getElementById('overlay');
const inputSection = document.getElementById('input-section');
const weatherSelect = document.getElementById('weather-select');

let selectedDate = new Date();
let currentMonth = new Date();
const cells = [];
let currentColor = '#000000';
let isEraser = false;

// 1. 초기화 및 캔버스 배경 설정
function initCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

for (let i = 0; i < 50; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    gridContainer.appendChild(cell);
    cells.push(cell);
}
initCanvas();

// 2. 달력 렌더링
function renderCalendar() {
    const daysContainer = document.getElementById('calendar-days');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    daysContainer.innerHTML = '';
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // 연도 선택창 옵션 생성 (전후 10년)
    yearSelect.innerHTML = '';
    for (let y = year - 10; y <= year + 10; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `${y}년`;
        if (y === year) opt.selected = true;
        yearSelect.appendChild(opt);
    }

    // 월 선택창 옵션 생성
    monthSelect.innerHTML = '';
    for (let m = 0; m < 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `${m + 1}월`;
        if (m === month) opt.selected = true;
        monthSelect.appendChild(opt);
    }

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);

    const weekDays = ['일','월','화','수','목','금','토'];
    weekDays.forEach(d => {
        const el = document.createElement('div');
        el.style.fontSize = '12px';
        el.style.color = '#999';
        el.textContent = d;
        daysContainer.appendChild(el);
    });

    for (let i = 0; i < firstDay; i++) daysContainer.appendChild(document.createElement('div'));

    for (let i = 1; i <= lastDate; i++) {
        const dateObj = new Date(year, month, i);
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = i;

        const isFuture = dateObj > today;
        const isToday = dateObj.getTime() === today.getTime();

        if (isFuture) dayEl.classList.add('future');
        if (isToday) dayEl.classList.add('today');
        if (dateObj.toDateString() === selectedDate.toDateString()) dayEl.classList.add('selected');

        dayEl.onclick = () => {
            if (isFuture) {
                alert("미래의 일기는 아직 열리지 않았습니다.");
                return;
            }
            selectDate(dateObj);
        };
        daysContainer.appendChild(dayEl);
    }
}

// 3. 날짜 선택 및 데이터 로드
async function selectDate(date) {
    selectedDate = new Date(date);
    const dateStr = formatDate(selectedDate);
    dateLabel.textContent = `${dateStr.replace(/-/g, '. ')}`;
    renderCalendar();

    const todayStr = formatDate(new Date());
    const isToday = (dateStr === todayStr);

    if (isToday) {
        overlay.style.display = 'none';
        inputSection.style.visibility = 'visible';
    } else {
        overlay.style.display = 'block';
        inputSection.style.visibility = 'hidden';
    }

    clearAll();
    
    // 로컬 스토리지 확인
    const localData = localStorage.getItem(`diary_${dateStr}`);
    if (localData) {
        const parsed = JSON.parse(localData);
        loadToUI(parsed.imageData, parsed.textData, parsed.weather);
        return;
    }

    // 서버(정적 리소스) 확인
    try {
        const imgUrl = `./resources/${dateStr}_그림.jpg`;
        const txtUrl = `./resources/${dateStr}_내용.txt`;

        const imgResp = await fetch(imgUrl);
        if (imgResp.ok) {
            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = imgUrl;
        }

        const txtResp = await fetch(txtUrl);
        if (txtResp.ok) {
            const text = await txtResp.text();
            syncText(text);
            input.value = text;
        }
    } catch (e) {
        console.log("No saved data found.");
    }
}

function loadToUI(imgData, txtData, weather) {
    if (imgData) {
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = imgData;
    }
    if (txtData) {
        syncText(txtData);
        input.value = txtData;
    }
    if (weather) {
        weatherSelect.value = weather;
    } else {
        weatherSelect.value = 'sunny';
    }
}

function formatDate(d) {
    const offset = d.getTimezoneOffset() * 60000;
    const dateLocal = new Date(d.getTime() - offset);
    return dateLocal.toISOString().split('T')[0];
}

// 4. 드로잉 액션 (마우스 & 터치 지원)
let isDrawing = false;
let lastX = 0, lastY = 0;

function updateCursor() {
    canvas.classList.remove('cursor-pen', 'cursor-eraser');
    if (isEraser) {
        canvas.classList.add('cursor-eraser');
    } else {
        canvas.classList.add('cursor-pen');
    }
}

function startDrawing(e) {
    if (overlay.style.display === 'block') return;
    isDrawing = true;
    [lastX, lastY] = getCoordinates(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    // 모바일에서 터치 시 이벤트 전파 및 스크롤 방지
    if (e.cancelable) e.preventDefault();
    
    const [x, y] = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = isEraser ? '#ffffff' : currentColor;
    ctx.lineWidth = isEraser ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.stroke();
    [lastX, lastY] = [x, y];
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        autoSave();
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

// 터치 이벤트
canvas.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    startDrawing(touch);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    draw(touch);
}, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    // 터치 이벤트나 마우스 이벤트 모두 clientX, clientY를 가짐
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [
        (clientX - rect.left) * scaleX,
        (clientY - rect.top) * scaleY
    ];
}

// 5. 타이핑 액션
input.oninput = (e) => {
    syncText(e.target.value);
    autoSave();
};

function syncText(text) {
    cells.forEach((cell, idx) => {
        cell.textContent = text[idx] || "";
        if (text[idx]) {
            cell.style.animation = 'none';
            cell.offsetHeight; // trigger reflow
            cell.style.animation = 'typeEffect 0.2s ease-out';
        }
    });
}

function autoSave() {
    const dateStr = formatDate(selectedDate);
    const todayStr = formatDate(new Date());
    if (dateStr !== todayStr) return; // 오늘 것만 저장

    const imageData = canvas.toDataURL('image/png');
    const textData = input.value;
    const weather = weatherSelect.value;
    localStorage.setItem(`diary_${dateStr}`, JSON.stringify({ imageData, textData, weather, ts: Date.now() }));
}

function clearAll() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    cells.forEach(c => c.textContent = "");
    input.value = "";
}

// 다른 창/탭에서 변경 시 실시간 동기화
window.addEventListener('storage', (e) => {
    const dateStr = formatDate(selectedDate);
    if (e.key === `diary_${dateStr}` && e.newValue) {
        const parsed = JSON.parse(e.newValue);
        loadToUI(parsed.imageData, parsed.textData, parsed.weather);
    }
});

// 6. 도구 선택
window.selectColor = function(color, el) {
    isEraser = false;
    currentColor = color;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    updateCursor();
};

window.selectEraser = function(el) {
    isEraser = true;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    updateCursor();
};

window.changeMonth = function(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
};

window.jumpToDate = function() {
    const year = parseInt(document.getElementById('year-select').value);
    const month = parseInt(document.getElementById('month-select').value);
    currentMonth = new Date(year, month, 1);
    renderCalendar();
};

// 초기화
renderCalendar();
selectDate(new Date());
updateCursor();
