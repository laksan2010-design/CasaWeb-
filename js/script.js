/* ============================================================
   CUIDADO CASA BY KC — MAIN JAVASCRIPT LOGIC
   ============================================================ */

/* CURRENCY SWITCHER STATE */
const currencyRates = {
    LKR: { symbol: 'Rs ', rate: 1.0 },
    USD: { symbol: '$', rate: 0.0033 },
    EUR: { symbol: '€', rate: 0.0030 },
    GBP: { symbol: '£', rate: 0.0026 }
};
let currentCurrency = 'LKR';

function changeCurrency(curr) {
    currentCurrency = curr;
    const rateObj = currencyRates[curr];
    
    document.querySelectorAll('.room-price').forEach(el => {
        const baseLkr = parseFloat(el.getAttribute('data-lkr')) || 18000;
        const converted = Math.round(baseLkr * rateObj.rate);
        el.innerText = `${rateObj.symbol}${converted.toLocaleString()}`;
    });
    showToast(`Currency changed to ${curr}`);
}

/* MOBILE MENU TOGGLE */
function toggleMobileMenu() {
    const drawer = document.getElementById('mobileDrawer');
    if(drawer) drawer.classList.toggle('translate-x-full');
}

/* GOOGLE SHEET & LIVE AVAILABILITY SYSTEM */
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbwXdf1RrlDcNQtcUuam0OQ94sNPj7WYHj2SVompAGTUT3xefWRj-auFNfNoGzNoUfgHng/exec"; 

// Fallback Sample Bookings
let sampleBookings = [
    { suite: "Room 1 — Deluxe King Room", checkIn: "2026-10-15", checkOut: "2026-10-18", customerName: "Demo Guest" },
    { suite: "Room 3/4 — Family Room", checkIn: "2026-10-22", checkOut: "2026-10-25", customerName: "Sample Booking" }
];

async function fetchBookingsFromSheet() {
    if(!GOOGLE_SHEET_URL) {
        return sampleBookings;
    }
    try {
        const res = await fetch(GOOGLE_SHEET_URL);
        if(!res.ok) throw new Error("Sheet fetch failed");
        const data = await res.json();
        return data;
    } catch(err) {
        console.warn("Using fallback local bookings data:", err);
        return sampleBookings;
    }
}

async function checkAvailabilityStatus() {
    const villaSelect = document.getElementById('modalVillaSelect');
    const villa = villaSelect ? villaSelect.value : 'Room 1 — Deluxe King Room';
    const checkInVal = document.getElementById('modalCheckIn').value;
    const checkOutVal = document.getElementById('modalCheckOut').value;
    const banner = document.getElementById('availabilityBanner');
    const submitBtn = document.getElementById('modalSubmitBtn');

    if(!banner || !submitBtn) return;

    if(!checkInVal || !checkOutVal) {
        banner.classList.add('hidden');
        return;
    }

    const userIn = new Date(checkInVal);
    const userOut = new Date(checkOutVal);

    if(userOut <= userIn) {
        banner.className = "p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-2 mb-3";
        banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-600"></i> Check-Out date must be after Check-In date.`;
        banner.classList.remove('hidden');
        submitBtn.disabled = true;
        return;
    }

    banner.className = "p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2 mb-3";
    banner.innerHTML = `<i class="fa-solid fa-spinner animate-spin text-blue-600"></i> Checking availability in Master Calendar...`;
    banner.classList.remove('hidden');

    const allBookings = await fetchBookingsFromSheet();

    // Check overlap for same room
    const isOverlap = allBookings.some(b => {
        if(b.suite && b.suite !== villa) return false;
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        return (userIn < bOut && userOut > bIn);
    });

    if(isOverlap) {
        banner.className = "p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-center gap-2 mb-3";
        banner.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-600 text-sm"></i> <span><strong>Dates Unavailable:</strong> ${villa} is already reserved for these dates. Please choose alternative dates.</span>`;
        submitBtn.disabled = true;
    } else {
        banner.className = "p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 mb-3";
        banner.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-600 text-sm"></i> <span><strong>Available!</strong> ${villa} is open for your selected dates.</span>`;
        submitBtn.disabled = false;
    }
}

/* BOOKING MODAL & TOTAL CALCULATOR */
function openBookingModal(villaName = 'Room 1 — Deluxe King Room') {
    const modal = document.getElementById('bookingModal');
    if(!modal) return;
    modal.classList.remove('hidden');
    
    if(villaName) {
        const select = document.getElementById('modalVillaSelect');
        if(select) select.value = villaName;
    }

    // Set default dates if empty
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    if(!document.getElementById('modalCheckIn').value) {
        document.getElementById('modalCheckIn').value = today.toISOString().split('T')[0];
    }
    if(!document.getElementById('modalCheckOut').value) {
        document.getElementById('modalCheckOut').value = tomorrow.toISOString().split('T')[0];
    }

    updateBookingTotal();
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if(modal) modal.classList.add('hidden');
}

