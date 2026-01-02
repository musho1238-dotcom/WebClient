document.getElementById('loginForm').addEventListener('submit', async function (event) {

    event.preventDefault();



    const username = document.getElementById('username').value;

    const password = document.getElementById('password').value;

    const errorMsg = document.getElementById('loginError');



    // Hide previous errors

    errorMsg.style.display = 'none';



    try {

        // --- SERVER COMMUNICATION ---

        const response = await fetch('/api/login', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ username, password })

        });



        if (response.ok) {

            const userData = await response.json();



            // --- SUCCESS ---

            // Save user to SessionStorage (so search.html knows who is logged in)

            sessionStorage.setItem('currentUser', JSON.stringify(userData));



            // Redirect to Search Page

            window.location.href = 'search.html';

        } else {

            // --- FAILURE (401) ---

            errorMsg.style.display = 'block';

        }

    } catch (error) {

        console.error('Error:', error);

        alert("Server connection failed");

    }

});
