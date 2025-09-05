document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html' || currentPage === '') {
        handleLoginPage();
    } else if (currentPage === 'register.html') {
        handleRegisterPage();
    } else if (currentPage === 'dashboard.html') {
        handleDashboardPage();
    }
});

/**
 * Displays a message on a given HTML element.
 * @param {HTMLElement} element The HTML element to display the message in.
 * @param {string} message The message text.
 * @param {boolean} isError True if it's an error message, false for success.
 */
function showMessage(element, message, isError) {
    if (element) {
        element.textContent = message;
        element.className = 'message ' + (isError ? 'error' : 'success');
        element.style.display = message.trim() === '' ? 'none' : 'block';
    } else {
        console.warn('showMessage: Target element is null!', message);
    }
}

/**
 * Handles the login page functionality.
 */
async function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMessage(loginMessage, '', false); // Clear previous messages

            const data = {
                username: loginUsernameInput.value,
                password: loginPasswordInput.value
            };

            try {
                const response = await fetch('http://localhost:5000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('username', result.username);
                    localStorage.setItem('role', result.role);
                    showMessage(loginMessage, result.message || 'Login successful!', false);
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 500);
                } else {
                    handleApiError(result, loginMessage, 'Login failed.');
                }
            } catch (error) {
                console.error('Error during login:', error);
                showMessage(loginMessage, 'Network error. Please try again.', true);
            }
        });
    }
}

/**
 * Handles the registration page functionality.
 */
async function handleRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMessage(registerMessage, '', false); // Clear previous messages

            const data = {
                username: document.getElementById('regUsername').value,
                full_name: document.getElementById('regFullName').value,
                email: document.getElementById('regEmail').value,
                phone_number: document.getElementById('regPhone').value,
                password: document.getElementById('regPassword').value,
                role: document.getElementById('regRole').value,
                address: document.getElementById('regAddress').value,
                city: document.getElementById('regCity').value,
                state: document.getElementById('regState').value,
                pincode: document.getElementById('regPincode').value
            };

            try {
                const response = await fetch('http://localhost:5000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(registerMessage, result.message || 'Registration successful! You can now login.', false);
                    registerForm.reset();
                    setTimeout(() => {
                        window.location.href = 'index.html'; // Redirect to login after successful registration
                    }, 2000);
                } else {
                    handleApiError(result, registerMessage, 'Registration failed.');
                }
            } catch (error) {
                console.error('Error during registration:', error);
                showMessage(registerMessage, 'Network error. Please try again.', true);
            }
        });
    }
}

/**
 * Handles the dashboard page functionality.
 */
