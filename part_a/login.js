document.getElementById('loginForm').addEventListener('submit', function (event) {

    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    // Hide previous errors
    errorMsg.style.display = 'none';

    // --- LOCAL STORAGE LOGIC (Replaces Server API) ---

    // 1. Retrieve all registered users from LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];

    // 2. Find a user matching both username and password
    const foundUser = users.find(u => u.username === username && u.password === password);

    if (foundUser) {
        // --- SUCCESS ---

        // Create a user object for the session (excluding the password for safety)
        const userSessionData = {
            firstName: foundUser.firstName,
            username: foundUser.username,
            imageURL: foundUser.imageURL
        };

        // Save current user to SessionStorage
        sessionStorage.setItem('currentUser', JSON.stringify(userSessionData));

        // Redirect to Search Page
        window.location.href = 'search.html';
    } else {
        // --- FAILURE ---
        errorMsg.style.display = 'block';
    }
});