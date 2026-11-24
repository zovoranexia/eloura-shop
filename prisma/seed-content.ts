// Seed content in the four store languages: tet (default), pt, en, id.
// NOTE: Tetum copy is written to be natural but should be proof-read by a native speaker before launch.

export type L = { tet: string; pt: string; en: string; id: string };

/* ------------------------------------------------------------------ categories */
export const CATEGORIES: { slug: string; image: string; name: L }[] = [
  { slug: 'dresses', image: '/images/categories/robes.webp', name: { tet: 'Vestidu', pt: 'Vestidos', en: 'Dresses', id: 'Gaun' } },
  { slug: 'tops', image: '/images/categories/tops.webp', name: { tet: 'Kamiza & Blusa', pt: 'Tops e Blusas', en: 'Tops', id: 'Atasan' } },
  { slug: 'bottoms', image: '/images/categories/pantalons.webp', name: { tet: 'Kalsa & Saia', pt: 'Calças e Saias', en: 'Bottoms', id: 'Bawahan' } },
  { slug: 'bags', image: '/images/categories/sacs.webp', name: { tet: 'Pasta', pt: 'Malas e Bolsas', en: 'Bags', id: 'Tas' } },
  { slug: 'shoes', image: '/images/categories/chaussures.webp', name: { tet: 'Sapatu', pt: 'Sapatos', en: 'Shoes', id: 'Sepatu' } },
  { slug: 'accessories-beauty', image: '/images/categories/beaute.webp', name: { tet: 'Asesóriu & Beleza', pt: 'Acessórios e Beleza', en: 'Accessories & Beauty', id: 'Aksesori & Kecantikan' } },
];

