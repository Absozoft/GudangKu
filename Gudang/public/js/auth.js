window.Auth = (function() {
    function setupAuth() {
        var loginForm = document.getElementById("form-login");
        if (loginForm) {
            loginForm.addEventListener("submit", function(e) {
                e.preventDefault();
                var username = document.getElementById("login-username").value;
                var password = document.getElementById("login-password").value;
                fetch("/api/auth/login", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({username: username, password: password})
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.error) { alert(data.error); return; }
                    localStorage.setItem("gudang_token", data.token);
                    localStorage.setItem("gudang_user", JSON.stringify(data.user));
                    location.reload();
                })
                .catch(function(e) { alert("Error: " + e); });
            });
        }

        var regForm = document.getElementById("form-register");
        if (regForm) {
            regForm.addEventListener("submit", function(e) {
                    e.preventDefault();
                    var currentUser = JSON.parse(localStorage.getItem("gudang_user") || "null");
                    var token = localStorage.getItem("gudang_token");
                    if (!currentUser || !token || currentUser.role !== 'admin') {
                        alert('Akses ditolak: hanya admin yang dapat mendaftarkan pengguna. Silakan login sebagai admin.');
                        return;
                    }
                    var username = document.getElementById("reg-username").value;
                    var password = document.getElementById("reg-password").value;
                    fetch("/api/auth/register", {
                        method: "POST",
                        headers: {"Content-Type": "application/json", "Authorization": "Bearer " + token},
                        body: JSON.stringify({username: username, password: password})
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(data) {
                        if (data.error) { alert(data.error); return; }
                        alert("Register berhasil!");
                        document.getElementById("form-register").reset();
                    })
                    .catch(function(e) { alert("Error: " + e); });
                });
        }

        var switchReg = document.getElementById("switch-to-register");
        if (switchReg) {
            switchReg.addEventListener("click", function(e) {
                e.preventDefault();
                document.getElementById("view-login").classList.remove("active");
                document.getElementById("view-register").classList.add("active");
            });
        }

        var switchLog = document.getElementById("switch-to-login");
        if (switchLog) {
            switchLog.addEventListener("click", function(e) {
                e.preventDefault();
                document.getElementById("view-register").classList.remove("active");
                document.getElementById("view-login").classList.add("active");
            });
        }
    }

    return { setupAuth };
})();
