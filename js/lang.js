let language='en';
try{language=localStorage.getItem('geo-language')==='tr'?'tr':'en'}catch{}
const tr=(en,turkish)=>language==='tr'?turkish:en;
const pair=values=>tr(...values);
const words={
 'From':'Çıkış','To':'Varış','Via':'Taşıma','Freight':'Yük gemisi','Air':'Uçak','Open corridor':'Koridor aç','Company & fleet':'Şirket ve filo','Ops & analytics':'Operasyon ve analiz','Operations':'Operasyonlar','Shipment queue':'Sevkiyat kuyruğu','Open corridors':'Açık koridorlar','Market share':'Küresel erişim','Operational risk':'Operasyon riski','Company':'Şirket','Budget':'Bütçe','Staff':'Personel','Fleet':'Filo','Score':'Puan','Flow / 15s':'Akış / 15 sn','Income and expenses':'Gelir ve gider','Deliveries':'Teslimatlar','Buy freighter · $900':'Gemi al · $900','Buy plane · $1,500':'Uçak al · $1.500','Hire crew · $650':'Personel al · $650','Global Logistics Command':'Küresel Lojistik Komutası','Istanbul':'İstanbul','Suez':'Süveyş','London':'Londra','Singapore':'Singapur','Shanghai':'Şanghay','Moscow':'Moskova','Sydney':'Sidney','Lisbon':'Lizbon','Local':'Yerel','Regional':'Bölgesel','International':'Uluslararası','Global':'Küresel','Play again':'Tekrar oyna','Start in Istanbul':'İstanbul’da başla','Pause simulation':'Simülasyonu duraklat','Close company panel':'Şirket panelini kapat','Close operations panel':'Operasyon panelini kapat','Priority contract':'Öncelikli sözleşme','Plan route':'Rota planla','Back to map':'Haritaya dön','Shipment delivered':'Sevkiyat tamamlandı','Corridor investment':'Koridor yatırımı','Crew hired':'Personel alındı','Plane acquired':'Uçak alındı','Freighter acquired':'Gemi alındı','Insufficient budget.':'Bütçe yetersiz.','Corridor already open.':'Koridor zaten açık.','Insufficient funds for this corridor.':'Bu koridor için bütçe yetersiz.','Corridor busy. Close after arrival.':'Koridor meşgul. Varıştan sonra kapat.','Choose a destination':'Bir hedef seç','Select an active origin first.':'Önce etkin bir çıkış merkezi seç.','Review the quote and open the corridor.':'Maliyeti incele ve koridoru aç.','New shipment':'Yeni sipariş','Corridor closed':'Koridor kapatıldı','Select a destination from':'Buradan bir hedef seç','Global Lifeline':'Küresel Yaşam Hattı','Ruthless Tycoon':'Acımasız Patron','Collapsed Startup':'Batan Girişim','Local Carrier':'Yerel Taşıyıcı','Regional Network':'Bölgesel Ağ','Continental Fleet':'Kıtalararası Filo','Global Giant':'Küresel Dev'
};
function t(value){return language==='tr'?(words[value]||value):value}
function localizeStatic(){
  document.documentElement.lang=language;
  document.querySelectorAll('[data-en]').forEach(el=>{
    const node=[...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    if(node)node.textContent=t(el.dataset.en)+' ';
  });
  document.querySelectorAll('[data-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.aria)));
  field('language').textContent=tr('Türkçe','English');
  document.querySelectorAll('select option').forEach(o=>o.textContent=t(o.value));
}
