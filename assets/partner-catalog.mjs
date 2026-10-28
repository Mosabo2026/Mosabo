import {CAFE_REFERENCE_MARKUP} from './cafe-reference.mjs';
import {mountWashTariffs,eligibleWashOffers} from './wash-tariffs.mjs';
import {auth,db} from './firebase-client.mjs';
import './checkout.mjs?v=cafe-preise-3';
import {COFFEE_TARIFFS,coffeePrice,coffeeTariffMarkup} from './coffee-tariffs.mjs';
import {WORLDS,visiblePartners} from './partner-policy.mjs?v=katalog-2';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import {doc,getDoc,collection,query,where,onSnapshot} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import {watchPaymentState} from './payment-readiness.mjs';
import {canPurchase,purchaseLabel} from './payment-state.mjs';
const $=id=>document.getElementById(id),list=$('partnerOffers'),status=$('offerStatus'),search=new URLSearchParams(location.search),id=search.get('partner'),selectedPlan=search.get('plan');
const browseWorld=!id&&WORLDS.find(w=>w.id===({coffee:'food',carwash:'auto'}[search.get('bereich')]||search.get('bereich')));
const selectedBranch=search.get('bereich')==='carwash'?'Autowäsche':browseWorld?.branches.includes(search.get('branche'))?search.get('branche'):null;
let generation=0,stop=()=>{},working=false,payment={},controls=[],chosenCoffeeCompany='',washController=null;
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function ready(){washController?.setPayment(canPurchase(payment,'carwash'));const note=document.getElementById('referencePaymentStatus');if(note)note.textContent=message();for(const c of controls){c.button.disabled=working||!c.checkbox.checked||!canPurchase(payment,c.kind);c.button.textContent=purchaseLabel(payment,c.kind);}}
function message(){
 return !payment.enabled?'Deine Preise bleiben sichtbar. Der Bestellstart wird noch vorbereitet.':payment.mode==='test'?'Testmodus: keine echte Zahlung und kein echtes Einlöseguthaben.':'Wähle deinen Tarif. Nach bestätigter Zahlung erscheinen Abo und Guthaben in deinem Kundenkonto.';
}
watchPaymentState(value=>{payment=value;ready();if(controls.length)status.textContent=message();});
function termsAndButton(card,kind,payload){
 const label=el('label'),checkbox=el('input');checkbox.type='checkbox';label.append(checkbox,el('span','Ich akzeptiere die Abo-Bedingungen und die monatliche Zahlung.'));
 const terms=el('a','Abo-Bedingungen lesen');terms.href='agb.html';terms.target='_blank';terms.rel='noopener';
 const button=el('button');button.type='button';controls.push({button,checkbox,kind});checkbox.onchange=ready;
 button.onclick=async()=>{if(button.disabled)return;working=true;ready();try{await window.moStripeCheckout({...payload,...(kind==='coffee'?{companyId:chosenCoffeeCompany}:{}),termsAccepted:true});}catch(e){status.textContent=e.message||'Zahlung konnte nicht gestartet werden.';}finally{working=false;ready();}};
 card.append(terms,label,button);
}
function coffeeCards(){
 const wrapper=el('div');wrapper.innerHTML=CAFE_REFERENCE_MARKUP;list.append(wrapper);
 const inputs=[...wrapper.querySelectorAll('input[name="club-plan"]')],next=wrapper.querySelector('#continueCheckout'),checkout=wrapper.querySelector('#checkout'),summary=wrapper.querySelector('#checkoutSummary'),paymentHost=wrapper.querySelector('#coffeePaymentControls');
 let selected=COFFEE_TARIFFS.some(p=>p.id===selectedPlan)?selectedPlan:'';
 const updateSelection=()=>{for(const input of inputs){input.checked=input.value===selected;input.closest('.select-plan')?.classList.toggle('selected',input.checked);}const plan=COFFEE_TARIFFS.find(p=>p.id===selected);wrapper.querySelector('#selectionText').textContent=plan?plan.name+' · '+coffeePrice(plan.priceCents)+' / Monat':'Bitte wähle ein Angebot aus.';next.disabled=!plan;checkout.classList.add('hidden');};
 for(const input of inputs)input.addEventListener('change',()=>{selected=input.value;updateSelection();});
 next.addEventListener('click',()=>{const plan=COFFEE_TARIFFS.find(p=>p.id===selected);if(!plan)return;summary.replaceChildren(el('p',plan.name+' · '+coffeePrice(plan.priceCents)+' / Monat'),el('p',plan.description),el('p','Einlösbar bei teilnehmenden, freigegebenen Cafés, Restaurants, Bars und Bäckereien.'));paymentHost.replaceChildren();controls=controls.filter(c=>c.button.isConnected);termsAndButton(paymentHost,'coffee',{category:'coffee',plan:selected,redemptionScope:'food-network'});checkout.classList.remove('hidden');ready();checkout.scrollIntoView({behavior:'smooth',block:'start'});});
 wrapper.querySelector('#changePlan').addEventListener('click',()=>{checkout.classList.add('hidden');wrapper.querySelector('#tarife').scrollIntoView({behavior:'smooth'});});
 for(const button of wrapper.querySelectorAll('[data-goto]'))button.addEventListener('click',()=>wrapper.querySelector('#'+button.dataset.goto)?.scrollIntoView({behavior:'smooth'}));
 updateSelection();document.getElementById('coffeeStaticPrices')?.setAttribute('hidden','');ready();
}
function partnerLogo(p){if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logoData||'')){$('partnerLogo').src=p.logoData;$('partnerLogo').hidden=false;}}
onAuthStateChanged(auth,async user=>{
 const run=++generation;stop();list.replaceChildren();controls=[];washController=null;chosenCoffeeCompany='';$('partnerLogo').hidden=true;
 document.getElementById('coffeeStaticPrices')?.setAttribute('hidden','');
 if(browseWorld){$('offerTitle').textContent=browseWorld.name;$('partnerArea').textContent=browseWorld.branches.join(' · ');}
 if(!user?.emailVerified){$('offerLogin').hidden=false;status.textContent='Bitte mit deinem bestätigten Kundenkonto anmelden. Danach kannst du den Betrieb und sein Abo öffnen.';return;}
 $('offerLogin').hidden=true;
 if(browseWorld){
  if(selectedBranch){
   $('offerTitle').textContent=selectedBranch+' · Deine Abos';$('partnerArea').textContent='Tarif auswählen und anschließend bezahlen';
   const back=el('a','← Zur Übersicht');back.href='partner-angebote.html?bereich='+encodeURIComponent(browseWorld.id);$('partnerArea').append(el('br'),back);
   const isCafeBranch=['Cafés','Restaurants','Bäckereien','Bars'].includes(selectedBranch);
   const isWashBranch=selectedBranch==='Autowäsche';let washOffers=[],washPartners=[],stopWash=()=>{};
   if(isCafeBranch)coffeeCards();
   if(isWashBranch){const host=el('div');host.className='wash-catalog';host.style.gridColumn='1 / -1';list.append(host);washController=mountWashTariffs(host,{onCheckout:data=>window.moStripeCheckout(data),canPay:canPurchase(payment,'carwash')});
    stopWash=onSnapshot(query(collection(db,'services/carwash/offers'),where('active','==',true)),snap=>{if(run!==generation)return;washOffers=snap.docs.map(d=>({...d.data(),id:d.id}));washController?.setOffers(eligibleWashOffers(washOffers,washPartners));},()=>{if(run===generation)status.textContent='Deine Autowäsche-Tarife sind sichtbar. Buchbare Standorte konnten gerade nicht geprüft werden.';});}
   const publishedHost=el('div');list.append(publishedHost);
   status.textContent=isCafeBranch||isWashBranch?message():'Veröffentlichte Angebote werden geladen …';
   let stopOffers=()=>{};
   stop=onSnapshot(query(collection(db,'publicPartners'),where('active','==',true)),snapshot=>{
    if(run!==generation)return;stopOffers();publishedHost.replaceChildren();controls=controls.filter(c=>c.button.isConnected);
    const partners=visiblePartners(snapshot.docs.map(d=>({...d.data(),id:d.id}))).filter(p=>p.world.id===browseWorld.id&&p.branch===selectedBranch);
    if(isWashBranch){washPartners=partners.filter(p=>p.category==='carwash'&&p.id.startsWith('carwash__')).map(p=>({...p,companyId:p.id.slice(9)}));washController?.setOffers(eligibleWashOffers(washOffers,washPartners));}
    const coffee=visiblePartners(snapshot.docs.map(d=>({...d.data(),id:d.id}))).filter(p=>p.world.id==='food');
    chosenCoffeeCompany=coffee.length===1?coffee[0].id.slice(8):'';
    status.textContent=isCafeBranch||isWashBranch?message():partners.length?message():'Hier wurden noch keine buchbaren Abos veröffentlicht.';
    
    const partnerIds=new Set(partners.map(p=>p.id));
    stopOffers=onSnapshot(query(collection(db,'subscriptionOffers'),where('active','==',true)),snap=>{
     if(run!==generation)return;
     publishedHost.replaceChildren();
     controls=controls.filter(c=>c.button.isConnected);
     for(const d of snap.docs){const o=d.data();if(!partnerIds.has(o.partnerId))continue;const card=el('article');card.className='coffee-price-card';card.dataset.publishedOffer='true';card.append(el('h2',o.name),el('p',o.units+' '+o.unit+' pro Monat'),el('p',coffeePrice(o.priceCents)+' / Monat'));termsAndButton(card,'catalog',{category:o.category,catalogOfferId:d.id});publishedHost.append(card);}ready();
    },()=>{if(run===generation)status.textContent=isCafeBranch||isWashBranch?message():'Die veröffentlichten Tarife konnten gerade nicht geladen werden.';});
   },()=>{if(run===generation){if(isWashBranch){washPartners=[];washController?.setOffers([]);}status.textContent=isCafeBranch||isWashBranch?'Deine Tarife sind sichtbar. Die aktuelle Partnerliste konnte gerade nicht geprüft werden. Beim Bestellen wird die Freigabe serverseitig geprüft.':'Die Abos konnten gerade nicht geladen werden.';}});
   const stopPartners=stop;stop=()=>{stopPartners();stopOffers();stopWash();};return;
  }
  const renderWorld=snapshot=>{
   if(run!==generation)return;list.replaceChildren();
   if(browseWorld.id==='food'&&window.moOfferVisuals?.cafe){const hero=el('section');hero.className='experience-hero';const photo=el('img');photo.src=window.moOfferVisuals.cafe;photo.alt='Deine Genusswelt bei Mo’s Abo';const intro=el('div');intro.className='experience-copy';intro.innerHTML='<span class="experience-kicker">ESSEN & TRINKEN</span><h2>Gute Orte.<br><em>Besondere Momente.</em></h2><p>Entdecke unsere Partner und wähle darunter Café, Restaurant, Bäckerei oder Bar für deine Abo-Auswahl.</p><div class="experience-actions"><a href="#branchChoice">Deine Angebote entdecken →</a></div>';hero.append(photo,intro);list.append(hero);}
   const partners=visiblePartners(snapshot.docs.map(d=>({...d.data(),id:d.id}))).filter(p=>p.world.id===browseWorld.id);
   status.textContent='Unsere Partner im Überblick. Wähle darunter eine Branche, um auf der nächsten Seite die Abos zu sehen.';
   const directory=el('section');directory.className='coffee-price-overview';directory.append(el('h2','Unsere Partner'));const firms=el('div');firms.className='coffee-price-grid';directory.append(firms);list.append(directory);
   if(!partners.length)firms.append(el('p','Hier erscheinen die freigegebenen Partner.'));
   for(const p of partners){const card=el('article');card.className='member-partner-card';
    const known=(window.moKnownCompanies||[]).find(k=>[k.name,...(k.aliases||[])].some(n=>n.toLocaleLowerCase('de-DE')===p.name.toLocaleLowerCase('de-DE')));
    const safeLogo=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.logoData||'')?p.logoData:/^assets\/logos\/[a-z0-9-]+\.(png|jpe?g|webp)$/.test(known?.logoSrc||'')?known.logoSrc:null;
    if(safeLogo){const img=el('img');img.src=safeLogo;img.alt='Logo '+p.name;img.className='member-partner-logo';card.append(img);}
    card.append(el('h3',p.name),el('p',p.branch),el('p',p.address||''));firms.append(card);
   }
   const categories=el('section');categories.id='branchChoice';categories.className='coffee-price-overview';categories.append(el('h2','Welches Abo möchtest du?'));const branches=el('div');branches.className='coffee-price-grid';
   const labels={'Cafés':'Café','Restaurants':'Restaurant','Bäckereien':'Bäckerei','Bars':'Bar'};
   for(const branch of browseWorld.branches){const card=el('article');card.className='coffee-price-card';card.append(el('h3',labels[branch]||branch));const link=el('a','Tarife auswählen →');link.className='member-offers';link.href='partner-angebote.html?bereich='+encodeURIComponent(browseWorld.id)+'&branche='+encodeURIComponent(branch);card.append(link);branches.append(card);}categories.append(branches);list.append(categories);
  };
  renderWorld({docs:[]});
  stop=onSnapshot(query(collection(db,'publicPartners'),where('active','==',true)),renderWorld,()=>{if(run!==generation)return;renderWorld({docs:[]});status.textContent='Die Partner konnten gerade nicht geladen werden. Bitte später erneut versuchen.';});return;
 }
 if(!/^[A-Za-z0-9_-]{1,180}$/.test(id||'')){status.textContent='Bitte zuerst einen Partner im Kundenbereich auswählen.';return;}
 try{
  const partner=await getDoc(doc(db,'publicPartners',id));if(run!==generation)return;
  if(!partner.exists()||partner.data().active!==true){status.textContent='Dieser Partner ist nicht freigegeben.';return;}
  const p=partner.data();$('offerTitle').textContent=p.name;$('partnerArea').textContent=p.branch||'';partnerLogo(p);
  const isCoffee=p.category==='coffee'&&id.startsWith('coffee__');if(isCoffee){location.replace('partner-angebote.html?bereich=food&branche='+encodeURIComponent('Cafés'));return;}
  stop=onSnapshot(query(collection(db,'subscriptionOffers'),where('partnerId','==',id),where('active','==',true)),snap=>{
   if(run!==generation)return;list.replaceChildren();controls=[];
   if(isCoffee)coffeeCards();
   if(!snap.empty&&isCoffee)list.append(el('h2','Weitere Abos dieses Partners'));
   status.textContent=snap.empty&&!isCoffee?'Für diesen Partner wurde noch kein Abo veröffentlicht.':message();
   for(const d of snap.docs){const o=d.data(),card=el('article');card.className='coffee-price-card';card.append(el('h2',o.name),el('p',o.units+' '+o.unit+' pro Monat'));const price=el('p',coffeePrice(o.priceCents)+' / Monat');price.className='coffee-price';card.append(price);termsAndButton(card,'catalog',{category:o.category,catalogOfferId:d.id});list.append(card);}ready();
  },()=>{if(run!==generation)return;list.replaceChildren();controls=[];if(isCoffee)coffeeCards();status.textContent=isCoffee?message():'Angebote konnten nicht geladen werden. Bitte später erneut versuchen.';});
 }catch{if(run===generation)status.textContent='Partner konnte nicht geladen werden.';}
});
