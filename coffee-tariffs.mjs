// Existing café tariffs, matching the server's COFFEE prices and allowances.
export const COFFEE_TARIFFS=[
 {id:'basic',name:'Basic',priceCents:2000,units:8,description:'8 Getränke pro Monat'},
 {id:'standard',name:'Standard',priceCents:3500,units:16,description:'16 Getränke pro Monat'},
 {id:'premium',name:'Premium',priceCents:6000,units:30,description:'30 Getränke pro Monat'},
 {id:'mittag',name:'Mittagsmoment',priceCents:1000,units:0,description:'1 Getränk pro Werktag · Mo–Fr, 12–14 Uhr'},
 {id:'cowork',name:'Coworking',priceCents:2990,units:0,description:'Getränke nach Tarif und WLAN · Mo–Fr, 15–22 Uhr'}
];
export const coffeePrice=cents=>(cents/100).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
export function coffeeTariffMarkup(){return '<section class="coffee-price-overview"><h3>Café-Tarife im Überblick</h3><p>Öffne oben einen teilnehmenden Betrieb. Auf seiner Angebotsseite wählst und bestellst du dein Abo.</p><div class="coffee-price-grid">'+COFFEE_TARIFFS.map(p=>'<article class="coffee-price-card"><h4>'+p.name+'</h4><p class="coffee-price">'+coffeePrice(p.priceCents)+'<small> / Monat</small></p><p>'+p.description+'</p></article>').join('')+'</div></section>';}