/* ------------------------------------------------------------------ products */
type V = { sku: string; size?: string; color?: string; hex?: string; stock: number };
export const PRODUCTS: {
  slug: string; sku: string; category: string; image: string; price: number; compareAt?: number; featured?: boolean;
  name: L; description: L; variants: V[];
}[] = [
  {
    slug: 'oversize-knit-sweater', sku: 'EC-TOP-001', category: 'tops', image: '/images/products/pull-oversize.webp', price: 3990, compareAt: 4990, featured: true,
    name: { tet: 'Sweater tricô oversize', pt: 'Camisola de malha oversize', en: 'Oversize knit sweater', id: 'Sweater rajut oversize' },
    description: {
      tet: "Tricô mamar no konfortavel iha kór beige. Tipu oversize ne'ebé halo ita komodu, di'ak ho jeans ka saia.",
      pt: 'Malha macia e confortável em bege quente. Corte oversize descontraído, ideal com jeans ou saias.',
      en: 'Soft, cosy knit in warm beige. A relaxed oversize fit that pairs with jeans or skirts.',
      id: 'Rajutan lembut dan hangat berwarna beige. Potongan oversize yang santai, cocok dengan jeans atau rok.',
    },
    variants: ['S', 'M', 'L', 'XL'].map((s, i) => ({ sku: `EC-TOP-001-${s}`, size: s, color: 'Beige', hex: '#D9C3A5', stock: [6, 9, 7, 3][i] })),
  },
  {
    slug: 'elegant-handbag', sku: 'EC-BAG-001', category: 'bags', image: '/images/products/sac-elegant.webp', price: 8490, compareAt: 9990, featured: true,
    name: { tet: 'Pasta liman elegante', pt: 'Mala de mão elegante', en: 'Elegant handbag', id: 'Tas tangan elegan' },
    description: {
      tet: "Pasta liman estruturadu kór krema ho besi dourado no tali ba ombru ne'ebé bele hasai.",
      pt: 'Mala estruturada em creme com ferragens douradas e alça de ombro removível.',
      en: 'Structured cream handbag with gold-tone hardware and a detachable shoulder strap.',
      id: 'Tas tangan berstruktur warna krem dengan aksen emas dan tali bahu yang dapat dilepas.',
    },
    variants: [{ sku: 'EC-BAG-001-CRM', color: 'Cream', hex: '#EFE4D3', stock: 8 }],
  },
  {
    slug: 'trendy-sneakers', sku: 'EC-SHO-001', category: 'shoes', image: '/images/products/baskets.webp', price: 5990, compareAt: 7990, featured: true,
    name: { tet: 'Sapatu desportivu moderna', pt: 'Ténis modernos', en: 'Trendy sneakers', id: 'Sneakers kekinian' },
    description: {
      tet: 'Sapatu desportivu kór ba\'e no areia ho sola mamar, konfortavel husi dader to\'o kalan.',
      pt: 'Ténis brancos e areia com sola almofadada, confortáveis da manhã à noite.',
      en: 'Clean white and sand sneakers with a cushioned sole, comfortable from morning to night.',
      id: 'Sneakers putih-pasir dengan sol empuk, nyaman dari pagi hingga malam.',
    },
    variants: ['37', '38', '39', '40', '41'].map((s, i) => ({ sku: `EC-SHO-001-${s}`, size: s, color: 'White', hex: '#F4EFE8', stock: [4, 6, 6, 5, 2][i] })),
  },
  {
    slug: 'floral-perfume', sku: 'EC-BTY-001', category: 'accessories-beauty', image: '/images/products/parfum-floral.webp', price: 4490, compareAt: 4990, featured: true,
    name: { tet: 'Perfume floral', pt: 'Perfume floral', en: 'Floral perfume', id: 'Parfum floral' },
    description: {
      tet: "Perfume floral ne'ebé moos ho nota rosa no almíscar mamar. Eau de parfum 50 ml.",
      pt: 'Fragrância floral delicada com notas de rosa e almíscar suave. Eau de parfum 50 ml.',
      en: 'A delicate floral fragrance with notes of rose and soft musk. Eau de parfum 50 ml.',
      id: 'Aroma floral yang lembut dengan sentuhan mawar dan musk. Eau de parfum 50 ml.',
    },
    variants: [{ sku: 'EC-BTY-001-50', size: '50 ml', stock: 15 }],
  },
  {
    slug: 'pleated-midi-dress', sku: 'EC-DRS-001', category: 'dresses', image: '/images/products/cat-robes.webp', price: 4990, featured: false,
    name: { tet: 'Vestidu midi ho dobra', pt: 'Vestido midi plissado', en: 'Pleated midi dress', id: 'Gaun midi plisket' },
    description: {
      tet: "Vestidu midi fluidu kór rosa ho tali ne'ebé bele hadi'a. Perfeitu ba han-han no festa.",
      pt: 'Vestido midi fluido em tom rosa com alças ajustáveis. Perfeito para jantares e celebrações.',
      en: 'Flowing rose-toned midi dress with adjustable straps. Perfect for dinners and celebrations.',
      id: 'Gaun midi mengalir warna rose dengan tali yang dapat diatur. Pas untuk makan malam dan perayaan.',
    },
    variants: ['S', 'M', 'L'].map((s, i) => ({ sku: `EC-DRS-001-${s}`, size: s, color: 'Rose', hex: '#C98B7E', stock: [5, 8, 4][i] })),
  },
  {
    slug: 'straight-leg-jeans', sku: 'EC-BOT-001', category: 'bottoms', image: '/images/products/cat-pantalons.webp', price: 4500,
    name: { tet: 'Kalsa jeans tipu lurus', pt: 'Jeans de corte reto', en: 'Straight-leg jeans', id: 'Jeans potongan lurus' },
    description: {
      tet: "Kalsa jeans klásiku kór azul médiu, tipu lurus, ho tecidu elástiku ne'ebé forte.",
      pt: 'Jeans clássicos azul médio de corte reto em ganga elástica resistente.',
      en: 'Classic mid-blue straight-leg jeans in durable stretch denim.',
      id: 'Jeans klasik biru sedang potongan lurus dari denim stretch yang awet.',
    },
    variants: ['28', '30', '32', '34'].map((s, i) => ({ sku: `EC-BOT-001-${s}`, size: s, color: 'Blue', hex: '#4F6F92', stock: [5, 7, 6, 3][i] })),
  },
  {
    slug: 'camel-handbag', sku: 'EC-BAG-002', category: 'bags', image: '/images/products/cat-sacs.webp', price: 6900,
    name: { tet: 'Pasta liman kór kamelu', pt: 'Mala castanho camel', en: 'Camel handbag', id: 'Tas camel' },
    description: {
      tet: "Pasta estruturadu kór kafé kamelu ho fatin sufisiente ba ita-nia sasán importante.",
      pt: 'Mala estruturada em castanho camel com espaço para o essencial.',
      en: 'Structured camel-brown bag with room for your essentials.',
      id: 'Tas berstruktur warna camel dengan ruang luas untuk barang penting Anda.',
    },
    variants: [{ sku: 'EC-BAG-002-CML', color: 'Camel', hex: '#A8683A', stock: 6 }],
  },
  {
    slug: 'soft-knit-top', sku: 'EC-TOP-002', category: 'tops', image: '/images/products/cat-tops.webp', price: 2990,
    name: { tet: 'Kamiza tricô mamar', pt: 'Top de malha suave', en: 'Soft knit top', id: 'Atasan rajut lembut' },
    description: {
      tet: "Kamiza tricô ne'ebé la todan, ideál ba uza loron-loron.",
      pt: 'Top de malha leve para usar em camadas no dia a dia.',
      en: 'Lightweight knit top for everyday layering.',
      id: 'Atasan rajut tipis untuk dipadukan setiap hari.',
    },
    variants: ['S', 'M', 'L'].map((s, i) => ({ sku: `EC-TOP-002-${s}`, size: s, color: 'Cream', hex: '#EADFCF', stock: [8, 10, 6][i] })),
  },
];

