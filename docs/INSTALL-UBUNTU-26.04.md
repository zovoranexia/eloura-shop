# Panduan instalasi & konfigurasi Eloura Chic di VPS Ubuntu 26.04 LTS

Panduan ini membawa Anda dari VPS kosong sampai toko online berjalan dengan HTTPS, backup otomatis, dan konfigurasi toko siap jualan.
Arsitektur produksi:

```
Internet ──443──▶ Caddy (HTTPS otomatis, di host) ──127.0.0.1:3000──▶ container "app" (Next.js 16) ──▶ container "db" (PostgreSQL 15)
                                                                         │                                   └─ volume pgdata
                                                                         └─ volume uploads (gambar produk + bukti bayar PRIVAT)
```

Hanya port 22, 80 dan 443 yang terbuka ke internet. Aplikasi hanya mendengarkan `127.0.0.1`, dan database tidak dipublikasikan sama sekali.

> **Status verifikasi (jujur).** Bagian aplikasi (`docker compose`, migrasi, seed, health check, backup, restore, reset password darurat)
> sudah dijalankan dan diuji dengan Docker modern pada mesin pengembangan. Perintah **persiapan OS** (SSH, UFW, fail2ban, instal Docker dan Caddy)
> mengikuti dokumentasi resmi masing-masing, tetapi **belum dijalankan pada VPS Ubuntu 26.04 sungguhan** karena saya tidak punya akses ke server itu.
> Jalankan langkah demi langkah dan baca keluaran tiap perintah; kalau ada yang berbeda di 26.04, dokumentasi resmi di bagian Referensi adalah acuan utama.

