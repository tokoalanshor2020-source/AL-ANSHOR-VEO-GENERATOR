# AL ANSHOR VEO GENERATOR - Panduan Pemasangan VPS

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
sudo apt update && sudo apt upgrade -y
```
```bash
sudo apt install -y curl git build-essential ca-certificates
```
```bash
sudo apt install -y nginx ufw
```

# Langkah 2: Instalasi Node.js & NPM

Aplikasi ini membutuhkan Node.js. Kita akan menginstal Node.js versi 18 (LTS) menggunakan repositori dari NodeSource.

### Tambahkan repositori Node.js 18
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```
### Instal Node.js (NPM akan terinstal secara otomatis)
```bash
sudo apt-get install -y nodejs
```
### Verifikasi instalasi
```bash
node -v
```
```bash
npm -v
```

# Langkah 3: Unduh dan Siapkan Proyek Aplikasi

Selanjutnya, kita akan mengunduh kode sumber aplikasi dari GitHub dan menginstal dependensinya.

### Buat direktori untuk proyek
```bash
sudo mkdir -p /var/www
```
### Pindah ke direktori tersebut
```bash
cd /var/www
```

### Clone repositori dari GitHub
```bash
sudo git clone https://github.com/tokoalanshor2020-source/AL-ANSHOR-VEO-GENERATOR.git myproject
```

### Pindah ke direktori proyek
```bash
cd myproject
```

### Instal semua dependensi proyek
```bash
sudo npm install
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
    host: true,        // sama dengan '0.0.0.0'
    port: 5173,
    strictPort: false,
    hmr: {
      host: 'YOUR_PUBLIC_IP_OR_DOMAIN', // penting supaya HMR bisa konek
      protocol: 'ws',
      port: 5173
    }
  }
})

```
### Jalan NPM untuk run WEB APP
```bash
npm run dev -- --host 0.0.0.0
```

# Langkah 4: Konfigurasi Firewall (UFW)

Aktifkan firewall untuk mengamankan server. Kita akan membuka port untuk SSH (22), HTTP (80), dan HTTPS (443).

### Izinkan koneksi SSH
```bash
sudo ufw allow OpenSSH
```

### Izinkan lalu lintas web
```bash
sudo ufw allow 'Nginx Full'
```

### Aktifkan firewall
```bash
sudo ufw enable
```
# Langkah 5: Menjalankan Aplikasi 24/7 dengan PM2

PM2 adalah manajer proses yang akan menjaga aplikasi kita tetap berjalan, bahkan setelah server di-restart.

### Instal PM2 secara global
```bash
sudo npm install -g pm2
```

### Pindah ke direktori proyek
```bash
cd /var/www/myproject
```

### Jalankan server pengembangan Vite menggunakan PM2
### Perintah '-- --host' diperlukan agar Vite mendengarkan koneksi dari Nginx
```bash
pm2 start "npm run dev -- --host" --name myproject
```

### Simpan daftar proses PM2 agar dapat dipulihkan saat reboot
```bash
pm2 save
```

### Buat dan konfigurasikan skrip startup PM2
```bash
pm2 startup systemd
```

Anda akan melihat perintah output yang perlu Anda jalankan (biasanya `sudo env PATH=$PATH:/usr/bin ...`). Jalankan perintah tersebut untuk menyelesaikan penyiapan.

**Perintah PM2 yang Berguna:**
-   Melihat daftar semua aplikasi: `pm2 list`
-   Melihat log aplikasi: `pm2 logs myproject`
-   Memulai ulang aplikasi: `pm2 restart myproject`


# Langkah 6: Konfigurasi Nginx sebagai Reverse Proxy

Menjalankan server pengembangan Vite secara langsung ke internet tidak aman dan tidak efisien. Sebaiknya, kita gunakan Nginx sebagai *reverse proxy* untuk menangani lalu lintas masuk dan meneruskannya ke aplikasi kita.

### 1.  Buat file konfigurasi Nginx baru untuk proyek Anda.

```bash
sudo nano /etc/nginx/sites-available/myproject
```

### 2.  Salin dan tempel konfigurasi berikut ke dalam file tersebut. **Jangan lupa ganti `your_domain_or_ip`** dengan nama domain atau alamat IP VPS Anda.

    ```nginx
    server {
        listen 80;
        server_name your_domain_or_ip;

        location / {
            proxy_pass http://127.0.0.1:5173;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

### 3.  Aktifkan konfigurasi dengan membuat *symbolic link*.

```bash
sudo ln -s /etc/nginx/sites-available/myproject /etc/nginx/sites-enabled/
```

### 4.  Uji konfigurasi Nginx dan muat ulang jika tidak ada kesalahan.

```bash
sudo nginx -t
```
```bash
sudo systemctl reload nginx
```

# Langkah 7: Mengamankan dengan HTTPS (Opsional, tapi Sangat Penting)

Jika Anda menggunakan domain, sangat disarankan untuk menginstal sertifikat SSL gratis dari Let's Encrypt menggunakan Certbot.

### Instal Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Dapatkan dan pasang sertifikat SSL untuk domain Anda
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

# Langkah 8: (Saran Produksi) Menjalankan Build Statis

Untuk lingkungan produksi, lebih aman dan performan untuk membuat *build* statis dari aplikasi dan menyajikannya langsung dengan Nginx.

### 1.  Buat build statis.
```bash
cd /var/www/myproject
```
```bash
sudo npm run build
```

### 2.  Ubah konfigurasi Nginx (`sudo nano /etc/nginx/sites-available/myproject`) untuk menyajikan file dari direktori `dist`.
    ```nginx
    server {
        listen 80;
        server_name your_domain_or_ip;

        root /var/www/myproject/dist;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    ```
### 3.  Muat ulang Nginx.
```bash
sudo systemctl reload nginx
```

---

## Troubleshooting

-   **502 Bad Gateway**: Pastikan aplikasi Vite berjalan di PM2 (`pm2 list`) dan `proxy_pass` di Nginx sudah benar.
-   **Port tidak terbuka**: Periksa status port dengan `ss -tulpn | grep 5173`.
-   **Firewall memblokir**: Periksa status UFW dengan `sudo ufw status`.
-   **HMR (Hot Module Replacement) error**: Pastikan Nginx dikonfigurasi untuk WebSocket seperti di Langkah 5.