/* ------------------------------------------------------------------ banners */
export const HERO_BANNERS: {
  image: string; ctaUrl: string; badge: L; title: L; highlight: L; subtitle: L; ctaLabel: L;
}[] = [
  {
    image: '/images/hero/hero-1.webp', ctaUrl: '/shop',
    badge: { tet: 'Koleksaun foun', pt: 'Nova coleção', en: 'New collection', id: 'Koleksi baru' },
    title: { tet: 'Elegánsia & Estilu', pt: 'Elegância & Estilo', en: 'Elegance & Style', id: 'Elegan & Bergaya' },
    highlight: { tet: 'iha loron-loron', pt: 'no dia a dia', en: 'every day', id: 'setiap hari' },
    subtitle: {
      tet: "Deskobre ami-nia koleksaun foun no hetan estilu ne'ebé loos ba okaziaun hotu-hotu.",
      pt: 'Descubra a nossa nova coleção e encontre o look perfeito para cada ocasião.',
      en: 'Discover our new collection and find the perfect look for every occasion.',
      id: 'Temukan koleksi terbaru kami dan pilih tampilan yang pas untuk setiap kesempatan.',
    },
    ctaLabel: { tet: 'Hare koleksaun', pt: 'Explorar coleção', en: 'Explore collection', id: 'Jelajahi koleksi' },
  },
  {
    image: '/images/hero/hero-2.webp', ctaUrl: '/shop?category=tops',
    badge: { tet: 'Moda moderna', pt: 'Moda moderna', en: 'Modern fashion', id: 'Fashion modern' },
    title: { tet: 'Blusa & Asesóriu', pt: 'Blusas & Acessórios', en: 'Blouses & Accessories', id: 'Blus & Aksesori' },
    highlight: { tet: 'ho klase', pt: 'com classe', en: 'with class', id: 'penuh kelas' },
    subtitle: {
      tet: "Roupa elegante ne'ebé halo ita sente konfiante iha loron-loron.",
      pt: 'Peças elegantes que lhe dão confiança todos os dias.',
      en: 'Elegant pieces that make you feel confident every day.',
      id: 'Busana elegan yang membuat Anda percaya diri setiap hari.',
    },
    ctaLabel: { tet: 'Hare kamiza & blusa', pt: 'Ver tops e blusas', en: 'Shop tops', id: 'Lihat atasan' },
  },
  {
    image: '/images/hero/hero-3.webp', ctaUrl: '/shop?category=dresses',
    badge: { tet: 'Okaziaun espesiál', pt: 'Ocasiões especiais', en: 'Special occasions', id: 'Acara spesial' },
    title: { tet: 'Vestidu ba', pt: 'Vestidos para', en: 'Dresses for', id: 'Gaun untuk' },
    highlight: { tet: 'momentu espesiál', pt: 'momentos especiais', en: 'special moments', id: 'momen istimewa' },
    subtitle: {
      tet: "Hili vestidu ne'ebé halo ita brilla iha festa, kazamentu no enkontru importante.",
      pt: 'Escolha o vestido que a faz brilhar em festas, casamentos e encontros importantes.',
      en: 'Choose the dress that makes you shine at parties, weddings and important events.',
      id: 'Pilih gaun yang membuat Anda bersinar di pesta, pernikahan, dan acara penting.',
    },
    ctaLabel: { tet: 'Hare vestidu', pt: 'Ver vestidos', en: 'Shop dresses', id: 'Lihat gaun' },
  },
];

