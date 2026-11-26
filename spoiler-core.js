const SpoilerMode=(()=>{
 const key='apex-spoiler-free';
 function saved(){try{return localStorage.getItem(key)==='true'}catch{return false}}
 function apply(enabled){
  const next=String(Boolean(enabled)),root=document.documentElement;
  if(root.dataset.spoilerFree!==next)for(const panel of document.querySelectorAll('[data-spoiler-revealed]'))panel.removeAttribute('data-spoiler-revealed');
  root.dataset.spoilerFree=next;
  return Boolean(enabled);
 }
 apply(saved());return {key,saved,apply};
})();
