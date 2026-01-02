document.getElementById('registerForm').addEventListener('submit', async function (event) {
    // 1. Prevent page reload
    event.preventDefault();

    // 2. Clear previous error messages
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

    // 3. Get values
    const firstName = document.getElementById('firstName').value;
    const username = document.getElementById('username').value;
    const imageURL = document.getElementById('imageURL').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // --- CLIENT-SIDE VALIDATION ---
    // We keep these checks here to give fast feedback to the user 
    // before sending data to the server.

    // A. Password Length
    if (password.length < 6) {
        document.getElementById('passwordComplexityError').style.display = 'block';
        return;
    }

    // B. Password Complexity Regex
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

    // --- SERVER COMMUNICATION (NEW) ---

    try {
        // 4. Send POST request to the Node.js server
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Send the data as a JSON string
            body: JSON.stringify({
                firstName: firstName,
                username: username,
                imageURL: imageURL,
                password: password
            })
        });

        // 5. Handle the response
        const data = await response.json();

        if (response.ok) {
            // Success (HTTP 200-299)
            alert('Registration successful! Redirecting to login...');
            window.location.href = 'login.html';
        } else {
            // Error Handling
            if (response.status === 409) {
                // 409 Conflict = Username already exists (as defined in server.js)
                document.getElementById('userExistsError').style.display = 'block';
            } else {
                // General server error
                alert('Error: ' + (data.error || 'Registration failed'));
            }
        }

    } catch (error) {
        // Network error (e.g., server is down)
        console.error('Error:', error);
        alert('Connection to server failed. Please ensure the server is running.');
    }
});