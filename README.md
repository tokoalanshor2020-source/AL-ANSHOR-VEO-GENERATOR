# AL ANSHOR VEO GENERATOR - Panduan Pemasangan

Panduan ini memberikan instruksi langkah demi langkah untuk memasang aplikasi AL ANSHOR VEO GENERATOR di VPS Ubuntu, memastikannya berjalan 24/7 menggunakan PM2 dan disajikan secara aman melalui Nginx.

## Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- VPS Ubuntu (disarankan 20.04 LTS atau yang lebih baru).
- Pengguna dengan hak akses `sudo`.
- Nama domain yang mengarah ke alamat IP VPS Anda (opsional, tetapi diperlukan untuk SSL).

## Pemasangan Langkah demi Langkah

# README - Menjalankan Vite Project 24 Jam di
VPS Ubuntu
Dokumen ini berisi panduan lengkap step-by-step untuk menjalankan project berbasis Vite di VPS
Ubuntu agar bisa diakses publik dan tetap berjalan meskipun server di-restart.
---
## 1. Update Sistem & Install Utilitas
apt update && apt upgrade -y
apt install -y curl git build-essential ca-certificates nginx ufw
---

## 2. Install Node.js (contoh Node 18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
node -v
npm -v
---

## 3. Siapkan Project
mkdir -p /var/www
cd /var/www
git clone https://github.com/tokoalanshor2020-source/AL-ANSHOR-VEO-GENERATOR.git myproject
cd myproject
npm install
---

## 4. Jalankan Vite Dev Server (Public)
npm run dev -- --host 0.0.0.0
Atau edit vite.config.js:
server: {
host: true,
port: 5173,
hmr: {
host: 'YOUR_PUBLIC_IP_OR_DOMAIN',
protocol: 'ws',
port: 5173
}
}
---

## 5. Firewall (jika expose port 5173 langsung)
ufw allow OpenSSH
ufw allow 5173/tcp
ufw enable
---

## 6. Setup Nginx Reverse Proxy (Direkomendasikan)
File: /etc/nginx/sites-available/myproject
server {
listen 80;
server_name YOUR_DOMAIN_OR_IP;
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
Aktifkan:
ln -s /etc/nginx/sites-available/myproject /etc/nginx/sites-enabled/myproject
nginx -t && systemctl reload nginx
---

## 7. HTTPS (Opsional)
- Pakai domain → gunakan Certbot:
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
- Jika hanya IP → bisa gunakan self-signed certificate.
---

## 8. Menjalankan 24 Jam (Auto Start Setelah Reboot)
### Opsi A: systemd Service
Buat file /etc/systemd/system/vite-dev.service
[Unit]
Description=Vite Dev Server
After=network.target
[Service]
Type=simple
WorkingDirectory=/var/www/myproject
ExecStart=/bin/sh -lc 'npm run dev -- --host 0.0.0.0'
Restart=always
RestartSec=5
User=root
[Install]
WantedBy=multi-user.target
Aktifkan:
systemctl daemon-reload
systemctl enable --now vite-dev
journalctl -u vite-dev -f
### Opsi B: PM2 (Process Manager)
npm install -g pm2
cd /var/www/myproject
pm2 start "npm run dev -- --host 0.0.0.0" --name myproject
pm2 save
pm2 startup systemd
Cek status:
pm2 list
pm2 logs myproject
---

## 9. Produksi (Saran)
Lebih aman gunakan build statis:
npm run build
Kemudian serve hasil build (/dist) dengan Nginx sebagai static files.
---
## 10. Troubleshooting
- Port tidak terbuka: cek dengan `ss -tulpn | grep 5173`
- HMR error: pastikan vite.config.js sudah di-set host & Nginx proxy mendukung WebSocket
- 502 Bad Gateway: pastikan Vite jalan & proxy_pass benar
- Firewall block: cek `ufw status`
---

## Ringkasan
- Untuk akses publik: gunakan --host 0.0.0.0
- Untuk keamanan & stabilitas: gunakan Nginx reverse proxy + domain + HTTPS
- Untuk auto start: gunakan systemd atau PM2
- Untuk produksi: jangan pakai dev server, gunakan npm run build + Nginx
---
