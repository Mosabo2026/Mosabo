import {auth} from './firebase-client.mjs';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
onAuthStateChanged(auth,user=>{const allowed=Boolean(user&&!user.isAnonymous);if(allowed)document.documentElement.setAttribute('data-mo-offers-access','granted');else document.documentElement.removeAttribute('data-mo-offers-access');const gate=document.getElementById('moFreeOffersGate');if(gate)gate.hidden=allowed;});
// Visibility gate only. Existing authenticated backend authorization remains required for purchases.