function updateBookingTotal() {
    const villaSelect = document.getElementById('modalVillaSelect');
    if(!villaSelect) return;
    const selectedOpt = villaSelect.options[villaSelect.selectedIndex];
    let basePrice = parseFloat(selectedOpt.getAttribute('data-price')) || 18000;

    const rateTypeEl = document.getElementById('modalRateType');
    if(rateTypeEl && rateTypeEl.value === 'ac' && !selectedOpt.value.includes('Soul Journey')) {
        basePrice += 4000; // AC supplement
    }

    const checkIn = new Date(document.getElementById('modalCheckIn').value);
    const checkOut = new Date(document.getElementById('modalCheckOut').value);
    
    let diffDays = 1;
    if(checkIn && checkOut && checkOut > checkIn) {
        diffDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    }
    const stayNightsEl = document.getElementById('stayNights');
    if(stayNightsEl) stayNightsEl.innerText = diffDays;

    let total = basePrice * diffDays;

    const rateObj = currencyRates[currentCurrency];
    const converted = Math.round(total * rateObj.rate);

    const totalDisplay = document.getElementById('bookingTotalDisplay');
    if(totalDisplay) totalDisplay.innerText = `${rateObj.symbol}${converted.toLocaleString()}`;

    // Trigger live Google Sheet availability check
    checkAvailabilityStatus();
}

function handleQuickSearch() {
    const checkIn = document.getElementById('quickCheckIn').value;
    const checkOut = document.getElementById('quickCheckOut').value;
    const roomPref = document.getElementById('quickGuests').value;

    if(checkIn && checkOut) {
        document.getElementById('modalCheckIn').value = checkIn;
        document.getElementById('modalCheckOut').value = checkOut;
    }
    openBookingModal(roomPref);
}

async function handleFinalBooking(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('modalSubmitBtn');
    const origText = submitBtn ? submitBtn.innerText : "Confirm Reservation Request";
    if(submitBtn) {
        submitBtn.innerText = "Submitting Request...";
        submitBtn.disabled = true;
    }

    const refCode = 'KC-' + Math.floor(100000 + Math.random() * 900000);
    const guestName = document.getElementById('modalGuestName')?.value || 'Guest';
    const guestContact = document.getElementById('modalGuestEmail')?.value || 'N/A';
    const roomTypeSelect = document.getElementById('modalVillaSelect');
    const roomType = roomTypeSelect ? roomTypeSelect.value : 'Room 1 — Deluxe King Room';
    const checkIn = document.getElementById('modalCheckIn')?.value || 'N/A';
    const checkOut = document.getElementById('modalCheckOut')?.value || 'N/A';
    
    const rateTypeEl = document.getElementById('modalRateType');
    const rateType = rateTypeEl ? rateTypeEl.options[rateTypeEl.selectedIndex].text : 'Air-conditioned Rate';
    
    const guestsEl = document.getElementById('modalGuestsCount');
    const guestsCount = guestsEl ? guestsEl.value : '2 Guests';
    
    const totalPrice = document.getElementById('bookingTotalDisplay')?.innerText || 'Rs 18,000';

    const bookingPayload = {
        refCode: refCode,
        customerName: guestName,
        email: guestContact,
        suite: roomType,
        checkIn: checkIn,
        checkOut: checkOut,
        option: rateType,
        guests: guestsCount,
        totalPrice: totalPrice
    };

    // 1. Post to Google Sheet in the background (same as before)
    if(GOOGLE_SHEET_URL) {
        try {
            await fetch(GOOGLE_SHEET_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingPayload)
            });
        } catch(err) {
            console.error("Error writing to Google Sheet:", err);
        }
    } else {
        sampleBookings.push(bookingPayload);
    }

    if(submitBtn) {
        submitBtn.innerText = origText;
        submitBtn.disabled = false;
    }
    closeBookingModal();

    // 2. Format detailed WhatsApp message to +94 76 404 5694
    const waMsg = `Hello Cuidado Casa by KC! 🌿%0A%0A*NEW RESERVATION REQUEST*%0A- *Reference Code:* ${refCode}%0A- *Room / Package:* ${encodeURIComponent(roomType)}%0A- *Guest Name:* ${encodeURIComponent(guestName)}%0A- *Contact Info:* ${encodeURIComponent(guestContact)}%0A- *Check-In:* ${checkIn}%0A- *Check-Out:* ${checkOut}%0A- *Room Option:* ${encodeURIComponent(rateType)}%0A- *Guests:* ${encodeURIComponent(guestsCount)}%0A- *Estimated Total:* ${encodeURIComponent(totalPrice)}`;
    const waUrl = `https://wa.me/94764045694?text=${waMsg}`;
    
    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');

    // 3. Display customer confirmation modal & toast
    showBookingSuccessModal(refCode, roomType, checkIn, checkOut, totalPrice, waUrl);
    showToast(`Reservation request submitted! Ref: ${refCode}`);
}

