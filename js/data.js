const hubs = Object.fromEntries([
 ['Istanbul',41.01,28.98],['Suez',29.97,32.55],['Rotterdam',51.92,4.48],['London',51.51,-.13],['Frankfurt',50.11,8.68],['Lisbon',38.72,-9.14],['Dubai',25.2,55.27],['Mumbai',19.08,72.88],['Lagos',6.52,3.38],['Cape Town',-33.92,18.42],['Singapore',1.35,103.82],['Shanghai',31.23,121.47],['Tokyo',35.68,139.69],['Sydney',-33.87,151.21],['New York',40.71,-74.01],['Los Angeles',34.05,-118.24],['Panama City',8.98,-79.52],['São Paulo',-23.55,-46.63],['Mexico City',19.43,-99.13],['Moscow',55.76,37.62]
].map(([name,lat,lon])=>[name,[lon,lat]]));
const crises=[
 ['Canal congestion','Suez','Freight'],['North Atlantic storm','London','Air'],['Port strike','Rotterdam','Freight'],['Pacific typhoon','Shanghai','Air'],['Canal drought','Panama City','Freight'],['Fuel shortage','Dubai','Air'],['Customs outage','Singapore','Freight'],['Monsoon flooding','Mumbai','Freight']
];
const hubInfo=Object.fromEntries(Object.keys(hubs).map((name,i)=>[name,{countryCode:'TUR EGY NLD GBR DEU PRT ARE IND NGA ZAF SGP CHN JPN AUS USA USA PAN BRA MEX RUS'.split(' ')[i]}]));
const chapters=[
 ['First Spark','İlk Kıvılcım'],['Race Against Time','Zamana Karşı'],['Global Storm','Küresel Fırtına'],['The Global Bridge','Küresel Köprü']
];
const stories={
 inspection:[['Fleet safety inspection','Filo güvenlik denetimi'],['Inspect the fleet before storm season. Skipping risks a fine next quarter.','Fırtına öncesi filoyu denetlet. Atlarsan gelecek çeyrekte ceza riski var.'],['Pay $700',' $700 öde'],['Skip inspection','Denetimi atla']],
 crew:[['Crew overtime','Fazla mesai'],['Reward the crew for reliable service in Q4. Unpaid overtime gives a short speed boost but costs a crew member later.','Son çeyrekte hızlı hizmet için ekibi ödüllendir. Ücretsiz mesai kısa süreli hız sağlar ama sonrasında bir çalışan ayrılır.'],['Pay $500 bonus','$500 prim öde'],['Order overtime','Fazla mesai iste']],
 suez:[['Suez Canal blockage','Süveyş Kanalı tıkandı'],['A grounded ship is blocking the canal. Pay for an airlift or divert affected freight for 25 seconds.','Karaya oturan bir gemi kanalı kapattı. Hava köprüsü kur veya etkilenen yükleri 25 saniye boyunca başka yola yönlendir.'],['Airlift · $800','Hava köprüsü · $800'],['Divert freight','Yükleri yönlendir']],
 medical:[['UN medical shipment','BM sağlık sevkiyatı'],['Deliver emergency supplies to Lagos in 40 seconds. A private client offers immediate payment instead.','Acil malzemeleri 40 saniyede Lagos’a ulaştır. Özel müşteri alternatif olarak peşin ödeme sunuyor.'],['Accept mission','Görevi kabul et'],['Private contract +$400','Özel sözleşme +$400']]
};
