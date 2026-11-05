// ==========================================
// 1. CONFIGURATION & INITIALIZATION
// ==========================================
// ใส่ App ID และ Client Key ของคุณจาก Back4app ตรงนี้
const PARSE_APP_ID = 'YOUR_BACK4APP_APP_ID'; 
const PARSE_JS_KEY = 'YOUR_BACK4APP_JS_KEY';
const PARSE_SERVER_URL = 'https://back4app.com';

Parse.initialize(PARSE_APP_ID, PARSE_JS_KEY);
Parse.serverURL = PARSE_SERVER_URL;

// สถานะการจำลองภายในแอปพลิเคชัน (Global State)
let currentRole = 'customer';
let cart = [];
let currentSelectedRestaurant = null;
let activeOrder = null; // เก็บออบเจกต์คำสั่งซื้อปัจจุบัน
let liveQuerySubscription = null;

// ข้อมูลจำลองสำหรับทดสอบ (Fallback กรณีไม่มีข้อมูลในฐานข้อมูล)
const defaultRestaurants = [
    { id: 'res_01', name: 'กะเพราตาแป๊ะ', cuisine: 'Thai', rating: 4.8, menu: [{ name: 'กะเพราเนื้อสับไข่ดาว', price: 89 }, { name: 'ข้าวผัดหมู', price: 65 }] },
    { id: 'res_02', name: 'ซูชิเซนเซ', cuisine: 'Japanese', rating: 4.6, menu: [{ name: 'แซลมอนซาชิมิ XL', price: 290 }, { name: 'ข้าวหน้าเนื้อกิวด้ง', price: 150 }] },
    { id: 'res_03', name: 'เบอร์เกอร์คิงส์ดอม', cuisine: 'Burger', rating: 4.4, menu: [{ name: 'ชีสเบอร์เกอร์ดับเบิ้ล', price: 189 }, { name: 'เฟรนช์ฟรายส์ใหญ่', price: 79 }] }
];

// ==========================================
// 2. CORE SYSTEM & UTILITIES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // โหลดข้อมูลเริ่มต้นและแสดงผลหน้าจอแรก
    switchRole('customer');
    initApp();
});

function showToast(message, type = 'success') {
    const toastBox = document.getElementById('toast-box');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-message');
    
    toastMsg.innerText = message;
    if (type === 'error') {
        toastIcon.innerText = '×';
        toastIcon.className = 'text-red-500 text-2xl font-bold';
    } else {
        toastIcon.innerText = '●';
        toastIcon.className = 'text-success text-xl';
    }
    
    toastBox.classList.remove('translate-x-full');
    setTimeout(() => {
        toastBox.classList.add('translate-x-full');
    }, 4000);
}

function switchRole(role) {
    currentRole = role;
    
    // อัปเดต UI ปุ่มสลับสิทธิ์
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-primary', 'shadow-sm');
        btn.classList.add('text-slate-600');
    });
    const activeBtn = document.getElementById(`btn-role-${role}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-600');
        activeBtn.classList.add('bg-white', 'text-primary', 'shadow-sm');
    }

    // ซ่อนทุกหน้าจอซ่อนย่อยก่อน แล้วเปิดหน้าจอที่เลือก
    document.querySelectorAll('.role-view').forEach(view => view.classList.add('hidden'));
    
    const targetView = document.getElementById(`view-${role}`);
    if (targetView) {
        targetView.classList.remove('hidden');
        // ทริกเกอร์ฟังก์ชันเรนเดอร์เฉพาะหน้าจอนั้นๆ
        if (role === 'customer') renderCustomerDashboard();
        if (role === 'driver') renderDriverDashboard();
        if (role === 'restaurant') renderRestaurantDashboard();
        if (role === 'admin') renderAdminDashboard();
    }
}

async function initApp() {
    try {
        showToast('กำลังเชื่อมต่อฐานข้อมูล Back4app...', 'info');
        // ทดสอบดึงข้อมูลร้านอาหารจากคลาส 'Restaurant' บน Parse
        const query = new Parse.Query('Restaurant');
        const count = await query.count();
        if (count === 0) {
            // หากระบบใหม่ยังไม่มีข้อมูล สามารถใช้ฟังก์ชันนี้อัปโหลดก้อนตั้งต้นได้
            await seedInitialData();
        }
        showToast('เชื่อมต่อระบบต้นแบบเสร็จสิ้น');
    } catch (error) {
        console.warn('Parse Server คืนค่าล้มเหลว (อาจยังไม่ได้ตั้งค่า App ID):', error);
        showToast('โหมดออฟไลน์: ใช้ข้อมูลจำลองสำหรับต้นแบบ', 'info');
    }
}

async function seedInitialData() {
    for (const res of defaultRestaurants) {
        const RestaurantClass = Parse.Object.extend('Restaurant');
        const obj = new RestaurantClass();
        obj.set('name', res.name);
        obj.set('cuisine', res.cuisine);
        obj.set('rating', res.rating);
        obj.set('menu', res.menu);
        await obj.save();
    }
}

// ==========================================
// 3. CUSTOMER BUSINESS LOGIC
// ==========================================
async function renderCustomerDashboard() {
    const container = document.getElementById('customer-restaurant-list');
    if (!container) return;
    container.innerHTML = '<p class="text-xs text-slate-400">กำลังโหลดร้านอาหาร...</p>';

    let restaurants = defaultRestaurants;
    try {
        const query = new Parse.Query('Restaurant');
        const results = await query.find();
        if (results.length > 0) {
            restaurants = results.map(r => ({
                id: r.id,
                name: r.get('name'),
                cuisine: r.get('cuisine'),
                rating: r.get('rating'),
                menu: r.get('menu')
            }));
        }
    } catch (e) { console.log('ใช้ข้อมูลภายในแทน'); }

    // กรองประเภทอาหารตาม Select Filter
    const filterValue = document.getElementById('cuisine-filter')?.value || 'all';
    if (filterValue !== 'all') {
        restaurants = restaurants.filter(r => r.cuisine === filterValue);
    }

    container.innerHTML = '';
    restaurants.forEach(res => {
        const card = document.createElement('div');
        card.className = 'bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-primary/50 transition-all cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-bold text-slate-800 text-sm">${res.name}</h3>
                    <span class="text-[11px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">${res.cuisine}</span>
                </div>
                <span class="text-xs text-amber-500 font-bold">⭐ ${res.rating}</span>
            </div>
            <div class="space-y-1 mt-3" id="menu-list-${res.id}"></div>
        `;
        container.appendChild(card);

        // ใส่เมนูอาหารของแต่ละร้าน
        const menuContainer = document.getElementById(`menu-list-${res.id}`);
        res.menu.forEach(item => {
            const menuBtn = document.createElement('button');
            menuBtn.className = 'w-full flex justify-between items-center text-xs text-slate-600 hover:bg-primary/10 p-1.5 rounded transition-all';
            menuBtn.onclick = (e) => {
                e.stopPropagation();
                addToCart(res, item);
            };
            menuBtn.innerHTML = `<span>+ ${item.name}</span><span class="font-semibold text-slate-800">฿${item.price}</span>`;
            menuContainer.appendChild(menuBtn);
        });
    });
}

