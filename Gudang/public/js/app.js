window.App = (function() {
    function showAuth() {
        document.getElementById("main-header").style.display = "none";
        document.getElementById("main-nav").style.display = "none";
        document.getElementById("main-content").style.display = "none";
        document.getElementById("main-footer").style.display = "none";
        document.getElementById("view-login").classList.add("active");
        Auth.setupAuth();
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

    function setupApp() {
        var navTambah = document.getElementById("nav-tambah");
        var navTabel = document.getElementById("nav-tabel");
        var btnLogout = document.getElementById("btn-logout");

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
        if (btnLogout) {
            btnLogout.addEventListener("click", function() {
                localStorage.clear();
                location.reload();
            });
        }

        updateProfile();
        Barang.setupBarang();
        Barang.loadData();
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

    document.addEventListener("DOMContentLoaded", function() {
        var token = localStorage.getItem("gudang_token");
        var user = localStorage.getItem("gudang_user");

        if (token && user) {
            showApp();
        } else {
            showAuth();
        }
    });

    return { showApp, showAuth, updateProfile, switchView, updateNavBar, setupApp };
})();
