document.addEventListener("DOMContentLoaded", function() {
    var token = localStorage.getItem("gudang_token");
    var user = localStorage.getItem("gudang_user");
    
    if (token && user) {
        showApp();
    } else {
        showAuth();
    }
    
    function showAuth() {
        document.getElementById("main-header").style.display = "none";
        document.getElementById("main-nav").style.display = "none";
        document.getElementById("main-content").style.display = "none";
        document.getElementById("main-footer").style.display = "none";
        document.getElementById("view-login").classList.add("active");
        setupAuth();
    }
    
    function showApp() {
        document.getElementById("main-header").style.display = "block";
        document.getElementById("main-nav").style.display = "block";
        document.getElementById("main-content").style.display = "block";
        document.getElementById("main-footer").style.display = "block";
        document.getElementById("view-login").classList.remove("active");
        document.getElementById("view-register").classList.remove("active");
        setupApp();
    }
    
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
                    console.log("Login response data:", data);
                    console.log("User object:", data.user);
                    localStorage.setItem("gudang_token", data.token);
                    localStorage.setItem("gudang_user", JSON.stringify(data.user));
                    console.log("Stored gudang_user:", localStorage.getItem("gudang_user"));
                    location.reload();
                })
                .catch(function(e) { alert("Error: " + e); });
            });
        }
        
        var regForm = document.getElementById("form-register");
        if (regForm) {
            regForm.addEventListener("submit", function(e) {
                e.preventDefault();
                var username = document.getElementById("reg-username").value;
                var password = document.getElementById("reg-password").value;
                fetch("/api/auth/register", {
                    method: "POST", 
                    headers: {"Content-Type": "application/json"}, 
                    body: JSON.stringify({username: username, password: password})
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.error) { alert(data.error); return; }
                    alert("Register berhasil! Silakan login.");
                    document.getElementById("form-register").reset();
                    document.getElementById("view-login").classList.add("active");
                    document.getElementById("view-register").classList.remove("active");
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
    
    function setupApp() {
        var navTambah = document.getElementById("nav-tambah");
        var navTabel = document.getElementById("nav-tabel");
        var btnLogout = document.getElementById("btn-logout");
        var form = document.getElementById("form-barang");
        
        if (navTambah) {
            navTambah.addEventListener("click", function() { 
                switchView("view-tambah");
                updateNavBar("nav-tambah");
            });
        }
        if (navTabel) {
            navTabel.addEventListener("click", function() { 
                switchView("view-tabel");
                updateNavBar("nav-tabel");
            });
        }
        if (form) {
            form.addEventListener("submit", handleSubmit);
        }
        if (btnLogout) {
            btnLogout.addEventListener("click", function() {
                localStorage.clear();
                location.reload();
            });
        }
        
        updateProfile();
        loadData();
    }
    
    function updateNavBar(activeId) {
        var navButtons = document.querySelectorAll(".nav-btn");
        navButtons.forEach(function(btn) { btn.classList.remove("active"); });
        var activeBtn = document.getElementById(activeId);
        if (activeBtn) activeBtn.classList.add("active");
    }
    
    function updateProfile() {
        var user = JSON.parse(localStorage.getItem("gudang_user") || "null");
        if (!user) return;
        
        var profileName = document.getElementById("profile-name");
        var profileRole = document.getElementById("profile-role");
        var profileAvatar = document.getElementById("profile-avatar");
        var profileLogout = document.getElementById("profile-logout");
        
        if (profileName) profileName.textContent = user.username;
        if (profileRole) profileRole.textContent = user.role === "admin" ? "Administrator" : "User";
        if (profileAvatar) profileAvatar.textContent = user.username.charAt(0).toUpperCase();
        
        if (profileLogout) {
            profileLogout.addEventListener("click", function(e) {
                e.preventDefault();
                localStorage.clear();
                location.reload();
            });
        }
    }
    
    function switchView(viewName) {
        var sections = document.querySelectorAll(".view-section");
        sections.forEach(function(s) { s.classList.remove("active"); });
        var view = document.getElementById(viewName);
        if (view) view.classList.add("active");
    }
    
    function loadData() {
        fetch("/api/barang")
            .then(function(r) { return r.json(); })
            .then(function(d) { renderTable(d.data || []); })
            .catch(function(e) { console.error(e); });
    }
    
    function renderTable(data) {
        var tbody = document.getElementById("tabel-barang");
        if (!tbody) return;
        tbody.innerHTML = "";
        var user = JSON.parse(localStorage.getItem("gudang_user") || "null");
        var isAdmin = user && user.role === "admin";
        
        console.log("=== RENDER TABLE DEBUG ===");
        console.log("gudang_user from localStorage:", localStorage.getItem("gudang_user"));
        console.log("Parsed user:", user);
        console.log("User role:", user ? user.role : "null");
        console.log("IsAdmin:", isAdmin);
        console.log("========================");
        
        if (!data || data.length === 0) { 
            tbody.innerHTML = "<tr><td colspan=\"6\" style=\"text-align:center\">Tidak ada data</td></tr>"; 
            return; 
        }
        
        data.forEach(function(b, i) {
            var imgHtml = "-";
            if (b.gambar) {
                var imgSrc = b.gambar.startsWith("http") ? b.gambar : b.gambar;
                imgHtml = "<img src=\"" + imgSrc + "\" class=\"thumb\" style=\"max-width:50px; max-height:50px; object-fit:cover;\">";
            }
            var row = "<tr><td>" + (i+1) + "</td><td>" + imgHtml + "</td><td>" + b.nama_barang + "</td><td>" + b.qty + "</td><td>Rp " + Number(b.harga_barang).toLocaleString("id-ID") + "</td><td>";
            if (isAdmin) {
                row += "<button class=\"btn btn-warning\" onclick=\"editItem(" + b.id + ")\">Edit</button> <button class=\"btn btn-danger\" onclick=\"delItem(" + b.id + ")\">Hapus</button>";
            } else {
                row += "<button class=\"btn btn-warning\" onclick=\"editItem(" + b.id + ")\">Edit</button>";
            }
            row += "</td></tr>";
            tbody.innerHTML += row;
        });
    }
    
    function handleSubmit(e) {
        e.preventDefault();
        var idInput = document.getElementById("id-barang");
        var id = idInput ? idInput.value : "";
        var url = id ? "/api/barang/" + id : "/api/barang";
        var method = id ? "PUT" : "POST";
        
        var fd = new FormData();
        fd.append("nama_barang", document.getElementById("nama-barang").value);
        fd.append("qty", document.getElementById("qty").value);
        fd.append("harga_barang", document.getElementById("harga-barang").value);
        
        var file = document.getElementById("gambar");
        if (file && file.files[0]) fd.append("gambar", file.files[0]);
        
        var token = localStorage.getItem("gudang_token");
        var opts = {method: method, body: fd};
        if (token) opts.headers = {"Authorization": "Bearer " + token};
        
        fetch(url, opts)
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.error) { alert(d.error); return; }
                alert(d.message || "Berhasil!");
                document.getElementById("form-barang").reset();
                if (idInput) idInput.value = "";
                loadData();
                switchView("view-tabel");
                updateNavBar("nav-tabel");
            })
            .catch(function(e) { alert("Error: " + e); });
    }
    
    window.editItem = function(id) {
        fetch("/api/barang")
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var b = d.data.find(function(x) { return x.id === id; });
                if (!b) { alert("Not found"); return; }
                document.getElementById("nama-barang").value = b.nama_barang;
                document.getElementById("qty").value = b.qty;
                document.getElementById("harga-barang").value = b.harga_barang;
                document.getElementById("id-barang").value = b.id;
                switchView("view-tambah");
            })
            .catch(function(e) { console.error(e); });
    };
    
    window.delItem = function(id) {
        if (!confirm("Yakin mau dihapus?")) return;
        var token = localStorage.getItem("gudang_token");
        fetch("/api/barang/" + id, {
            method: "DELETE", 
            headers: {"Authorization": "Bearer " + token}
        })
            .then(function(r) { return r.json(); })
            .then(function(d) { alert(d.message); loadData(); })
            .catch(function(e) { alert("Error: " + e); });
    };
});