function showBookingSuccessModal(refCode, roomType, checkIn, checkOut, totalPrice, waUrl) {
    const successModal = document.getElementById('bookingSuccessModal');
    if(!successModal) return;

    if(document.getElementById('successRefCode')) document.getElementById('successRefCode').innerText = refCode;
    if(document.getElementById('successRoom')) document.getElementById('successRoom').innerText = roomType;
    if(document.getElementById('successDates')) document.getElementById('successDates').innerText = `${checkIn} to ${checkOut}`;
    if(document.getElementById('successTotal')) document.getElementById('successTotal').innerText = totalPrice;
    if(document.getElementById('successWaLink')) document.getElementById('successWaLink').href = waUrl;

    successModal.classList.remove('hidden');
}

function closeSuccessModal() {
    const successModal = document.getElementById('bookingSuccessModal');
    if(successModal) successModal.classList.add('hidden');
}

/* ROOM DETAILS MODAL DATA (FROM PDF #1) */
const roomData = {
    room1: {
        title: "Room 1 — Deluxe King Room with Balcony & View",
        img: "images/room1.jpg",
        fallback: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
        price: "LKR 15,000 – 22,000",
        target: "Solo travellers and couples (1–2 guests)",
        desc: "A comfortable deluxe room with 1 king bed, private bathroom, and private balcony with view of surrounding greenery. Rates include daily breakfast.",
        amenities: ["1 King Size Bed", "Private Bathroom & Hot Water", "Private Balcony with Greenery View", "Air Conditioning / Fan Option", "Wi-Fi & Television", "Desk & Chair", "Electric Kettle & Tea Bags", "Fresh Linen & Towels", "Hair Dryer & Basic Toiletries", "Complimentary Breakfast Included"]
    },
    room2: {
        title: "Room 2 — Standard Room",
        img: "images/room2.jpg",
        fallback: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        price: "LKR 15,000 – 18,000",
        target: "Solo travellers and couples (1–2 guests)",
        desc: "A practical, welcoming room with 2 double beds and a private bathroom. It offers a comfortable stay. Additional bed available on request.",
        amenities: ["2 Double Beds", "Private Bathroom & Hot Water", "Air Conditioning / Fan Option", "Wi-Fi & Television", "Table/Desk & Chair", "Electric Kettle & Tea Bags", "Fresh Bed Linen & Towels", "Hair Dryer & Toiletries", "Additional Bed Available on Request", "Complimentary Breakfast Included"]
    },
    room3: {
        title: "Room 3 — Family Room with Balcony & Pool View",
        img: "images/room3.jpg",
        fallback: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        price: "LKR 20,000 – 27,000",
        target: "Families, couples and friends (Up to 3 guests)",
        desc: "A family-style room with 2 double beds, private bathroom and private balcony overlooking the pool or garden.",
        amenities: ["2 Double Beds", "Private Balcony overlooking Pool/Garden", "Private Bathroom & Hot Water", "Air Conditioning / Fan Option", "Wi-Fi & Television", "Cupboard & Wardrobe", "Electric Kettle & Tea Bags", "Additional Bed Available on Request", "Complimentary Breakfast Included"]
    },
    room4: {
        title: "Room 4 — Family Room with Balcony & Pool/Garden View",
        img: "images/room4.jpg",
        fallback: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        price: "LKR 22,000 – 28,000",
        target: "Families, couples and friends (Up to 3 guests)",
        desc: "Welcoming family room with 2 double beds, private bathroom and private balcony with pool/garden view.",
        amenities: ["2 Double Beds", "Private Balcony with Pool/Garden View", "Private Bathroom & Hot Water", "Air Conditioning / Fan Option", "Wi-Fi & Television", "Wardrobe & Sitting Area", "Electric Kettle & Tea Bags", "Additional Bed Available on Request", "Complimentary Breakfast Included"]
    }
};