Daftar isi: [1 Prasyarat](#1-prasyarat) · [2 Persiapan server](#2-persiapan-server) · [3 Instal Docker](#3-instal-docker-engine) · [4 Ambil kode](#4-ambil-kode-aplikasi) ·
[5 Konfigurasi .env](#5-konfigurasi-env) · [6 DNS & HTTPS](#6-dns-dan-https-caddy) · [7 Jalankan](#7-jalankan-aplikasi) · [8 Konfigurasi toko](#8-konfigurasi-toko-di-dashboard-admin) ·
[9 Backup](#9-backup-otomatis-dan-restore) · [10 Update](#10-update-dan-rollback) · [11 Operasional](#11-operasional-harian) · [12 Troubleshooting](#12-troubleshooting) · [13 Checklist go-live](#13-checklist-go-live)

---

## 1. Prasyarat

| Kebutuhan | Rekomendasi |
|---|---|
| VPS | Ubuntu **26.04 LTS** (nama kode *resolute*), minimal **2 vCPU / 2 GB RAM / 25 GB SSD** (build image butuh RAM; swap ditambahkan di langkah 2.6) |
| Domain | mis. `shop.contoh.com`, dengan akses ke pengaturan DNS-nya |
| Akses | IP VPS, akses root/sudo awal, dan **SSH key** di komputer Anda |
| Email transaksional (opsional) | akun SMTP (host, port, user, password) untuk notifikasi pesanan. Tanpa SMTP, email hanya dicatat di log |
| Data toko | nomor rekening BNCTL, nomor merchant T-Pay dan Mosan beserta gambar QR, kontak toko, foto produk |

Ganti `shop.contoh.com` dan `203.0.113.10` (IP contoh) di seluruh panduan dengan milik Anda.

---

## 2. Persiapan server

> **Cara memakai blok perintah:** salin dan jalankan **satu blok pada satu waktu**, lalu tunggu selesai. Jangan menempel beberapa blok sekaligus:
> perintah `sudo` meminta kata sandi, dan baris yang ikut tertempel sesudahnya akan terbaca sebagai ketikan kata sandi
> (atau, bila berisi `exit`, menutup sesi SSH Anda). Baris yang diawali `#` hanyalah komentar; jangan ikut ditempel.

### 2.1 Update sistem dan buat pengguna non-root
Masuk sebagai root, lalu:

```bash
apt update && apt full-upgrade -y
adduser --gecos "" deploy              # isi kata sandi kuat
usermod -aG sudo deploy
```

Dari **komputer Anda** pasang SSH key untuk pengguna itu, lalu uji login:

```bash
ssh-copy-id deploy@203.0.113.10
ssh deploy@203.0.113.10
```

> Di Ubuntu 26.04 perintah `sudo` adalah **sudo-rs** (reimplementasi Rust). Semua perintah `sudo` di panduan ini bekerja seperti biasa.

### 2.2 Amankan SSH
Jalankan sebagai `deploy`. **Jangan tutup sesi lama** sebelum sesi SSH baru terbukti bisa login.

```bash
sudo tee /etc/ssh/sshd_config.d/99-eloura.conf >/dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
EOF
sudo sshd -t && sudo systemctl reload ssh
```

Buka terminal kedua dan pastikan `ssh deploy@203.0.113.10` masih berhasil sebelum melanjutkan.

### 2.3 Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp        # HTTP/3 (opsional)
sudo ufw enable
sudo ufw status verbose
```

> **Penting:** Docker memasang aturan jaringannya sendiri dan port yang dipublikasikan ke `0.0.0.0` **melewati UFW**. Konfigurasi proyek ini aman karena
> hanya mempublikasikan `127.0.0.1:3000` dan tidak membuka port database. Jangan mengubah `ports:` di `docker-compose.yml` menjadi `"3000:3000"`.

### 2.4 fail2ban (blokir percobaan login SSH berulang)

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 2.5 Update keamanan otomatis dan zona waktu

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades      # pilih "Yes"
sudo timedatectl set-timezone Asia/Dili
timedatectl                                           # Time zone: Asia/Dili (+09, +0900)
```

Aplikasi dan database sudah memaksa `Asia/Dili` di dalam container; zona waktu host memengaruhi jadwal cron dan log server.
Update kernel membutuhkan reboot; jadwalkan sesekali (container otomatis hidup lagi, lihat `restart: unless-stopped`).

### 2.6 Swap 2 GB (mencegah build kehabisan memori)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 3. Instal Docker Engine

Gunakan repositori apt **resmi Docker** (mendukung Ubuntu 26.04 *resolute*). Hapus dulu paket Docker bawaan distro bila ada:

```bash
sudo apt remove -y $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc 2>/dev/null | cut -f1)

sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Beri pengguna `deploy` akses Docker (**setara hak root**: hanya untuk akun tepercaya). Jalankan langkah-langkah ini **satu per satu**:

**a)** Tambahkan ke grup `docker` (akan meminta kata sandi `sudo`; ketik, lalu Enter):

```bash
sudo usermod -aG docker deploy
```

**b)** Keluar dari sesi SSH agar keanggotaan grup baru berlaku:

```bash
exit
```

**c)** Login lagi dari komputer Anda, lalu periksa bahwa `docker` ada di daftar grup:

```bash
ssh deploy@203.0.113.10
id -nG                       # harus memuat: docker
```

**d)** Uji Docker (tanpa `sudo`):

```bash
docker version
docker compose version
docker run --rm hello-world
```

Jika `id -nG` tidak memuat `docker`, perintah (a) belum berhasil (mis. kata sandi `sudo` salah): ulangi (a) dan (b).

Batasi ukuran log container agar disk tidak penuh:

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }
EOF
sudo systemctl restart docker
```

> Alternatif tanpa repositori Docker: paket Ubuntu `docker.io` dan `docker-compose-v2` (`sudo apt install -y docker.io docker-compose-v2`). Panduan ini memakai repositori resmi agar versinya selalu terbaru.

---

## 4. Ambil kode aplikasi

Lokasi tetap: `/opt/eloura`.

```bash
sudo mkdir -p /opt/eloura && sudo chown deploy:deploy /opt/eloura
```

**Opsi A, dari repositori Git privat memakai *deploy key* (disarankan).** Repositori privat tidak bisa di-clone tanpa kunci; *deploy key* adalah kunci SSH
khusus server ini yang **hanya bisa membaca** satu repositori.

Prasyarat di komputer Anda: semua commit sudah di-push ke GitHub (`git push origin main`) dan folder `deploy/` serta `docs/` sudah ter-commit.
Cek nama repositori yang benar dengan `git remote -v` (contoh di bawah memakai `zovoranexia/eloura-shop`; ganti dengan milik Anda).

**a)** Di VPS, buat kunci khusus (tanpa passphrase agar `git pull` tidak meminta input) dan tampilkan kunci **publiknya**:

```bash
ssh-keygen -t ed25519 -C "eloura-vps-deploy" -f ~/.ssh/eloura_deploy -N ""
cat ~/.ssh/eloura_deploy.pub
```

**b)** Di GitHub: repositori → **Settings → Deploy keys → Add deploy key**. Beri judul `eloura-vps`, tempel isi kunci publik tadi, dan **jangan** centang *Allow write access*.

**c)** Beri tahu SSH kunci mana yang dipakai untuk `github.com`:

