# AL ANSHOR VEO GENERATOR - Panduan Pemasangan

Panduan ini memberikan instruksi langkah demi langkah untuk memasang aplikasi AL ANSHOR VEO GENERATOR di VPS Ubuntu, memastikannya berjalan 24/7 menggunakan PM2 dan disajikan secara aman melalui Nginx.

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- VPS Ubuntu (disarankan 20.04 LTS atau yang lebih baru).
- Pengguna dengan hak akses `sudo`.
- Nama domain yang mengarah ke alamat IP VPS Anda (opsional, tetapi diperlukan untuk SSL).

## Pemasangan Langkah demi Langkah

### Langkah 1: Hubungkan ke VPS Anda
Hubungkan ke server Anda menggunakan SSH. Ganti `ALAMAT_IP_VPS_ANDA` dengan alamat IP server Anda.
```bash
ssh root@ALAMAT_IP_VPS_ANDA
```

### Langkah 2: Perbarui Sistem Anda
Pastikan semua paket sistem Anda sudah yang terbaru.
```bash
sudo apt update && sudo apt upgrade -y
```

### Langkah 3: Instal Node.js
Kita akan menginstal Node.js v18.x, yang merupakan versi Long Term Support (LTS) yang stabil.
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```
Verifikasi instalasi:
```bash
node -v  # Harus menunjukkan v18.x.x
npm -v   # Harus menunjukkan versi npm yang kompatibel
```

### Langkah 4: Instal PM2 dan Serve
PM2 adalah manajer proses yang akan menjaga aplikasi kita tetap berjalan terus-menerus. `serve` adalah server statis sederhana.
```bash
sudo npm install pm2 -g
sudo npm install serve -g
```

### Langkah 5: Instal Nginx
Nginx akan bertindak sebagai reverse proxy, mengarahkan lalu lintas dari internet publik ke aplikasi kita yang sedang berjalan.
```bash
sudo apt install nginx -y
```

### Langkah 6: Unggah Kode Aplikasi
Buat direktori untuk aplikasi dan navigasikan ke dalamnya.
```bash
sudo mkdir -p /var/www/veo-generator
cd /var/www/veo-generator
```
Sekarang, Anda perlu mengunggah file aplikasi Anda (seluruh folder proyek) ke direktori ini. Anda dapat menggunakan alat seperti `scp` dari mesin lokal Anda.
```bash
# Jalankan perintah ini dari terminal mesin LOKAL Anda
scp -r /path/to/your/local/project/* root@ALAMAT_IP_VPS_ANDA:/var/www/veo-generator/
```
Atur kepemilikan yang benar untuk direktori tersebut. Ganti `nama_pengguna` dengan nama pengguna Anda di VPS.
```bash
sudo chown -R nama_pengguna:nama_pengguna /var/www/veo-generator
```

### Langkah 7: Jalankan Aplikasi dengan PM2
Navigasikan ke direktori aplikasi Anda dan mulai proses `serve` dengan PM2. Perintah ini memberitahu `serve` untuk menghosting direktori saat ini (`.`), memperlakukannya sebagai aplikasi halaman tunggal (`-s`), mendengarkan di port 5000 (`-l 5000`), dan menamai prosesnya `veo-app`.
```bash
cd /var/www/veo-generator
pm2 start serve --name "veo-app" -- -s . -l 5000
```
Untuk memastikan PM2 dimulai secara otomatis saat server di-reboot, jalankan perintah berikut:
```bash
pm2 startup
# Ini akan menghasilkan sebuah perintah. Salin dan jalankan perintah tersebut.
pm2 save
```

### Langkah 8: Konfigurasi Nginx sebagai Reverse Proxy
Buat file konfigurasi Nginx baru untuk aplikasi Anda.
```bash
sudo nano /etc/nginx/sites-available/veo-generator
```
Tempelkan konfigurasi berikut ke dalam file. Ganti `DOMAIN_ATAU_IP_ANDA` dengan nama domain atau alamat IP VPS Anda.
```nginx
server {
    listen 80;
    server_name DOMAIN_ATAU_IP_ANDA;

    root /var/www/veo-generator;
    index index.html;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Simpan file (Ctrl+X, lalu Y, lalu Enter).

Aktifkan konfigurasi baru ini dengan membuat tautan simbolis.
```bash
sudo ln -s /etc/nginx/sites-available/veo-generator /etc/nginx/sites-enabled/
```
Uji konfigurasi Nginx Anda untuk kesalahan sintaks.
```bash
sudo nginx -t
```
Jika tes berhasil, restart Nginx untuk menerapkan perubahan.
```bash
sudo systemctl restart nginx
```
Aplikasi Anda sekarang seharusnya dapat diakses di `http://DOMAIN_ATAU_IP_ANDA`.

### Langkah 9 (Disarankan): Amankan dengan SSL Let's Encrypt
Jika Anda memiliki nama domain, Anda dapat mengamankan situs Anda dengan sertifikat SSL gratis dari Let's Encrypt.
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d DOMAIN_ATAU_IP_ANDA
```
Ikuti petunjuk di layar. Certbot akan secara otomatis mendapatkan sertifikat dan memperbarui konfigurasi Nginx Anda untuk menangani lalu lintas HTTPS.

## Mengelola Aplikasi Anda
Berikut adalah beberapa perintah PM2 yang berguna:
- `pm2 list`: Menampilkan semua proses aplikasi yang berjalan.
- `pm2 stop veo-app`: Menghentikan aplikasi Anda.
- `pm2 restart veo-app`: Memulai ulang aplikasi Anda.
- `pm2 logs veo-app`: Melihat log real-time untuk aplikasi Anda.
- `pm2 flush veo-app`: Membersihkan log.

Aplikasi Anda sekarang telah terpasang dan akan berjalan 24/7, serta akan dimulai ulang secara otomatis setelah server reboot.