function openRoomDetails(key) {
    const data = roomData[key];
    if(!data) return;

    const contentHTML = `
        <div class="relative h-64 sm:h-80 rounded-xl overflow-hidden mb-6">
            <img src="${data.img}" onerror="this.src='${data.fallback}'" alt="${data.title}" class="w-full h-full object-cover">
            <div class="absolute bottom-4 left-4 bg-forest-dark/90 text-gold px-4 py-1.5 rounded-lg font-serif font-bold text-base sm:text-lg border border-gold/30">
                ${data.title}
            </div>
        </div>
        <div class="flex justify-between items-center mb-2">
            <span class="text-xs text-emerald-700 font-bold">${data.target}</span>
            <span class="font-serif text-xl sm:text-2xl font-bold text-forest">${data.price} <span class="text-xs text-slateMuted font-sans">/ night</span></span>
        </div>
        <p class="text-slateMuted text-xs sm:text-sm leading-relaxed mb-6">${data.desc}</p>
        <h4 class="font-bold text-forest-dark text-sm mb-3">Included Guest Facilities:</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slateMuted mb-6">
            ${data.amenities.map(a => `<div class="flex items-center gap-2"><i class="fa-solid fa-check text-gold"></i><span>${a}</span></div>`).join('')}
        </div>
        <div class="flex justify-end gap-3 pt-4 border-t border-stone-100">
            <button onclick="closeRoomDetails()" class="px-5 py-2.5 rounded-xl bg-stone-100 text-forest-dark font-semibold text-xs">Close</button>
            <a href="https://wa.me/94764045694?text=Hi%20Cuidado%20Casa%20by%20KC,%20I%20want%20to%20enquire%20about%20${encodeURIComponent(data.title)}." target="_blank" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow flex items-center gap-2">
                <i class="fa-brands fa-whatsapp"></i> Enquire via WhatsApp
            </a>
        </div>
    `;

    document.getElementById('roomDetailsContent').innerHTML = contentHTML;
    document.getElementById('roomDetailsModal').classList.remove('hidden');
}

function closeRoomDetails() {
    const modal = document.getElementById('roomDetailsModal');
    if(modal) modal.classList.add('hidden');
}

/* CONTACT FORM & TOAST NOTIFICATION */
function showToast(msg) {
    const toast = document.getElementById('toast');
    if(!toast) return;
    document.getElementById('toastMsg').innerText = msg;
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.transform = 'translateY(-150%)';
    }, 3500);
}

/* WEBAUDIO SYNTHESIZER FOR AMBIENT NATURE SOUND */
let audioCtx = null;
let isAudioPlaying = false;
let noiseNode = null;

function toggleAmbientAudio() {
    const btn = document.getElementById('audioBtn');
    const bars = document.getElementById('audioBars');
    const icon = document.getElementById('audioIcon');

    if(!isAudioPlaying) {
        if(!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = audioCtx.createGain();
        gain.gain.value = 0.05;

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noiseNode.start();
        isAudioPlaying = true;
        if(bars) bars.classList.remove('hidden');
        if(icon) icon.className = 'fa-solid fa-volume-high text-gold';
        showToast("Nature Ambience Audio Activated 🌿");
    } else {
        if(noiseNode) {
            noiseNode.stop();
        }
        isAudioPlaying = false;
        if(bars) bars.classList.add('hidden');
        if(icon) icon.className = 'fa-solid fa-volume-xmark';
    }
}

/* LEAFLET MAP INITIALIZATION (HORANA, SRI LANKA) */
window.addEventListener('DOMContentLoaded', () => {
    // Horana, Sri Lanka Coordinates: Lat 6.7153, Lng 80.0631
    const mapEl = document.getElementById('map');
    if(mapEl) {
        const map = L.map('map').setView([6.7153, 80.0631], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const goldIcon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#0A192F; color:#00A3E0; padding:8px 12px; border-radius:20px; border:2px solid #00A3E0; font-weight:bold; font-size:11px; white-space:nowrap; box-shadow:0 4px 10px rgba(0,0,0,0.3);'><i class='fa-solid fa-gem'></i> Cuidado Casa by KC</div>",
            iconSize: [150, 30],
            iconAnchor: [75, 15]
        });

        L.marker([6.7153, 80.0631], { icon: goldIcon }).addTo(map)
            .bindPopup("<strong style='font-family:serif; font-size:14px; color:#0A192F;'>Cuidado Casa by KC (Pvt) Ltd</strong><br>No. 58, Thotupala Road, Kandana, Horana – 12400")
            .openPopup();
    }

    const quickCheckIn = document.getElementById('quickCheckIn');
    const quickCheckOut = document.getElementById('quickCheckOut');
    if(quickCheckIn && quickCheckOut) {
        const todayStr = new Date().toISOString().split('T')[0];
        quickCheckIn.value = todayStr;
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 2);
        quickCheckOut.value = tmrw.toISOString().split('T')[0];
    }
});