export const PROMO_BANNER = {
  image: '/images/promo-art.webp', ctaUrl: '/shop?sale=1',
  badge: { tet: 'Oferta espesiál', pt: 'Oferta especial', en: 'Special offer', id: 'Penawaran spesial' } as L,
  title: { tet: 'To\'o -30%', pt: 'Até -30%', en: 'Up to -30%', id: 'Hingga -30%' } as L,
  highlight: { tet: 'iha koleksaun foun', pt: 'na nova coleção', en: 'on the new collection', id: 'untuk koleksi baru' } as L,
  subtitle: {
    tet: 'Labele lakon oportunidade atu halo ita-nia an kontente!',
    pt: 'Não perca a oportunidade de se presentear!',
    en: "Don't miss the chance to treat yourself!",
    id: 'Jangan lewatkan kesempatan untuk memanjakan diri!',
  } as L,
  ctaLabel: { tet: 'Hare koleksaun', pt: 'Ver coleção', en: 'View collection', id: 'Lihat koleksi' } as L,
};

/* ------------------------------------------------------------------ payment methods */
export const PAYMENT_METHODS: { key: 'BANK_BNCTL' | 'ATM_BNCTL' | 'TPAY' | 'MOSAN' | 'COD'; sortOrder: number; name: L; instructions: L; config: Record<string, string> }[] = [
  {
    key: 'BANK_BNCTL', sortOrder: 1, config: { bankName: 'Banco Nacional de Comércio de Timor-Leste (BNCTL)', accountHolder: 'Eloura Chic', accountNumber: '', branch: 'Dili', swift: '' },
    name: { tet: 'Transferénsia banku BNCTL', pt: 'Transferência bancária BNCTL', en: 'Bank transfer (BNCTL)', id: 'Transfer bank BNCTL' },
    instructions: {
      tet: "1. Transfere folin totál ho loos ba konta BNCTL ne'ebé hatudu iha leten.\n2. Hakerek kódigu pedidu iha deskrisaun/referénsia transferénsia.\n3. Upload komprovativu transferénsia (JPG, PNG ka PDF, máx. 5 MB) no hakerek númeru referénsia.\n4. Ami sei verifika iha oras servisu 1 nia laran no konfirma pedidu.",
      pt: '1. Transfira o valor total exato para a conta BNCTL indicada acima.\n2. Indique o código da encomenda na descrição/referência da transferência.\n3. Carregue o comprovativo (JPG, PNG ou PDF, máx. 5 MB) e introduza o número de referência.\n4. Verificamos em 1 dia útil e confirmamos a encomenda.',
      en: '1. Transfer the exact total to the BNCTL account shown above.\n2. Put the order code in the transfer description / reference.\n3. Upload the transfer receipt (JPG, PNG or PDF, max 5 MB) and enter the reference number.\n4. We verify within 1 business day and confirm your order.',
      id: '1. Transfer total pembayaran dengan jumlah tepat ke rekening BNCTL di atas.\n2. Cantumkan kode pesanan pada keterangan/referensi transfer.\n3. Unggah bukti transfer (JPG, PNG, atau PDF, maks. 5 MB) dan isi nomor referensi.\n4. Kami memverifikasi dalam 1 hari kerja dan mengonfirmasi pesanan Anda.',
    },
  },
  {
    key: 'ATM_BNCTL', sortOrder: 2, config: { bankName: 'Banco Nacional de Comércio de Timor-Leste (BNCTL)', accountHolder: 'Eloura Chic', accountNumber: '', branch: 'Dili', swift: '' },
    name: { tet: 'Transferénsia ATM BNCTL', pt: 'Transferência ATM BNCTL', en: 'ATM transfer (BNCTL)', id: 'Transfer ATM BNCTL' },
    instructions: {
      tet: "1. Ba ATM BNCTL ka P24 no hili \"Transferénsia\".\n2. Tau númeru konta destinasaun iha leten no folin totál ho loos.\n3. Konfirma no foti resibu ATM.\n4. Foto resibu ne'e, hakerek númeru referénsia no oras/data transaksaun, depois upload iha ne'e.",
      pt: '1. Dirija-se a um ATM BNCTL ou P24 e escolha "Transferência".\n2. Introduza o número da conta de destino acima e o valor total exato.\n3. Confirme e guarde o talão do ATM.\n4. Fotografe o talão, indique o número de referência e a data/hora da transação e carregue aqui.',
      en: '1. Go to a BNCTL ATM or P24 terminal and choose "Transfer".\n2. Enter the destination account number above and the exact total.\n3. Confirm and keep the ATM receipt.\n4. Photograph the receipt, enter its reference number and the transaction date/time, then upload it here.',
      id: '1. Datangi ATM BNCTL atau terminal P24 dan pilih "Transfer".\n2. Masukkan nomor rekening tujuan di atas dan jumlah total yang tepat.\n3. Konfirmasi dan simpan struk ATM.\n4. Foto struk, isi nomor referensi serta tanggal/jam transaksi, lalu unggah di sini.',
    },
  },
  {
    key: 'TPAY', sortOrder: 3, config: { merchantName: 'Eloura Chic', merchantNumber: '', qrImage: '' },
    name: { tet: 'T-Pay', pt: 'T-Pay', en: 'T-Pay', id: 'T-Pay' },
    instructions: {
      tet: "1. Loke aplikasaun T-Pay no hili \"Haruka osan\" ka \"Scan QR\".\n2. Haruka folin totál ho loos ba númeru merchant ka scan QR iha leten.\n3. Hakerek kódigu pedidu iha nota (se bele).\n4. Kopia ID transaksaun, foti screenshot, no submete iha ne'e.",
      pt: '1. Abra a aplicação T-Pay e escolha "Enviar dinheiro" ou "Ler QR".\n2. Envie o valor total exato para o número do comerciante ou leia o QR acima.\n3. Indique o código da encomenda na nota (se possível).\n4. Copie o ID da transação, tire uma captura de ecrã e submeta aqui.',
      en: '1. Open the T-Pay app and choose "Send money" or "Scan QR".\n2. Send the exact total to the merchant number or scan the QR above.\n3. Add the order code in the note (if possible).\n4. Copy the transaction ID, take a screenshot and submit it here.',
      id: '1. Buka aplikasi T-Pay dan pilih "Kirim uang" atau "Scan QR".\n2. Kirim total pembayaran dengan jumlah tepat ke nomor merchant atau scan QR di atas.\n3. Tulis kode pesanan pada catatan (jika memungkinkan).\n4. Salin ID transaksi, ambil tangkapan layar, lalu kirim di sini.',
    },
  },
  {
    key: 'MOSAN', sortOrder: 4, config: { merchantName: 'Eloura Chic', merchantNumber: '', qrImage: '' },
    name: { tet: 'Mosan', pt: 'Mosan', en: 'Mosan', id: 'Mosan' },
    instructions: {
      tet: "1. Loke aplikasaun Mosan (ka marka *111#) no hili \"Haruka osan\" ka \"Scan QR\".\n2. Haruka folin totál ho loos ba númeru merchant ka scan QR iha leten.\n3. Hakerek kódigu pedidu iha nota (se bele).\n4. Kopia referénsia transaksaun, foti screenshot, no submete iha ne'e.",
      pt: '1. Abra a aplicação Mosan (ou marque *111#) e escolha "Enviar dinheiro" ou "Ler QR".\n2. Envie o valor total exato para o número do comerciante ou leia o QR acima.\n3. Indique o código da encomenda na nota (se possível).\n4. Copie a referência da transação, tire uma captura de ecrã e submeta aqui.',
      en: '1. Open the Mosan app (or dial *111#) and choose "Send money" or "Scan QR".\n2. Send the exact total to the merchant number or scan the QR above.\n3. Add the order code in the note (if possible).\n4. Copy the transaction reference, take a screenshot and submit it here.',
      id: '1. Buka aplikasi Mosan (atau tekan *111#) dan pilih "Kirim uang" atau "Scan QR".\n2. Kirim total pembayaran dengan jumlah tepat ke nomor merchant atau scan QR di atas.\n3. Tulis kode pesanan pada catatan (jika memungkinkan).\n4. Salin referensi transaksi, ambil tangkapan layar, lalu kirim di sini.',
    },
  },
  {
    key: 'COD', sortOrder: 5, config: {},
    name: { tet: 'Selu bainhira simu (Dili deit)', pt: 'Pagamento na entrega (só Díli)', en: 'Cash on delivery (Dili only)', id: 'Bayar di tempat / COD (khusus Dili)' },
    instructions: {
      tet: "Selu osan-kash USD ba entregadór bainhira simu sasán. Disponivel deit iha zona Dili ne'ebé ami aprova. Ami sei telefone ka WhatsApp ita molok haruka sasán.",
      pt: 'Pague em dinheiro (USD) ao estafeta quando receber a encomenda. Disponível apenas nas zonas de Díli aprovadas. Ligamos ou enviamos WhatsApp antes do envio.',
      en: 'Pay cash (USD) to the courier when you receive your order. Available only in approved Dili zones. We call or WhatsApp you before dispatch.',
      id: 'Bayar tunai (USD) kepada kurir saat pesanan diterima. Hanya tersedia di zona Dili yang disetujui. Kami menelepon atau WhatsApp Anda sebelum pengiriman.',
    },
  },
];