```bash
printf 'Host github.com\n  IdentityFile ~/.ssh/eloura_deploy\n  IdentitiesOnly yes\n' >> ~/.ssh/config
chmod 600 ~/.ssh/config
```

**d)** Uji (jawab `yes` jika ditanya fingerprint; cocokkan dengan fingerprint ED25519 yang dipublikasikan GitHub di
<https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints>):

```bash
ssh -T git@github.com
```

Keluaran yang benar: `Hi zovoranexia/eloura-shop! You've successfully authenticated, but GitHub does not provide shell access.`
Jika muncul `Permission denied (publickey)`, kunci belum terpasang di repositori yang benar (ulangi b), atau kunci publik yang ditempel salah.

**e)** Clone:

```bash
git clone git@github.com:zovoranexia/eloura-shop.git /opt/eloura
```

> Alternatif tanpa kunci SSH: `git clone https://github.com/zovoranexia/eloura-shop.git /opt/eloura` dengan *fine-grained personal access token*
> (izin **Contents: Read-only** hanya untuk repositori ini) sebagai kata sandi. Token itu setara kata sandi: simpan di password manager.

**Opsi B, langsung dari komputer Anda (tanpa remote Git)**, jalankan di komputer lokal:

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .env --exclude .uploads --exclude .git \
  ./ deploy@203.0.113.10:/opt/eloura/
