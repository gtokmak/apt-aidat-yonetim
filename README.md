# Apartman Gelir Gider Uygulamasi

Bu proje, 7 dairelik apartmanlar icin gelir gider ve aidat takibini yapan bir
`Next.js + Supabase` uygulamasidir.

## Ozellikler

- Yonetici ve daire kullanicisi rolleri
- E-posta daveti ile kullanici onboarding (genel kayit kapali)
- Kiraci devir takibi (giris/cikis tarihli gecmis)
- Daire bazli yetki kontrolu (RLS, aktif oturum bazli)
- Aylik aidat donemi olusturma
- Toplu/yillik odeme kaydetme
- Ekstra daire basi gider dagitimi (bahce duzenlemesi vb.)
- Gider kategorisinden secim + yeni kategori ekleme
- Kategori / odeme / gider kayitlarinda duzenle-sil islemleri
- Aylik gelir gider defteri ve kasa ozeti
- Defterde ay secimi ile gecmis donem goruntuleme
- Daire bazli bakiye takibi (borc / on odeme)
- Kullanici profil sayfasi (isim, telefon, sifre guncelleme)
- Admin tarafinda kullanici aktif/pasif yonetimi
- Resident kullanici icin de genel durum ve aylik defterde tum apartman gorunumu

## Kurulum

1. Bagimliliklari kur:

```bash
npm install
```

2. Ortam degiskenlerini ayarla:

```bash
cp .env.example .env.local
```

`.env.local` icine su degiskenleri koy:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (yalnizca server tarafinda kullanilir, davet maili icin gerekir)

3. Supabase SQL'ini calistir:

- Dosyalari sirasiyla calistir:
- `supabase/migrations/20260311233000_init.sql`
- `supabase/migrations/20260312002000_profiles_fallback.sql`
- `supabase/migrations/20260312010000_invites_turnover_categories.sql`
- `supabase/migrations/20260312020000_profiles_status_and_phone.sql`
- `supabase/migrations/20260312110000_resident_full_read.sql`

Bu migration'lar:
- Temel tablolari ve RLS politikalari kurar
- Profil eksiklerini backfill eder
- Davet, kiraci devir ve kategori yapisini ekler
- 1-7 daireyi otomatik olusturur

4. Gelistirme ortamini baslat:

```bash
npm run dev
```

Tarayicida [http://localhost:3000](http://localhost:3000) adresini ac.

## Kullanim Akisi

1. Ilk kayit olan hesap yonetici olur.
2. Yonetici `Kullanicilar` sayfasindan daireye e-posta daveti gonderir.
3. Davet alan kullanici linkten kabul ederek daireye otomatik baglanir.
4. Kiraci cikinca kayit kapatilir, yeni kiraci icin yeni davet acilir.
5. Yonetici panelinden aidat, odeme, gider, kategori ve ek giderleri yonetir.

## Ucretsiz Yayin

- Frontend: Vercel Free
- Backend: Supabase Free

Vercel ortam degiskenlerine asagidakileri ekle:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Giris Sorunu Notu

Kayit sonrasi giris olmuyorsa iki noktayi kontrol edin:
- Supabase Auth > Email ayarinda kullanici e-posta dogrulamasini tamamlamis olmali.
- SQL migration dosyalarinin tamami calismis olmali.

Ozellikle profile eksigi yasandiysa su migration'i da calistirin:
- `supabase/migrations/20260312002000_profiles_fallback.sql`