/* ------------------------------------------------------------------ CMS pages */
export const CMS_PAGES: { slug: string; title: L; body: L }[] = [
  {
    slug: 'about',
    title: { tet: 'Kona-ba ami', pt: 'Sobre nós', en: 'About us', id: 'Tentang kami' },
    body: {
      tet: "Eloura Chic mak loja moda no asesóriu feminina iha Dili, Timor-Leste. Ami hili ho kuidadu roupa, tas, sapatu no asesóriu ne'ebé elegante, konfortavel no ho folin ne'ebé loos.\n\n## Ami-nia kompromisu\n- Kualidade ne'ebé ita bele fiar\n- Entrega lais iha Dili\n- Pagamentu lokál ne'ebé seguru: BNCTL, T-Pay, Mosan no selu bainhira simu\n- Servisu kliente 7 loron iha semana",
      pt: 'A Eloura Chic é uma boutique de moda e acessórios femininos em Díli, Timor-Leste. Selecionamos com cuidado roupa, malas, sapatos e acessórios elegantes, confortáveis e a preços justos.\n\n## O nosso compromisso\n- Qualidade em que pode confiar\n- Entrega rápida em Díli\n- Pagamentos locais seguros: BNCTL, T-Pay, Mosan e pagamento na entrega\n- Apoio ao cliente 7 dias por semana',
      en: 'Eloura Chic is a women\'s fashion and accessories boutique in Dili, Timor-Leste. We carefully select elegant, comfortable clothing, bags, shoes and accessories at fair prices.\n\n## Our promise\n- Quality you can trust\n- Fast delivery in Dili\n- Secure local payments: BNCTL, T-Pay, Mosan and cash on delivery\n- Customer support 7 days a week',
      id: 'Eloura Chic adalah butik fashion dan aksesori wanita di Dili, Timor-Leste. Kami memilih dengan cermat pakaian, tas, sepatu, dan aksesori yang elegan, nyaman, dan berharga wajar.\n\n## Komitmen kami\n- Kualitas yang dapat dipercaya\n- Pengiriman cepat di Dili\n- Pembayaran lokal yang aman: BNCTL, T-Pay, Mosan, dan bayar di tempat\n- Layanan pelanggan 7 hari seminggu',
    },
  },
  {
    slug: 'cod-terms',
    title: { tet: 'Termu COD (Selu bainhira simu)', pt: 'Termos de pagamento na entrega (COD)', en: 'Cash on Delivery (COD) terms', id: 'Ketentuan COD (Bayar di tempat)' },
    body: {
      tet: "## Kondisaun ba selu bainhira simu\n1. COD disponivel **deit ba entrega iha munisípiu Dili**, iha zona (postu administrativu / suku) ne'ebé Eloura Chic aprova. Atauro no munisípiu sira seluk la inklui.\n2. Presiza enderesu kompletu (postu administrativu, suku no dalan) no númeru telemóvel +670 ne'ebé ativu. Ami sei kontaktu liuhosi telefone ka WhatsApp molok haruka sasán.\n3. Ita tenke iha fatin bainhira entregadór mai, bele haree sasán molok simu, no prepara **osan-kash USD ho folin loos**.\n4. COD iha limite folin pedidu (máximu no mínimu) ne'ebé hatudu iha checkout. Pedidu ne'ebé liu limite tenke uza métodu pagamentu seluk.\n5. Se ita rejeita sasán la ho razaun, la iha fatin, ka ami la bele kontaktu ita, pedidu sei kansela. Rejeitamentu repetidu bele halo ita-nia konta la bele uza COD tan.",
      pt: '## Condições do pagamento na entrega\n1. O COD está disponível **apenas para entregas no município de Díli**, nas zonas (posto administrativo / suco) aprovadas pela Eloura Chic. Atauro e os restantes municípios não estão incluídos.\n2. São necessários um endereço completo (posto administrativo, suco e rua) e um número de telemóvel +670 ativo. Contactamos por telefone ou WhatsApp antes do envio.\n3. Deve estar presente no momento da entrega, pode inspecionar os artigos antes de aceitar e deve preparar o **valor exato em dinheiro (USD)**.\n4. O COD tem um limite de valor por encomenda (máximo e mínimo) indicado no checkout. Encomendas acima do limite devem usar outro método de pagamento.\n5. Se recusar a encomenda sem motivo, não estiver presente ou não conseguirmos contactá-lo, a encomenda é cancelada. Recusas repetidas podem impedir o uso futuro do COD na sua conta.',
      en: '## Cash on delivery conditions\n1. COD is available **only for deliveries inside Dili municipality**, in zones (administrative post / suco) approved by Eloura Chic. Atauro and all other municipalities are excluded.\n2. A complete address (administrative post, suco and street) and an active +670 mobile number are required. We contact you by phone or WhatsApp before dispatch.\n3. You must be available at the address at handover, may inspect the items before accepting, and must prepare the **exact amount in USD cash**.\n4. COD has an order-value cap (maximum and minimum) shown at checkout. Orders above the cap must use another payment method.\n5. If you refuse the parcel without reason, are not available, or cannot be reached, the order is cancelled. Repeated refusals may restrict COD on your account.',
      id: '## Ketentuan bayar di tempat (COD)\n1. COD **hanya tersedia untuk pengiriman di dalam Munisipalitas Dili**, pada zona (posto administrativo / suco) yang disetujui Eloura Chic. Atauro dan munisipalitas lain tidak termasuk.\n2. Diperlukan alamat lengkap (posto administrativo, suco, dan jalan) serta nomor ponsel +670 yang aktif. Kami menghubungi lewat telepon atau WhatsApp sebelum pengiriman.\n3. Anda harus berada di alamat saat serah terima, boleh memeriksa barang sebelum menerima, dan wajib menyiapkan **uang tunai USD dengan jumlah pas**.\n4. COD memiliki batas nilai pesanan (maksimum dan minimum) yang ditampilkan saat checkout. Pesanan di atas batas harus memakai metode pembayaran lain.\n5. Jika Anda menolak paket tanpa alasan, tidak berada di tempat, atau tidak dapat dihubungi, pesanan dibatalkan. Penolakan berulang dapat membatasi COD pada akun Anda.',
    },
  },
  {
    slug: 'shipping-returns',
    title: { tet: 'Entrega & Fo Fila', pt: 'Entregas e devoluções', en: 'Shipping & returns', id: 'Pengiriman & pengembalian' },
    body: {
      tet: "## Entrega\n- Dili: entrega iha loron 1–2. Entrega gratuita bainhira kompra liu folin minimu ne'ebé hatudu iha checkout.\n- Munisípiu seluk: entrega iha loron 3–7 tuir distánsia.\n\n## Fila fali\nIta bele fila fali sasán iha loron 7 nia laran, bainhira sasán seidauk uza no ho etiketa. Kontaktu ami hodi hahú prosesu.",
      pt: '## Entregas\n- Díli: entrega em 1–2 dias. Entrega gratuita acima do valor mínimo indicado no checkout.\n- Outros municípios: entrega em 3–7 dias, consoante a distância.\n\n## Devoluções\nPode devolver artigos no prazo de 7 dias, se não tiverem sido usados e mantiverem a etiqueta. Contacte-nos para iniciar o processo.',
      en: '## Shipping\n- Dili: delivery in 1–2 days. Free delivery above the minimum order value shown at checkout.\n- Other municipalities: delivery in 3–7 days depending on distance.\n\n## Returns\nYou can return items within 7 days if unused and with tags attached. Contact us to start the process.',
      id: '## Pengiriman\n- Dili: pengiriman 1–2 hari. Gratis ongkir di atas nilai pesanan minimum yang tampil saat checkout.\n- Munisipalitas lain: pengiriman 3–7 hari tergantung jarak.\n\n## Pengembalian\nBarang dapat dikembalikan dalam 7 hari jika belum dipakai dan label masih terpasang. Hubungi kami untuk memulai prosesnya.',
    },
  },
  {
    slug: 'privacy',
    title: { tet: 'Polítika privasidade', pt: 'Política de privacidade', en: 'Privacy policy', id: 'Kebijakan privasi' },
    body: {
      tet: "Eloura Chic rekolla deit dadus ne'ebé presiza atu prosesa ita-nia pedidu: naran, telefone, e-mail, enderesu no komprovativu pagamentu. Ami la fa'an ka fahe ita-nia dadus ba terseiru, kuinhun entregadór ne'ebé presiza atu entrega sasán.\n\nKomprovativu pagamentu rai ho seguru no ema autorizadu deit bele haree. Ita bele husu atu hasai ka koreje ita-nia dadus bainhira de'it liuhosi kontaktu.",
      pt: 'A Eloura Chic recolhe apenas os dados necessários para processar a sua encomenda: nome, telefone, e-mail, endereço e comprovativo de pagamento. Não vendemos nem partilhamos os seus dados com terceiros, exceto o estafeta necessário para a entrega.\n\nOs comprovativos de pagamento são guardados de forma segura e só o pessoal autorizado os pode ver. Pode pedir a correção ou remoção dos seus dados a qualquer momento através do contacto.',
      en: 'Eloura Chic collects only the data needed to process your order: name, phone, e-mail, address and payment proof. We do not sell or share your data with third parties, except the courier needed for delivery.\n\nPayment proofs are stored securely and are visible only to authorised staff. You may ask us to correct or delete your data at any time via the contact page.',
      id: 'Eloura Chic hanya mengumpulkan data yang diperlukan untuk memproses pesanan Anda: nama, telepon, e-mail, alamat, dan bukti pembayaran. Kami tidak menjual atau membagikan data Anda kepada pihak ketiga, kecuali kurir yang diperlukan untuk pengiriman.\n\nBukti pembayaran disimpan dengan aman dan hanya dapat dilihat oleh staf yang berwenang. Anda dapat meminta koreksi atau penghapusan data kapan saja melalui halaman kontak.',
    },
  },
  {
    slug: 'terms',
    title: { tet: 'Termu & Kondisaun', pt: 'Termos e condições', en: 'Terms & conditions', id: 'Syarat & ketentuan' },
    body: {
      tet: "Folin hotu iha dolar amerikanu (USD). Pedidu konfirma bainhira ami verifika pagamentu (ka konfirma COD liuhosi telefone). Pedidu ne'ebé la selu iha oras ne'ebé hatudu sei kansela automátikamente no estoke fila fali.\n\nEloura Chic reserva direitu atu kansela pedidu bainhira iha erru folin ka estoke, no sei fila fali osan ne'ebé selu ona.",
      pt: 'Todos os preços são em dólares americanos (USD). A encomenda é confirmada após a verificação do pagamento (ou confirmação telefónica do COD). Encomendas não pagas no prazo indicado são canceladas automaticamente e o stock é libertado.\n\nA Eloura Chic reserva-se o direito de cancelar encomendas em caso de erro de preço ou de stock, reembolsando os valores pagos.',
      en: 'All prices are in US dollars (USD). An order is confirmed once payment is verified (or the COD is confirmed by phone). Orders not paid within the stated deadline are cancelled automatically and stock is released.\n\nEloura Chic reserves the right to cancel orders in case of a pricing or stock error, and will refund any amount paid.',
      id: 'Semua harga dalam dolar AS (USD). Pesanan dikonfirmasi setelah pembayaran diverifikasi (atau COD dikonfirmasi lewat telepon). Pesanan yang tidak dibayar dalam batas waktu akan dibatalkan otomatis dan stok dikembalikan.\n\nEloura Chic berhak membatalkan pesanan jika terjadi kesalahan harga atau stok, dan akan mengembalikan dana yang telah dibayar.',
    },
  },
];

export const COUPON_DEMO = {
  code: 'WELCOME10', type: 'PERCENT' as const, value: 10, minOrderCents: 2000, maxDiscountCents: 1500,
  description: { tet: 'Deskonto 10% ba kompra dahuluk', pt: '10% de desconto na primeira compra', en: '10% off your first order', id: 'Diskon 10% untuk pembelian pertama' },
};
