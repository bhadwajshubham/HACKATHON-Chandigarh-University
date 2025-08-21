function generateUniqueId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
}

function getOrCreateUserId() {
    let userId = localStorage.getItem('p2p_user_id');
    if (!userId) {
        userId = generateUniqueId();
        localStorage.setItem('p2p_user_id', userId);
    }
    return userId;
}

function showToast(title, description, variant = 'default') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    // FIX: The class list is now enclosed in quotes to form a valid string.
    toast.className = 'p-4 rounded-lg shadow-md flex items-center space-x-3 transform translate-x-full transition-all duration-300 ease-out bg-white';

    let bgColor, textColor, iconHtml;
    if (variant === 'destructive') {
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        // FIX: The SVG markup is now a string literal using backticks (`).
        iconHtml = `<svg xmlns="http://www.w.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
    } else {
        bgColor = 'bg-leaf-green';
        textColor = 'text-white';
        // FIX: The SVG markup is now a string literal using backticks (`).
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`;
    }

    toast.innerHTML = `
        <div class="${bgColor} ${textColor} p-2 rounded-full">
            ${iconHtml}
        </div>
        <div>
            <h3 class="font-bold text-lg">${title}</h3>
            <p class="text-sm">${description}</p>
        </div>
    `;
    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 5000);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');

    if (modalId === 'listItemModal') {
        document.getElementById('listItemForm').reset();
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imagePreview').src = '';
        clearFormErrors('listItemForm');
    } else if (modalId === 'rentItemModal') {
        document.getElementById('rentItemForm').reset();
        document.getElementById('calculatedTotalPrice').textContent = '₹0.00';
        clearFormErrors('rentItemForm');
    }
}

function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('.form-error').forEach(el => el.textContent = '');
}

function displayFormError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;

    clearFormErrors(formId);

    inputs.forEach(input => {
        if (!input.value.trim()) {
            displayFormError(input.id, 'This field is required.');
            isValid = false;
        } else if (input.type === 'number' && isNaN(parseFloat(input.value))) {
            displayFormError(input.id, 'Must be a valid number.');
            isValid = false;
        } else if (input.name === 'pricePerDay' && parseFloat(input.value) <= 0) {
            displayFormError(input.id, 'Price must be greater than zero.');
            isValid = false;
        }
    });

    if (formId === 'listItemForm') {
        const startDate = document.getElementById('availabilityStartDate').value;
        const endDate = document.getElementById('availabilityEndDate').value;
        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            displayFormError('availabilityEndDate', 'End date cannot be before start date.');
            isValid = false;
        }
    }

    if (formId === 'rentItemForm') {
        const rentalStartDate = document.getElementById('rentalStartDate').value;
        const rentalEndDate = document.getElementById('rentalEndDate').value;
        if (rentalStartDate && rentalEndDate && new Date(rentalEndDate) < new Date(rentalStartDate)) {
            displayFormError('rentalEndDate', 'End date cannot be before start date.');
            isValid = false;
        }
    }

    return { success: isValid };
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function calculateRentalDays(startDateStr, endDateStr) {
    if (!startDateStr || !endDateStr) return 0;
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    if (endDate < startDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
}

let currentUserId;

document.addEventListener('DOMContentLoaded', () => {
    currentUserId = getOrCreateUserId();
    document.getElementById('userIdDisplay').textContent = currentUserId;
    loadListings();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('listItemBtn').addEventListener('click', () => {
        openModal('listItemModal');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('availabilityStartDate').min = today;
        document.getElementById('availabilityEndDate').min = today;
    });

    document.getElementById('itemImage').addEventListener('change', (event) => {
        const file = event.target.files[0];
        const preview = document.getElementById('imagePreview');
        if (file) {
            const reader = new FileReader();
            reader.abort();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.abort();
            reader.readAsDataURL(file);
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }
    });

    document.getElementById('listItemForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const validationResult = validateForm('listItemForm');

        if (validationResult.success) {
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            data.pricePerDay = parseFloat(data.pricePerDay);

            const imageFile = document.getElementById('itemImage').files[0];
            if (!imageFile) {
                displayFormError('itemImage', 'Please upload an image.');
                return;
            }

            try {
                const imageUrl = await fileToBase64(imageFile);
                const newListing = {
                    id: generateUniqueId(),
                    lenderId: currentUserId,
                    itemName: data.itemName,
                    description: data.description,
                    pricePerDay: data.pricePerDay,
                    images: [imageUrl],
                    location: data.location,
                    availabilityStartDate: data.availabilityStartDate,
                    availabilityEndDate: data.availabilityEndDate,
                    createdAt: new Date().toISOString(),
                    isAvailable: true,
                };
                saveListing(newListing);
                showToast('Success!', 'Your item has been listed for rent.');
                closeModal('listItemModal');
                loadListings();
            } catch (error) {
                console.error("Error processing image:", error);
                showToast('Error', 'Failed to process image. Please try again.', 'destructive');
            }
        } else {
            showToast('Validation Error', 'Please correct the errors in the form.', 'destructive');
        }
    });

    document.getElementById('rentalStartDate').addEventListener('change', updateTotalPrice);
    document.getElementById('rentalEndDate').addEventListener('change', updateTotalPrice);

    document.getElementById('rentItemForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const validationResult = validateForm('rentItemForm');

        if (validationResult.success) {
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            const listingId = document.getElementById('rentModalListingId').value;
            const lenderId = document.getElementById('rentModalLenderId').value;
            const pricePerDay = parseFloat(document.getElementById('rentModalPricePerDay').value);

            const days = calculateRentalDays(data.rentalStartDate, data.rentalEndDate);
            if (days <= 0) {
                displayFormError('rentalEndDate', 'End date must be after or same as start date.');
                showToast('Date Error', 'Please select valid rental dates.', 'destructive');
                return;
            }
            const totalPrice = days * pricePerDay;

            const newRequest = {
                id: generateUniqueId(),
                listingId: listingId,
                lenderId: lenderId,
                renterId: currentUserId,
                renterName: data.renterName,
                renterContact: data.renterContact,
                rentalStartDate: data.rentalStartDate,
                rentalEndDate: data.rentalEndDate,
                totalPrice: totalPrice,
                status: "pending",
                requestDate: new Date().toISOString(),
                deliveryPreference: data.deliveryPreference,
            };
            saveRentalRequest(newRequest);
            showToast('Rental Request Sent!', 'Your request has been sent to the lender.');
            closeModal('rentItemModal');
        } else {
            showToast('Validation Error', 'Please correct the errors in the form.', 'destructive');
        }
    });
}

function updateTotalPrice() {
    const startDate = document.getElementById('rentalStartDate').value;
    const endDate = document.getElementById('rentalEndDate').value;
    const pricePerDay = parseFloat(document.getElementById('rentModalPricePerDay').value || '0');

    const days = calculateRentalDays(startDate, endDate);
    const totalPrice = days * pricePerDay;
    // FIX: The currency symbol is now inside the template literal.
    document.getElementById('calculatedTotalPrice').textContent = `₹${totalPrice.toFixed(2)}`;
}

function getListingsFromLocalStorage() {
    const listingsJson = localStorage.getItem('rentalListings');
    return listingsJson ? JSON.parse(listingsJson) : [];
}

function saveListing(listing) {
    const listings = getListingsFromLocalStorage();
    listings.push(listing);
    localStorage.setItem('rentalListings', JSON.stringify(listings));
}

function saveRentalRequest(request) {
    const requests = getRequestsFromLocalStorage();
    requests.push(request);
    localStorage.setItem('rentalRequests', JSON.stringify(requests));
}

function getRequestsFromLocalStorage() {
    const requestsJson = localStorage.getItem('rentalRequests');
    return requestsJson ? JSON.parse(requestsJson) : [];
}

function loadListings() {
    const listingsContainer = document.getElementById('listingsContainer');
    const loadingIndicator = document.getElementById('loadingListings');
    const noListingsMessage = document.getElementById('noListingsFound');

    loadingIndicator.classList.remove('hidden');
    noListingsMessage.classList.add('hidden');
    listingsContainer.innerHTML = '';

    const listings = getListingsFromLocalStorage();

    setTimeout(() => {
        loadingIndicator.classList.add('hidden');

        if (listings.length === 0) {
            noListingsMessage.classList.remove('hidden');
        } else {
            noListingsMessage.classList.add('hidden');
            listings.forEach(listing => {
                const card = document.createElement('div');
                // FIX: The class list is now enclosed in quotes to form a valid string.
                card.className = 'bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300';
                card.innerHTML = `
                    <img src="${listing.images[0] || 'https://placehold.co/400x300/e0e0e0/000000?text=No+Image'}" alt="${listing.itemName}" class="w-full h-48 object-cover">
                    <div class="p-6">
                        <h3 class="font-poppins font-semibold text-xl text-forest-green mb-2">${listing.itemName}</h3>
                        <p class="text-gray-700 text-sm mb-4 line-clamp-3">${listing.description}</p>
                        <div class="flex items-center justify-between mb-4">
                            <span class="text-2xl font-bold text-leaf-green">₹${listing.pricePerDay.toFixed(2)}<span class="text-base text-gray-500">/day</span></span>
                            <span class="text-sm text-gray-600 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin mr-1"><path d="M12 12.000001s-5-4.5-5-10c0-3.3137085 2.2385763-6 5-6s5 2.6862915 5 6c0 5.5-5 10-5 10z"/><circle cx="12" cy="7" r="3"/></svg>
                                ${listing.location}
                            </span>
                        </div>
                        <div class="text-sm text-gray-500 mb-4">
                            Available: ${new Date(listing.availabilityStartDate).toLocaleDateString()} - ${new Date(listing.availabilityEndDate).toLocaleDateString()}
                        </div>
                        <button class="rent-item-btn w-full bg-agri-orange text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
                            data-listing-id="${listing.id}"
                            data-lender-id="${listing.lenderId}"
                            data-item-name="${listing.itemName}"
                            data-price-per-day="${listing.pricePerDay}"
                            data-availability-start="${listing.availabilityStartDate}"
                            data-availability-end="${listing.availabilityEndDate}">
                            Rent Now
                        </button>
                    </div>
                `;
                listingsContainer.appendChild(card);
            });

            document.querySelectorAll('.rent-item-btn').forEach(button => {
                button.addEventListener('click', (event) => {
                    const btn = event.currentTarget;
                    const listing = {
                        id: btn.dataset.listingId,
                        lenderId: btn.dataset.lenderId,
                        itemName: btn.dataset.itemName,
                        pricePerDay: parseFloat(btn.dataset.pricePerDay),
                        availabilityStartDate: btn.dataset.availabilityStart,
                        availabilityEndDate: btn.dataset.availabilityEnd,
                    };
                    openRentItemModal(listing);
                });
            });
        }
    }, 500);
}

function openRentItemModal(listing) {
    // FIX: The string is now a template literal using backticks (`).
    document.getElementById('rentModalItemName').textContent = `Rent Item: ${listing.itemName}`;
    document.getElementById('rentModalListingId').value = listing.id;
    document.getElementById('rentModalLenderId').value = listing.lenderId;
    document.getElementById('rentModalPricePerDay').value = listing.pricePerDay;

    const today = new Date().toISOString().split('T')[0];
    const rentStartDateInput = document.getElementById('rentalStartDate');
    const rentEndDateInput = document.getElementById('rentalEndDate');

    rentStartDateInput.min = today;
    rentStartDateInput.max = listing.availabilityEndDate;
    rentEndDateInput.min = today;
    rentEndDateInput.max = listing.availabilityEndDate;
    
    rentStartDateInput.value = (listing.availabilityStartDate >= today) ? listing.availabilityStartDate : today;

    // FIX: Corrected the logic for Math.min() by using Date objects.
    const oneWeekFromToday = new Date();
    oneWeekFromToday.setDate(oneWeekFromToday.getDate() + 7);
    
    const availabilityEndDateObj = new Date(listing.availabilityEndDate);
    
    // Determine the earlier of the two possible end dates
    const defaultEndDateObj = oneWeekFromToday < availabilityEndDateObj ? oneWeekFromToday : availabilityEndDateObj;
    
    // Format it back to a YYYY-MM-DD string
    rentEndDateInput.value = defaultEndDateObj.toISOString().split('T')[0];

    updateTotalPrice();
    openModal('rentItemModal');
}