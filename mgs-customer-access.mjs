import {auth} from './firebase-client.mjs';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
if(location.protocol!=='file:'){
 let user=null,ready;const loaded=new Promise(resolve=>ready=resolve);
 onAuthStateChanged(auth,value=>{user=value;connectedPreview.setCustomerAccess(Boolean(user&&!user.isAnonymous));ready();});
 window.mgsCustomerSignIn=async()=>{await loaded;if(!user||user.isAnonymous){sessionStorage.setItem('mosaboMgsReturn','1');location.href='member.html';return;}connectedPreview.setCustomerAccess(true);connectedPreview.roots.mo.getElementById('businessTariffOverview').scrollIntoView({behavior:'smooth',block:'start'});};
}
