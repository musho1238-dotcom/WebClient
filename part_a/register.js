document.getElementById('registerForm').addEventListener('submit', function (event) {
    // 1. Prevent page reload
    event.preventDefault();

    // 2. Clear previous error messages
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

    // 3. Get values from UI
    const firstName = document.getElementById('firstName').value;
    const username = document.getElementById('username').value;
    const imageURL = document.getElementById('imageURL').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // --- VALIDATION ---

    // A. Password Length
    if (password.length < 6) {
        document.getElementById('passwordComplexityError').style.display = 'block';
        return;
    }

    // B. Password Complexity Regex (Letter + Number + Special Char)
    const complexityRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/;
    if (!complexityRegex.test(password)) {
        document.getElementById('passwordComplexityError').style.display = 'block';
        return;
    }

    // C. Password Match
    if (password !== confirmPassword) {
        document.getElementById('passwordMatchError').style.display = 'block';
        return;
    }

    // --- LOCAL STORAGE LOGIC (Replaces Server API) ---

    // 1. Get existing users list or initialize empty array
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // 2. Check if username already exists
    const userExists = users.some(u => u.username === username);
    if (userExists) {
        document.getElementById('userExistsError').style.display = 'block';
        return;
    }

    // 3. Add new user to the list
    users.push({
        firstName: firstName,
        username: username,
        imageURL: imageURL,
        password: password // In a real app, passwords should be encrypted
    });

    // 4. Save updated list back to LocalStorage
    localStorage.setItem('users', JSON.stringify(users));

    // 5. Success feedback
    alert('Registration successful! Redirecting to login...');
    window.location.href = 'login.html';
});