function filterRestaurants() {
    renderCustomerDashboard();
}

function addToCart(restaurant, item) {
    if (currentSelectedRestaurant && currentSelectedRestaurant.id !== restaurant.id) {
        if (!confirm('คุณต้องการยกเลิกตระกร้าจากร้านเดิมเพื่อสั่งร้านนี้ใช่หรือไม่?')) return;
        cart = [];
    }
    currentSelectedRestaurant = restaurant;
    cart.push(item);
    updateCartUI();
}

function updateCartUI() {
    const panel = document.getElementById('customer-cart-panel');
    const count = document.getElementById('cart-count');
    const total = document.getElementById('cart-total');
    
    if (cart.length > 0) {
        panel.classList.remove('hidden');
        count.innerText = cart.length;
        const sum = cart.reduce((acc, curr) => acc + curr.price, 0);
        total.innerText = sum;
    } else {
        panel.classList.add('hidden');
    }
}

async function processCheckout() {
    if (cart.length === 0) return;
    showToast('กำลังส่งคำสั่งซื้อไปยังระบบตรวจสอบ...', 'info');

    const totalPrice = cart.reduce((acc, curr) => acc + curr.price, 0);
    try {
        const OrderClass = Parse.Object.extend('Order');
        const order = new OrderClass();
        order.set('restaurantName', currentSelectedRestaurant.name);
        order.set('items', cart);
        order.set('totalPrice', totalPrice);
        order.set('status', 'PENDING'); // PENDING -> ACCEPTED -> PICKED_UP -> DELIVERED
        order.set('driverName', '');
        
        activeOrder = await order.save();
        showToast('ส่งคำสั่งซื้อสำเร็จ! กำลังเปิดหน้าติดตามสถานะ');
        
        // ล้างรถเข็น
        cart = [];
        updateCartUI();
        
        // แสดงบัตร Live Tracking
        setupLiveTracking(activeOrder);
    } catch (error) {
        console.error('Checkout failed', error);
        // Fallback จำลองถ้าไม่มีฐานข้อมูลจริง
        showToast('ระบบฐานข้อมูลคลาวด์ออฟไลน์: กำลังจำลองผ่านโมเดลสเตต', 'info');
        mockActiveOrder();
    }
}

function setupLiveTracking(parseOrderObj) {
    const trackingCard = document.getElementById('live-tracking-card');
    const statusText = document.getElementById('customer-order-status');
    if (!trackingCard) return;

    trackingCard.classList.remove('hidden');
    statusText.innerText = 'รอลูกค้ายืนยัน / กำลังจับคู่คนขับ';

    // การทำ Back4app Live Queries จำลอง (หรือใช้จริงผ่าน Parse.LiveQuery WebSockets)
    if (parseOrderObj && typeof parseOrderObj.className === 'string') {
        try {
            let query = new Parse.Query('Order');
            query.equalTo('objectId', parseOrderObj.id);
            liveQuerySubscription = query.subscribe();
            
            liveQuerySubscription.on('update', (object) => {
                statusText.innerText = getThaiStatus(object.get('status'));
                if (object.get('driverName')) {
                    document.getElementById('tracked-driver-name').innerText = object.get('driverName');
                    document.getElementById('tracked-driver-eta').innerText = 'ห่างจากคุณประมาณ 3 นาที (ตำแหน่งเรียลไทม์)';
                }

                