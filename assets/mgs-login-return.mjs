import {auth} from './firebase-client.mjs';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
onAuthStateChanged(auth,user=>{if(user&&!user.isAnonymous&&sessionStorage.getItem('mosaboMgsReturn')==='1'){sessionStorage.removeItem('mosaboMgsReturn');location.replace('mgs.html#mo/moMgsBusiness');}});