```

Lalu di VPS:

```bash
cd /opt/eloura && chmod +x deploy/*.sh docker/entrypoint.sh
```

---

## 5. Konfigurasi `.env`

```bash
cd /opt/eloura
cp .env.example .env && chmod 600 .env
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" .env
sed -i "s|^AUTH_SECRET=.*|AUTH_SECRET=$(openssl rand -hex 32)|" .env
nano .env
```

Isi/ubah nilai berikut di `nano`:

| Variabel | Isi | Catatan |
|---|---|---|
| `APP_URL` | `https://shop.contoh.com` | **Harus persis** alamat publik (skema + host). Dipakai untuk cookie `Secure`, HSTS, pemeriksaan Origin/CSRF, dan tautan di email |
| `SEED_ADMIN_EMAIL` | email Super Admin pertama | Dibuat otomatis saat start pertama |
| `SEED_ADMIN_PASSWORD` | kata sandi kuat **≥ 12 karakter**, dalam tanda kutip | Server menolak seed produksi tanpa ini. Tanda kutip wajib bila ada `#`: `"Str0ng#Pass-2026"` |
| `TRUST_PROXY` | `1` | Wajib di belakang Caddy/nginx (rate limit dan log audit memakai IP asli dari `X-Forwarded-For`) |
| `SEED_CATALOG` | `0` bila ingin katalog kosong | `1` (default) membuat 6 kategori, 8 produk contoh, 3 banner, dan kupon `WELCOME10` **sekali saja** |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | data SMTP Anda | Kosong = email hanya dicatat di log (`[mail:dev]`) |
| `AUTH_SECRET`, `POSTGRES_PASSWORD` | sudah diisi acak oleh perintah `sed` di atas | Jangan dibagikan; simpan salinan di password manager |

Hal yang harus dipahami:

* `POSTGRES_PASSWORD` **hanya dipakai saat volume database pertama kali dibuat.** Mengubahnya di `.env` sesudahnya **tidak** mengganti kata sandi di database
  (aplikasi lalu gagal tersambung). Pilih nilainya dengan benar dari awal; kalau terlanjur berubah, kembalikan nilai lama atau jalankan
  `docker compose exec db psql -U eloura -c "ALTER USER eloura PASSWORD '...'"`.
* Mengubah `SEED_ADMIN_PASSWORD` sesudah start pertama **tidak** mengganti kata sandi admin yang sudah ada (ganti lewat dashboard atau skrip reset di bagian 12).
* Jangan pernah meng-commit `.env`. Variabel `NODE_IMAGE`/`POSTGRES_IMAGE` hanya perlu untuk host Linux yang sangat lama; abaikan di Ubuntu 26.04.

---

## 6. DNS dan HTTPS (Caddy)

### 6.1 DNS
Di panel domain, buat record **A** `shop.contoh.com → 203.0.113.10` (dan **AAAA** bila VPS punya IPv6). Tunggu propagasi, lalu cek dari komputer Anda: `nslookup shop.contoh.com`.
DNS harus sudah benar sebelum Caddy meminta sertifikat.

### 6.2 Instal Caddy
Caddy mengurus sertifikat Let's Encrypt (penerbitan dan perpanjangan) sendiri. Ikuti instruksi apt resmi Caddy untuk Debian/Ubuntu:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 6.3 Konfigurasi

```bash
sudo cp /opt/eloura/deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo sed -i 's/shop\.example\.com/shop.contoh.com/g' /etc/caddy/Caddyfile
sudo mkdir -p /var/log/caddy && sudo chown caddy:caddy /var/log/caddy
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

`deploy/Caddyfile.example` sudah berisi: kompresi, batas unggahan 7 MB (aplikasi membatasi file 5 MB), `reverse_proxy` ke `127.0.0.1:3000`,
dan log berotasi. Caddy menimpa header `X-Forwarded-For` dari klien dengan alamat asli, sehingga rate limit tidak bisa dipalsukan.

> **Alternatif nginx + certbot:** lihat `deploy/nginx-eloura.conf.example` (berisi langkah singkat di komentarnya).

---

## 7. Jalankan aplikasi

```bash
cd /opt/eloura
docker compose up -d --build
```

Build pertama memakan **5 sampai 10 menit**. Saat start, container otomatis: menunggu database → menerapkan migrasi → menanam data referensi (idempoten) → menjalankan server.

```bash
docker compose ps                                  # app & db: Up (healthy)
docker compose logs --tail=40 app                  # cari "Ready" dan "Super admin created"
curl -s http://127.0.0.1:3000/api/health           # {"ok":true,...}
curl -sI https://shop.contoh.com | head -3         # HTTP/2 200 (sertifikat terbit otomatis)
```

Baris `Error: P1001: Can't reach database server` di awal log **normal** selama beberapa detik pertama (container menunggu database siap); jika terus berulang, lihat bagian 12.

Buka `https://shop.contoh.com` (etalase) dan `https://shop.contoh.com/admin/login` (dashboard).

---

## 8. Konfigurasi toko di dashboard admin

Masuk di `/admin/login` dengan `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`. Bahasa dashboard dapat diganti (TET / PT / EN / ID) di pojok atas.
Lakukan **berurutan**; nama menu mengikuti dashboard berbahasa Inggris.

1. **Staff** → buat akun atas nama masing-masing orang dengan peran yang pas, jangan berbagi satu akun:

   | Peran | Tugas |
   |---|---|
   | Store Manager | produk, stok, kupon, banner, halaman CMS, laporan |
   | Finance Staff | verifikasi pembayaran, refund, rekonsiliasi COD, ekspor CSV |
   | Order Fulfilment | kemas, kirim, antar, kurir Dili, faktur dan packing slip |
   | Customer Support | pelanggan, pesan masuk, moderasi ulasan |

   Simpan satu Super Admin saja (hak penuh: peran, staf, pengaturan, audit). Peran khusus bisa dibuat di **Roles & permissions**.
2. **Store settings** → nama, email, telepon, WhatsApp, alamat, media sosial, jendela retur; **batas waktu pembayaran** (jam, default 24); aturan COD:
   nilai **minimum/maksimum** pesanan COD (default maks. $150), **biaya COD** opsional, **ambang auto-flag** (jumlah penolakan COD sebelum akun diblokir dari COD; default 2),
   ambang stok menipis, maks. qty per item, versi syarat COD.
3. **Payment methods**, *langkah yang menentukan apakah pelanggan bisa membayar*:
   * **Bank transfer BNCTL** dan **ATM transfer BNCTL**: nama bank, pemegang rekening, **nomor rekening**, cabang, SWIFT bila ada.
   * **T-Pay** dan **Mosan**: nama merchant, **nomor merchant**, dan unggah **gambar QR**.
   * Periksa/ubah teks petunjuk per bahasa, lalu aktifkan.
   * Di produksi, metode yang **belum diisi data aslinya otomatis disembunyikan dari pelanggan** (pengaman agar tidak ada yang mentransfer ke rekening contoh). COD selalu tersedia sesuai aturan zona.
   * T-Pay dan Mosan **diverifikasi manual** oleh tim finance (mencocokkan ID transaksi/screenshot dengan mutasi dompet); belum ada integrasi API merchant.
4. **Delivery & COD zones** → tiap postu administrativu Dili: biaya kirim, ambang gratis ongkir, estimasi hari, saklar **COD** (default: Cristo Rei, Dom Aleixo, Nain Feto, Vera Cruz aktif; **Metinaro nonaktif**); per-**suco** saklar COD;
   biaya tiap munisípiu lain. COD **hanya** berlaku di Dili meski formulir mencoba lain; Atauro dan kota lain tidak pernah bisa COD.
5. **Products / Categories / Inventory** → hapus atau ubah produk dan kategori contoh, unggah foto asli (otomatis dikonversi WebP, metadata EXIF dibuang, maks. 5 MB),
   isi nama dan deskripsi 4 bahasa, varian, SKU, stok. Foto contoh bawaan hanyalah potongan dari template.
6. **Banners** → ganti 3 banner hero dan banner promo dengan gambar beresolusi tinggi (disarankan ≥ 2000 px lebar; bawaan hanya 1024 px sehingga tampak lembut di layar besar).
7. **Pages (CMS)** → tinjau dan sesuaikan *About*, **COD terms**, *Privacy*, *Terms*, *Shipping & returns* ke kebijakan asli Anda, termasuk waktu pengiriman, retur 7 hari, dan biaya (semua itu **contoh**).
   Minta penutur asli memeriksa teks Tetum.
8. **Coupons** → ubah atau hapus kupon contoh `WELCOME10`.
9. **Uji pesanan nyata** dari ponsel: satu pesanan transfer (unggah bukti → setujui di *Payment verification* → kemas → kirim → antar) dan satu pesanan COD di Dili
   (konfirmasi via WhatsApp → pilih kurir → antar → catat uang tunai → *COD cash* → rekonsiliasi). Cetak faktur dan packing slip, lalu cek email masuk.
   Batalkan atau hapus pesanan uji sesudahnya.

---

## 9. Backup otomatis dan restore

Yang dibackup: **database** (pelanggan, pesanan, pengaturan, audit) dan **volume uploads** (foto produk + **bukti bayar privat**). Tanpa keduanya, toko tidak bisa dipulihkan.

### 9.1 Siapkan dan uji

```bash
sudo mkdir -p /var/backups/eloura && sudo chown deploy:deploy /var/backups/eloura && chmod 700 /var/backups/eloura
cd /opt/eloura && ./deploy/backup.sh
ls -lh /var/backups/eloura
```

Hasilnya dua berkas: `db-AAAAMMDD-JJMMDD.sql.gz` dan `uploads-AAAAMMDD-JJMMDD.tar.gz`. Skrip memverifikasi integritas berkas dan menghapus backup lebih tua dari 14 hari (`KEEP_DAYS=30 ./deploy/backup.sh` untuk mengubah).

### 9.2 Jadwalkan (cron, setiap hari 02:30 waktu Dili)

```bash
crontab -e
# tambahkan baris ini:
30 2 * * * cd /opt/eloura && ./deploy/backup.sh >> /home/deploy/eloura-backup.log 2>&1
```

### 9.3 Salinan di luar server (wajib)
Backup yang hanya ada di VPS ikut hilang bila VPS rusak. Salin ke tempat lain, mis. server lain lewat `rsync`:

```bash
rsync -az --delete /var/backups/eloura/ backup@server-lain:/backups/eloura/
```

atau ke object storage (`rclone`). Aktifkan juga snapshot dari penyedia VPS. Simpan salinan **`.env`** terpisah di password manager (berisi rahasia dan tidak ikut backup).

### 9.4 Restore (hanya bila perlu; **menimpa** data saat ini)

```bash
cd /opt/eloura
./deploy/restore.sh /var/backups/eloura/db-20261124-023000.sql.gz /var/backups/eloura/uploads-20261124-023000.tar.gz
# ketik YES saat diminta
```

Skrip menghentikan aplikasi, memulihkan database dan berkas upload, lalu menyalakan aplikasi lagi. Cek: `docker compose ps` dan `curl -s http://127.0.0.1:3000/api/health`.

**Pindah ke server baru / pemulihan total:** lakukan bagian 2 sampai 7 di server baru (menghasilkan toko kosong), lalu jalankan `restore.sh` dengan backup terakhir.
**Latih prosedur ini sesekali** di server uji; backup yang tidak pernah dicoba dipulihkan belum bisa disebut backup.

---

## 10. Update dan rollback

### Update ke versi baru

```bash
cd /opt/eloura
./deploy/backup.sh                       # selalu backup dulu
git pull                                 # atau rsync kode baru (opsi B di bagian 4)
docker compose up -d --build             # migrasi database dijalankan otomatis saat start
docker compose logs --tail=50 app
docker image prune -f                    # bersihkan image lama
```

Container diganti dalam hitungan detik. Migrasi hanya bergerak maju dan sudah menjadi bagian dari image.

### Rollback
1. `git checkout <commit-atau-tag-sebelumnya>` lalu `docker compose up -d --build`.
2. Bila versi baru sudah menambah migrasi database, versi lama mungkin tidak cocok dengan skema: pulihkan **backup yang dibuat tepat sebelum update** dengan `./deploy/restore.sh ...`.

### Update sistem operasi
`sudo apt update && sudo apt full-upgrade -y`; reboot bila kernel berubah (`/var/run/reboot-required`). Docker menyalakan ulang container otomatis.

---

## 11. Operasional harian

```bash
cd /opt/eloura
docker compose ps                         # status
docker compose logs -f app                # log aplikasi (Ctrl+C untuk keluar)
docker compose logs --tail=100 db         # log database
docker stats --no-stream                  # CPU/RAM per container
df -h /  &&  docker system df             # sisa disk dan pemakaian Docker
docker compose exec db psql -U eloura eloura      # konsol database (hati-hati)
docker compose restart app                # restart aplikasi saja
```

* **Pantau ketersediaan:** daftarkan `https://shop.contoh.com/api/health` di layanan uptime (mis. UptimeRobot, Healthchecks.io); responsnya `{"ok":true}` (503 bila database tidak terjangkau).
* **Pantau pekerjaan dasar:** *Dashboard* admin menampilkan antrean verifikasi, COD yang perlu dikonfirmasi, pesanan untuk dikemas, stok menipis, pesan masuk.
* **Job otomatis:** pesanan non-COD yang tidak dibayar melewati batas waktu dibatalkan setiap 5 menit dan stok/kupon dikembalikan (cek log: `[jobs] cancelled ...`).
* **Audit:** menu *Audit log* mencatat siapa melakukan apa, kapan (waktu Dili), dan dari IP mana. Catatan ini **tidak bisa diubah/dihapus** (dijaga di level database).
* **Disk:** bukti bayar dan foto produk bertambah seiring waktu; pantau `df -h` dan ukuran `/var/backups/eloura`.

---

## 12. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| Build berhenti / `Killed` | Kehabisan RAM | Pastikan swap aktif (2.6), atau tambah RAM sementara. Alternatif: build di komputer lain lalu `docker save` / registry |
| Aplikasi terus `Can't reach database server` | `POSTGRES_PASSWORD` di `.env` berbeda dari yang dipakai saat volume dibuat | Kembalikan nilai lama, atau `ALTER USER` (bagian 5). Cek `docker compose logs db` |
| Caddy menampilkan **502** | Container `app` belum hidup | `docker compose ps`, `curl -s http://127.0.0.1:3000/api/health`, `docker compose logs app` |
| Sertifikat HTTPS tidak terbit | DNS belum menunjuk ke VPS, atau port 80/443 tertutup | `nslookup`, `sudo ufw status`, `sudo journalctl -u caddy -n 50` |
| Login berhasil tetapi langsung keluar lagi | `APP_URL` tidak sama dengan alamat yang dibuka (mis. `http://` atau domain lain), sehingga cookie `Secure` tidak tersimpan | Samakan `APP_URL` dengan URL publik **https**, lalu `docker compose up -d` |
| Galat `BAD_ORIGIN` / `CSRF` saat menyimpan | Situs dibuka lewat nama host berbeda dari `APP_URL` (mis. `www.`) | Arahkan `www` ke domain utama (sudah ada di Caddyfile) atau akses lewat `APP_URL` |
| Semua pengunjung kena `429` (terlalu banyak percobaan) | `TRUST_PROXY` bukan `1` atau proxy tidak meneruskan `X-Forwarded-For` | Setel `TRUST_PROXY=1` dan pastikan lewat Caddy/nginx |
| Unggah gambar/bukti gagal (413) | Batas ukuran di proxy | Caddy `max_size 7MB` / nginx `client_max_body_size 7m` (file maks. 5 MB) |
| Metode pembayaran tidak muncul di checkout | Data penerima belum diisi (placeholder disembunyikan di produksi) | Isi di **Payment methods** (bagian 8, langkah 3) |
| Opsi COD tidak tersedia | Di luar zona COD Dili, nomor bukan seluler +670, total di luar batas, atau akun ditandai | Alasan ditampilkan di checkout; atur di **Zones** dan **Store settings** |
| Email tidak terkirim | `SMTP_*` kosong atau salah | Isi `SMTP_*`; log menampilkan `[mail:dev]` bila SMTP kosong. Terapkan: `docker compose up -d` |
| Lupa kata sandi **semua** Super Admin | Tidak ada akun admin yang bisa masuk | Jalankan `./deploy/reset-admin-password.sh email@anda.com` (meminta sandi baru, mengeluarkan semua sesi akun itu) |
| Disk penuh | Image lama, log, backup | `docker image prune -af`, kurangi `KEEP_DAYS`, `sudo journalctl --vacuum-size=200M` |
| `permission denied` pada docker | Pengguna belum masuk grup docker, atau belum login ulang sesudah `usermod` | Jalankan `sudo usermod -aG docker deploy`, `exit`, login lagi, lalu cek `id -nG` |

Reset kata sandi akun lain yang masih bisa masuk dilakukan di dashboard: **Staff → pilih akun → reset password**.

---

## 13. Checklist go-live

- [ ] DNS dan HTTPS bekerja (gembok hijau), `http://` dialihkan ke `https://`
- [ ] `APP_URL` = URL publik `https`, `TRUST_PROXY=1`, `.env` berizin `600` dan **tidak** ada di Git
- [ ] Kata sandi Super Admin kuat; akun staf per orang dengan peran minimum yang diperlukan
- [ ] Rekening BNCTL, nomor merchant T-Pay/Mosan + QR terisi; teks petunjuk benar dalam 4 bahasa
- [ ] Zona/ongkir/ambang gratis ongkir dan aturan COD sesuai kebijakan; syarat COD ditinjau
- [ ] Produk dan foto asli terunggah, produk contoh dihapus, banner beresolusi tinggi
- [ ] Halaman CMS (About, COD, Privacy, Terms, Retur) sesuai kebijakan; teks Tetum diperiksa penutur asli
- [ ] SMTP terisi dan email pesanan sampai
- [ ] Uji pesanan transfer **dan** COD sampai selesai, termasuk faktur dan rekonsiliasi COD
- [ ] Backup harian berjalan, **ada salinan di luar server**, dan restore pernah dicoba
- [ ] Monitoring uptime pada `/api/health`; UFW aktif; fail2ban aktif; update otomatis aktif
- [ ] Kontak darurat dan lokasi kata sandi/`.env` tercatat

---

## Lampiran A. Tata letak di server

| Item | Lokasi |
|---|---|
| Kode dan konfigurasi | `/opt/eloura` (`.env`, `docker-compose.yml`, `deploy/`) |
| Database | volume Docker `eloura_pgdata` |
| Upload (publik + bukti bayar privat) | volume Docker `eloura_uploads` → `/data/uploads` di container app |
| Backup | `/var/backups/eloura` |
| Reverse proxy | `/etc/caddy/Caddyfile`, log `/var/log/caddy/` |
| Port | 22, 80, 443 terbuka; app `127.0.0.1:3000` (internal); database tidak dipublikasikan |

Bukti bayar **tidak** pernah disajikan sebagai berkas statis: hanya staf dengan izin *payments.view* yang dapat membukanya lewat API, dan setiap pembukaan dicatat di audit log.

## Lampiran B. Skrip di folder `deploy/`

| Berkas | Fungsi |
|---|---|
| `backup.sh` | dump database + arsip uploads, verifikasi, rotasi (`BACKUP_DIR`, `KEEP_DAYS`) |
| `restore.sh` | pulihkan database dan uploads dari backup (konfirmasi `YES`, atau `--yes`) |
| `reset-admin-password.sh` | reset kata sandi akun mana pun dari baris perintah |
| `Caddyfile.example` | konfigurasi Caddy (HTTPS + reverse proxy) |
| `nginx-eloura.conf.example` | alternatif nginx + certbot |

## Referensi

* Instal Docker Engine di Ubuntu (daftar rilis yang didukung, termasuk 26.04): <https://docs.docker.com/engine/install/ubuntu/>
* Rilis Ubuntu 26.04 LTS "Resolute Raccoon": <https://canonical.com/blog/canonical-releases-ubuntu-26-04-lts-resolute-raccoon>
* Perubahan 26.04 (sudo-rs, OpenSSH 10.2): <https://www.omgubuntu.co.uk/2026/04/ubuntu-26-04-lts-changes-since-24-04>
* Instal Caddy di Debian/Ubuntu: <https://caddyserver.com/docs/install#debian-ubuntu-raspbian>
