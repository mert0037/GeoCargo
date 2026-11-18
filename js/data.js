const hubs = Object.fromEntries([
 ['Istanbul',41.01,28.98],['Suez',29.97,32.55],['Rotterdam',51.92,4.48],['London',51.51,-.13],['Frankfurt',50.11,8.68],['Lisbon',38.72,-9.14],['Dubai',25.2,55.27],['Mumbai',19.08,72.88],['Lagos',6.52,3.38],['Cape Town',-33.92,18.42],['Singapore',1.35,103.82],['Shanghai',31.23,121.47],['Tokyo',35.68,139.69],['Sydney',-33.87,151.21],['New York',40.71,-74.01],['Los Angeles',34.05,-118.24],['Panama City',8.98,-79.52],['São Paulo',-23.55,-46.63],['Mexico City',19.43,-99.13],['Moscow',55.76,37.62]
].map(([name,lat,lon])=>[name,[lon,lat]]));
const crises=[
 ['Canal congestion','Suez','Freight'],['North Atlantic storm','London','Air'],['Port strike','Rotterdam','Freight'],['Pacific typhoon','Shanghai','Air'],['Canal drought','Panama City','Freight'],['Fuel shortage','Dubai','Air'],['Customs outage','Singapore','Freight'],['Monsoon flooding','Mumbai','Freight']
];
