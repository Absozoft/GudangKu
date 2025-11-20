window.Barang = (function() {
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
        var opts = { method: method, body: fd };
        if (token) opts.headers = { "Authorization": "Bearer " + token };

        fetch(url, opts)
            .then(function(r) { return r.json(); })
            .then(function(d) {
                if (d.error) { alert(d.error); return; }
                alert(d.message || "Berhasil!");
                document.getElementById("form-barang").reset();
                if (idInput) idInput.value = "";
                loadData();
                window.App.switchView("view-tabel");
                window.App.updateNavBar("nav-tabel");
            })
            .catch(function(e) { alert("Error: " + e); });
    }

    function editItem(id) {
        fetch("/api/barang")
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var b = d.data.find(function(x) { return x.id === id; });
                if (!b) { alert("Not found"); return; }
                document.getElementById("nama-barang").value = b.nama_barang;
                document.getElementById("qty").value = b.qty;
                document.getElementById("harga-barang").value = b.harga_barang;
                document.getElementById("id-barang").value = b.id;
                window.App.switchView("view-tambah");
            })
            .catch(function(e) { console.error(e); });
    }

    function delItem(id) {
        if (!confirm("Yakin mau dihapus?")) return;
        var token = localStorage.getItem("gudang_token");
        fetch("/api/barang/" + id, {
            method: "DELETE",
            headers: { "Authorization": "Bearer " + token }
        })
            .then(function(r) { return r.json(); })
            .then(function(d) { alert(d.message); loadData(); })
            .catch(function(e) { alert("Error: " + e); });
    }

    function setupBarang() {
        var form = document.getElementById("form-barang");
        if (form) form.addEventListener("submit", handleSubmit);
        var exportBtn = document.getElementById("export-excel");
        if (exportBtn) exportBtn.addEventListener("click", exportExcel);
        window.editItem = editItem;
        window.delItem = delItem;
    }

    function exportExcel() {
        var token = localStorage.getItem("gudang_token");
        var headers = {};
        if (token) headers["Authorization"] = "Bearer " + token;

        fetch('/api/barang/export', { method: 'GET', headers: headers })
            .then(function(res) {
                if (!res.ok) throw new Error('Gagal mengunduh file');
                return res.blob();
            })
            .then(function(blob) {
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'barang.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(function(err) { alert('Error: ' + err.message); });
    }

    return { loadData, renderTable, handleSubmit, editItem, delItem, setupBarang };
})();
