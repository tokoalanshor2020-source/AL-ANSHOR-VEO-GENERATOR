<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 1. AL ANSHOR VEO GENERATOR - Panduan Pemasangan Dikomputer Sendiri/Localhost
### 1. Download file zip berikut Kemudian extrak dilokasi sesuai keinginanmu {Saran didata D:}
{https://github.com/tokoalanshor2020-source/AL-ANSHOR-VEO-GENERATOR/archive/refs/heads/main.zip}
### 2. Masuk pada hasil ekstrak {AL-ANSHOR-VEO-GENERATOR} kemudian pada kolom lokasi file berikut klik kemudian ketik cmd
{Semisal : D:\PROYEK\AL-ANSHOR-VEO-GENERATOR-main\AL-ANSHOR-VEO-GENERATOR-main}
### Lalu masukkan perintah berikut :
```bash
npm install
```
```bash
npm run dev
```
Maka akan muncul keterangan sebagai berikut
```bash
 VITE v6.3.6  ready in 5796 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
Setelah itu buka browser kemudian jalankan { http://localhost:5173/ }


# 2. AL ANSHOR VEO GENERATOR - Panduan Pemasangan VPS

Dokumen ini berisi panduan lengkap langkah demi langkah untuk memasang dan menjalankan aplikasi AL ANSHOR VEO GENERATOR di server VPS Ubuntu. Panduan ini mencakup konfigurasi agar aplikasi dapat diakses publik secara aman menggunakan Nginx sebagai *reverse proxy* dan tetap berjalan 24/7 menggunakan PM2.

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:

- **Server VPS** dengan sistem operasi Ubuntu (disarankan versi 20.04 LTS atau yang lebih baru).
- **Akses root** atau pengguna dengan hak akses `sudo`.
- **Nama domain** yang sudah diarahkan ke alamat IP VPS Anda (opsional, tetapi sangat direkomendasikan untuk keamanan dan kemudahan akses).

---

## Pemasangan Langkah demi Langkah

# Langkah 1: Pembaruan Sistem & Instalasi Utilitas Dasar

Pertama, perbarui daftar paket dan tingkatkan semua paket yang terpasang ke versi terbaru. Kemudian, instal utilitas penting yang akan kita butuhkan.

```bash
apt update && sudo apt upgrade -y
```
```bash
apt install curl wget git ufw nginx -y
```

# Langkah 2: Instalasi Node.js & NPM

Aplikasi ini membutuhkan Node.js. Kita akan menginstal Node.js versi 18 (LTS) menggunakan repositori dari NodeSource.

### Tambahkan repositori Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
```
### Instal Node.js (NPM akan terinstal secara otomatis)
```bash
sudo apt install -y nodejs
```
### Verifikasi instalasi
```bash
node -v
```
```bash
npm -v
```

# Langkah 3: Install PM2 (Process Manager)

```bash
npm install -g pm2
```
```bash
pm2 -v
```

### Clone repositori dari GitHub

### Pindah ke direktori proyek
```bash
cd /var/www
```
```bash
git clone https://github.com/tokoalanshor2020-source/alanshor.git alanshor
```
```bash
cd alanshor
```

### Instal semua dependensi proyek
```bash
npm install
```

### Jalankan Vite agar bind ke semua interface (public)
### Buka Config.js
```bash
nano vite.config.js
```
### Paste ini kemudian simpan {CTRL+0 Kemudian CTRL+X ENTER SIMPAN}
```bash
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173, // atau port sesuai yang kamu jalankan
    allowedHosts: [
      'Domain_Kamu', // Atau ganti dengan domain kamu
      'www.Domain_Kamu' // Atau ganti dengan domain kamu
    ]
  }
})
```
Simpan (CTRL+O, lalu CTRL+X).

### Jalan NPM untuk run WEB APP
```bash
npm run build
```
```bash
pm2 start npm --name "alanshor" -- run dev
```
### Cek status PM2 dan Aktifkan auto restart
```bash
pm2 status
```
```bash
pm2 startup
```
```bash
pm2 save
```
**Perintah PM2 yang Berguna:**
-   Melihat daftar semua aplikasi: `pm2 list`
-   Melihat log aplikasi: `pm2 logs alanshor`
-   Memulai ulang aplikasi: `pm2 restart alanshor`

# Langkah 4: Konfigurasi Domain di Namecheap

### Login → Domain List → pilih Domain_Kamu.

Masuk ke Advanced DNS.

Tambahkan:

### - A Record
Host: @ | 
Value: IP_VPS_KAMU | 
TTL: Auto

### - CNAME Record
Host: www | 
Value: Domain_Kamu | 
TTL: Auto

Tunggu propagasi DNS (15 menit – 2 jam).

# Langkah 5: Konfigurasi Nginx sebagai Reverse Proxy

Menjalankan server pengembangan Vite secara langsung ke internet tidak aman dan tidak efisien. Sebaiknya, kita gunakan Nginx sebagai *reverse proxy* untuk menangani lalu lintas masuk dan meneruskannya ke aplikasi kita.

### 1.  Buat file konfigurasi Nginx baru untuk proyek Anda.

```bash
nano /etc/nginx/sites-available/alanshor.conf
```

### 2.  Salin dan tempel konfigurasi berikut ke dalam file tersebut. **Jangan lupa ganti `your_domain_or_ip`** dengan nama domain atau alamat IP VPS Anda.

 ```bash
    server {
    listen 80;
    server_name Domain_Kamu www.Domain_Kamu;

    location / {
        proxy_pass http://localhost:5173;   # kalau pakai vite dev
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
 ```
Simpan → CTRL+O, keluar → CTRL+X
### Catatan:
Kalau npm run preview default port = 4173.
Kalau npm run dev → port = 5173.
Kalau backend Node.js → biasanya port = 3000.
Sesuaikan proxy_pass dengan port aplikasi kamu.

### 3.  Aktifkan konfigurasi dengan membuat *symbolic link*.

```bash
ln -s /etc/nginx/sites-available/alanshor.conf /etc/nginx/sites-enabled/
```

### 4.  Uji konfigurasi Nginx dan muat ulang jika tidak ada kesalahan.

```bash
nginx -t
```
```bash
systemctl reload nginx
```

# Langkah 6: Pasang SSL (HTTPS) dengan Certbot

Jika Anda menggunakan domain, sangat disarankan untuk menginstal sertifikat SSL gratis dari Let's Encrypt menggunakan Certbot.

### Instal Certbot
```bash
apt install certbot python3-certbot-nginx -y
```

### Dapatkan dan pasang sertifikat SSL untuk domain Anda
```bash
certbot --nginx -d Domaian_Kamu -d www.Domaian_Kamu
```

### Cek Akses
Buka browser
```bash
https://Domain_Kamu
```
Kalau berhasil → aplikasi jalan dengan domain + SSL.

# Langkah 8: Workflow Update Project
```bash
cd /var/www/alanshor
git pull
npm install
npm run build
pm2 restart alanshor
systemctl reload nginx

```