async function handleDashboardPage() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const userRole = localStorage.getItem('role');

    // Element references
    const usernameDisplay = document.getElementById('usernameDisplay');
    const roleDisplay = document.getElementById('roleDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardMessage = document.getElementById('dashboardMessage');

    // Farmer specific elements
    const farmerCreateRequestSection = document.getElementById('farmerCreateRequestSection');
    const createRequestForm = document.getElementById('createRequestForm');
    const createRequestMessage = document.getElementById('createRequestMessage');
    const farmerMyRequestsSection = document.getElementById('farmerMyRequestsSection');
    const myRequestsList = document.getElementById('myRequestsList');
    const myRequestsMessage = document.getElementById('myRequestsMessage');

    // Service Provider specific elements
    const availableRequestsSection = document.getElementById('availableRequestsSection');
    const availableRequestsList = document.getElementById('availableRequestsList');
    const availableRequestsMessage = document.getElementById('availableRequestsMessage');
    const myOffersSection = document.getElementById('myOffersSection');
    const myOffersList = document.getElementById('myOffersList');
    const myOffersMessage = document.getElementById('myOffersMessage');

    // Offer Modal Elements
    const makeOfferModal = document.getElementById('makeOfferModal');
    const closeOfferModalButton = document.querySelector('#makeOfferModal .close-button');
    const makeOfferForm = document.getElementById('makeOfferForm');
    const offerRequestIdInput = document.getElementById('offerRequestId');
    const offerRequestIdDisplay = document.getElementById('offerRequestIdDisplay');
    const offerServiceTypeDisplay = document.getElementById('offerServiceTypeDisplay');
    const offerFarmerBudgetDisplay = document.getElementById('offerFarmerBudgetDisplay');
    const makeOfferMessage = document.getElementById('makeOfferMessage');

    // Redirect if no token
    if (!token) {
        console.log('No token found. Redirecting to login.');
        window.location.href = 'index.html';
        return;
    }

    // Display username and role
    if (usernameDisplay) usernameDisplay.textContent = username;
    if (roleDisplay) roleDisplay.textContent = userRole;

    // Logout button handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            localStorage.removeItem('role');
            window.location.href = 'index.html';
        });
    }

    // --- Role-based section visibility and data fetching ---
    if (userRole === 'farmer') {
        if (farmerCreateRequestSection) farmerCreateRequestSection.style.display = 'block';
        if (farmerMyRequestsSection) farmerMyRequestsSection.style.display = 'block';
        if (availableRequestsSection) availableRequestsSection.style.display = 'none';
        if (myOffersSection) myOffersSection.style.display = 'none';

        await fetchFarmerServiceRequests(token, myRequestsList, myRequestsMessage);
    } else if (userRole === 'service_provider' || userRole === 'tractor_owner') {
        if (farmerCreateRequestSection) farmerCreateRequestSection.style.display = 'none';
        if (farmerMyRequestsSection) farmerMyRequestsSection.style.display = 'none';
        if (availableRequestsSection) availableRequestsSection.style.display = 'block';
        if (myOffersSection) myOffersSection.style.display = 'block';

        await fetchAvailableServiceRequests(token, availableRequestsList, availableRequestsMessage);
        await fetchMyOffers(token, myOffersList, myOffersMessage);
    } else {
        if (farmerCreateRequestSection) farmerCreateRequestSection.style.display = 'none';
        if (farmerMyRequestsSection) farmerMyRequestsSection.style.display = 'none';
        if (availableRequestsSection) availableRequestsSection.style.display = 'none';
        if (myOffersSection) myOffersSection.style.display = 'none';
        console.warn('Unknown user role:', userRole);
        showMessage(dashboardMessage, 'Invalid role. Please contact support.', true);
    }

    // --- Create Request Form Handling (Farmer) ---
    if (createRequestForm) {
        createRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMessage(createRequestMessage, '', false); // Clear previous messages

            const formData = new FormData(createRequestForm);
            const data = Object.fromEntries(formData.entries());

            // Convert numerical fields
            data.location_lat = parseFloat(data.location_lat);
            data.location_lon = parseFloat(data.location_lon);
            data.budget = parseFloat(data.budget);

            try {
                const response = await fetch('http://localhost:5000/api/service-requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(createRequestMessage, result.message || 'Service request created successfully!', false);
                    createRequestForm.reset(); // Clear form
                    await fetchFarmerServiceRequests(token, myRequestsList, myRequestsMessage); // Refresh farmer's requests
                } else {
                    handleApiError(result, createRequestMessage, 'Failed to create service request.');
                }
            } catch (error) {
                console.error('Error creating service request:', error);
                showMessage(createRequestMessage, 'Network error. Please try again.', true);
            }
        });
    }

    /**
     * Fetches and displays service requests for a farmer.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} containerElement The element to display requests in.
     * @param {HTMLElement} messageElement The element to display messages.
     */
    async function fetchFarmerServiceRequests(token, containerElement, messageElement) {
        if (!containerElement) {
            console.warn('fetchFarmerServiceRequests: containerElement is null or undefined.');
            return;
        }
        containerElement.innerHTML = '<p>Loading your requests...</p>';
        showMessage(messageElement, '', false); // Clear message area
        try {
            const response = await fetch('http://localhost:5000/api/service-requests/my-requests', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (response.ok) {
                if (result.requests && result.requests.length > 0) {
                    containerElement.innerHTML = '';
                    result.requests.forEach(request => {
                        const requestCard = createRequestCard(request, true, token, myRequestsList, myRequestsMessage);
                        containerElement.appendChild(requestCard);
                    });
                    showMessage(messageElement, `Found ${result.count} of your service requests.`, false);
                } else {
                    containerElement.innerHTML = '<p>You have not posted any service requests yet.</p>';
                    showMessage(messageElement, 'No requests found.', false);
                }
            } else {
                containerElement.innerHTML = '<p>Failed to load your requests.</p>';
                handleApiError(result, messageElement, 'Error loading your requests.');
            }
        } catch (error) {
            console.error('Error fetching farmer service requests:', error);
            containerElement.innerHTML = '<p>Network error loading your requests.</p>';
            showMessage(messageElement, 'Network error loading your requests.', true);
        }
    }

    /**
     * Creates an HTML card for a service request.
     * @param {Object} request The service request object.
     * @param {boolean} isFarmerView True if viewed by a farmer (shows offers), false otherwise.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} myRequestsList (Only for farmer view) The list to refresh after offer status change.
     * @param {HTMLElement} myRequestsMessage (Only for farmer view) The message element to update.
     * @returns {HTMLElement} The created request card element.
     */
    function createRequestCard(request, isFarmerView = false, token = null, myRequestsList = null, myRequestsMessage = null) {
        const requestCard = document.createElement('div');
        requestCard.className = 'request-card';
        const displayDate = request.required_date ? new Date(request.required_date).toLocaleDateString() : 'N/A';
        const farmerBudget = parseFloat(request.budget).toFixed(2);

        requestCard.innerHTML = `
            <h3>${request.service_type} (ID: ${request.id})</h3>
            <p><strong>Description:</strong> ${request.description}</p>
            <p><strong>Location:</strong> Lat: ${request.location_lat}, Lon: ${request.location_lon}</p>
            <p><strong>Required By:</strong> ${displayDate}</p>
            <p><strong>Budget:</strong> INR ${farmerBudget}</p>
            <p><strong>Status:</strong> <span class="status-${request.status}">${request.status}</span></p>
        `;

        if (isFarmerView && request.offers && request.offers.length > 0) {
            const offersContainer = document.createElement('div');
            offersContainer.className = 'offers-for-request';
            offersContainer.innerHTML = '<h4>Offers:</h4>';

            request.offers.forEach(offer => {
                const offerDetail = document.createElement('div');
                offerDetail.className = 'offer-detail';
                offerDetail.innerHTML = `
                    <p><strong>Service Provider:</strong> ${offer.service_provider_username}</p>
                    <p><strong>Offered Price:</strong> INR ${parseFloat(offer.offered_price).toFixed(2)}</p>
                    <p><strong>Estimated Cost:</strong> INR ${parseFloat(offer.estimated_cost).toFixed(2)}</p>
                    <p><strong>Notes:</strong> ${offer.notes || 'N/A'}</p>
                    <p><strong>Offer Status:</strong> <span class="status-${offer.status}">${offer.status}</span></p>
                `;
                // Only show buttons if both request and offer are pending
                if (offer.status === 'pending' && request.status === 'pending') {
                    const acceptButton = document.createElement('button');
                    acceptButton.className = 'button accept-offer-btn';
                    acceptButton.textContent = 'Accept Offer';
                    acceptButton.dataset.offerId = offer.id;
                    acceptButton.addEventListener('click', async () => {
                        // Corrected call to acceptOffer (removed 'status' param)
                        await acceptOffer(offer.id, token, myRequestsList, myRequestsMessage);
                    });

                    const rejectButton = document.createElement('button');
                    rejectButton.className = 'button reject-offer-btn';
                    rejectButton.textContent = 'Reject Offer';
                    rejectButton.dataset.offerId = offer.id;
                    rejectButton.addEventListener('click', async () => {
                        // Corrected call to rejectOffer (removed 'status' param)
                        await rejectOffer(offer.id, token, myRequestsList, myRequestsMessage);
                    });

                    offerDetail.appendChild(acceptButton);
                    offerDetail.appendChild(rejectButton);
                }
                offersContainer.appendChild(offerDetail);
            });
            requestCard.appendChild(offersContainer);
        } else if (!isFarmerView && makeOfferModal && request.status === 'pending') { // Only show make offer button if request is pending
            const makeOfferButton = document.createElement('button');
            makeOfferButton.className = 'make-offer-btn button';
            makeOfferButton.textContent = 'Make Offer';
            makeOfferButton.dataset.requestId = request.id;
            makeOfferButton.dataset.serviceType = request.service_type;
            makeOfferButton.dataset.farmerBudget = farmerBudget;
            makeOfferButton.addEventListener('click', () => {
                if (offerRequestIdInput) offerRequestIdInput.value = request.id;
                if (offerRequestIdDisplay) offerRequestIdDisplay.textContent = request.id;
                if (offerServiceTypeDisplay) offerServiceTypeDisplay.textContent = request.service_type;
                if (offerFarmerBudgetDisplay) offerFarmerBudgetDisplay.textContent = farmerBudget;

                if (makeOfferMessage) showMessage(makeOfferMessage, '', false);
                if (makeOfferForm) makeOfferForm.reset();

                if (makeOfferModal) makeOfferModal.style.display = 'flex';
            });
            requestCard.appendChild(makeOfferButton);
        }

        return requestCard;
    }


    /**
     * Accepts an offer.
     * @param {number} offerId The ID of the offer to accept.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} myRequestsList The list to refresh after update.
     * @param {HTMLElement} myRequestsMessage The message element to update.
     */
    async function acceptOffer(offerId, token, myRequestsList, myRequestsMessage) { // Renamed from updateOfferStatus
        try {
            // Updated endpoint: No /status, direct to /accept
            const response = await fetch(`http://localhost:5000/api/offers/${offerId}/accept`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
                // No body needed for this endpoint
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(myRequestsMessage, result.message || `Offer accepted successfully!`, false);
                await fetchFarmerServiceRequests(token, myRequestsList, myRequestsMessage); // Refresh farmer's requests
            } else {
                handleApiError(result, myRequestsMessage, `Failed to accept offer.`);
            }
        } catch (error) {
            console.error(`Error accepting offer:`, error);
            showMessage(myRequestsMessage, 'Network error accepting offer. Please try again.', true);
        }
    }

    /**
     * Rejects an offer.
     * @param {number} offerId The ID of the offer to reject.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} myRequestsList The list to refresh after update.
     * @param {HTMLElement} myRequestsMessage The message element to update.
     */
    async function rejectOffer(offerId, token, myRequestsList, myRequestsMessage) { // Renamed from updateOfferStatus
        try {
            // Updated endpoint: No /status, direct to /reject
            const response = await fetch(`http://localhost:5000/api/offers/${offerId}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
                // No body needed for this endpoint
            });

            const result = await response.json();

            if (response.ok) {
                showMessage(myRequestsMessage, result.message || `Offer rejected successfully!`, false);
                await fetchFarmerServiceRequests(token, myRequestsList, myRequestsMessage); // Refresh farmer's requests
            } else {
                handleApiError(result, myRequestsMessage, `Failed to reject offer.`);
            }
        } catch (error) {
            console.error(`Error rejecting offer:`, error);
            showMessage(myRequestsMessage, 'Network error rejecting offer. Please try again.', true);
        }
    }


    /**
     * Fetches and displays available service requests for service providers.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} containerElement The element to display requests in.
     * @param {HTMLElement} messageElement The element to display messages.
     */
    async function fetchAvailableServiceRequests(token, containerElement, messageElement) {
        if (!containerElement) {
            console.warn('fetchAvailableServiceRequests: containerElement is null or undefined.');
            return;
        }
        containerElement.innerHTML = '<p>Loading available requests...</p>';
        showMessage(messageElement, '', false); // Clear message area
        try {
            const response = await fetch('http://localhost:5000/api/service-requests', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (response.ok) {
                if (result.requests && result.requests.length > 0) {
                    containerElement.innerHTML = '';
                    result.requests.forEach(request => {
                        const requestCard = createRequestCard(request, false, token, null, null); // Not farmer view
                        containerElement.appendChild(requestCard);
                    });
                    showMessage(messageElement, `Found ${result.count} available requests.`, false);
                } else {
                    containerElement.innerHTML = '<p>No available service requests at the moment.</p>';
                    showMessage(messageElement, 'No available requests found.', false);
                }
            } else {
                containerElement.innerHTML = '<p>Failed to load available requests.</p>';
                handleApiError(result, messageElement, 'Error loading available requests.');
            }
        } catch (error) {
            console.error('Error fetching available service requests:', error);
            containerElement.innerHTML = '<p>Network error loading available requests.</p>';
            showMessage(messageElement, 'Network error loading available requests.', true);
        }
    }

    /**
     * Fetches and displays offers made by the service provider.
     * @param {string} token User's authentication token.
     * @param {HTMLElement} containerElement The element to display offers in.
     * @param {HTMLElement} messageElement The element to display messages.
     */
    async function fetchMyOffers(token, containerElement, messageElement) {
        if (!containerElement) {
            console.warn('fetchMyOffers: containerElement is null or undefined.');
            return;
        }
        containerElement.innerHTML = '<p>Loading your offers...</p>';
        showMessage(messageElement, '', false); // Clear message area
        try {
            // NOTE: Your backend has `/api/offers` for fetching all offers based on role.
            // If you had a specific `/api/offers/my` route that only returned offers
            // made by the authenticated SP/Tractor Owner, this would be fine.
            // But based on your `getOffers` in offerController.js, `/api/offers` already handles this.
            const response = await fetch('http://localhost:5000/api/offers', { // Changed from /api/offers/my
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const result = await response.json();

            if (response.ok) {
                if (result.offers && result.offers.length > 0) {
                    containerElement.innerHTML = '';
                    result.offers.forEach(offer => {
                        const offerCard = document.createElement('div');
                        offerCard.className = 'offer-card';
                        offerCard.innerHTML = `
                            <h3>Offer for Req ID: ${offer.request_id}</h3>
                            <p><strong>Service Type:</strong> ${offer.service_type || 'N/A'}</p>
                            <p><strong>Farmer:</strong> ${offer.farmer_username || 'N/A'}</p>
                            <p><strong>Your Offered Price:</strong> INR ${parseFloat(offer.offered_price).toFixed(2)}</p>
                            <p><strong>Your Estimated Cost:</strong> INR ${parseFloat(offer.estimated_cost).toFixed(2)}</p>
                            <p><strong>Notes:</strong> ${offer.notes || 'N/A'}</p>
                            <p><strong>Status:</strong> <span class="status-${offer.status}">${offer.status}</span></p>
                            <p><strong>Request Status:</strong> <span class="status-${offer.request_status}">${offer.request_status}</span></p>
                        `;
                        containerElement.appendChild(offerCard);
                    });
                    showMessage(messageElement, `Found ${result.count} of your offers.`, false);
                } else {
                    containerElement.innerHTML = '<p>You have not made any offers yet.</p>';
                    showMessage(messageElement, 'No offers found.', false);
                }
            } else {
                containerElement.innerHTML = '<p>Failed to load your offers.</p>';
                handleApiError(result, messageElement, 'Error loading your offers.');
            }
        } catch (error) {
            console.error('Error fetching service provider offers:', error);
            containerElement.innerHTML = '<p>Network error loading your offers.</p>';
            showMessage(messageElement, 'Network error loading your offers.', true);
        }
    }

    // --- Make Offer Modal and Form Handling ---
    if (makeOfferModal) {
        if (closeOfferModalButton) {
            closeOfferModalButton.addEventListener('click', () => {
                makeOfferModal.style.display = 'none';
                showMessage(makeOfferMessage, '', false);
                if (makeOfferForm) makeOfferForm.reset();
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target == makeOfferModal) {
                makeOfferModal.style.display = 'none';
                showMessage(makeOfferMessage, '', false);
                if (makeOfferForm) makeOfferForm.reset();
            }
        });
    }

    // --- Offer Submission Logic ---
    if (makeOfferForm) {
        makeOfferForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showMessage(makeOfferMessage, '', false); // Clear previous messages

            const formData = new FormData(makeOfferForm);
            const data = Object.fromEntries(formData.entries());

            // Convert numerical fields
            data.request_id = parseInt(data.request_id);
            data.offered_price = parseFloat(data.offered_price);
            data.estimated_cost = parseFloat(data.estimated_cost);

            try {
                const response = await fetch('http://localhost:5000/api/offers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showMessage(makeOfferMessage, result.message || 'Offer submitted successfully!', false);
                    makeOfferForm.reset();
                    // Refresh available requests and my offers lists
                    await fetchAvailableServiceRequests(token, availableRequestsList, availableRequestsMessage);
                    await fetchMyOffers(token, myOffersList, myOffersMessage);
                } else {
                    handleApiError(result, makeOfferMessage, 'Failed to submit offer.');
                }
            } catch (error) {
                console.error('Error submitting offer:', error);
                showMessage(makeOfferMessage, 'Network error. Please try again.', true);
            }
        });
    }

    /**
     * Helper function to handle API errors and display appropriate messages.
     * @param {Object} result The JSON response from the API.
     * @param {HTMLElement} messageElement The element to display the error message.
     * @param {string} defaultMessage A default message if no specific error message is found.
     */
    function handleApiError(result, messageElement, defaultMessage) {
        if (result && result.errors && typeof result.errors === 'object') {
            const errorMessages = Object.values(result.errors).map(err => err.msg || err).join('\n');
            showMessage(messageElement, `Validation Errors:\n${errorMessages}`, true);
        } else {
            showMessage(messageElement, result.message || defaultMessage, true);
        }
    }

} // End of handleDashboardPage function