const SpoilerMode=(()=>{
 const key='apex-spoiler-free';
 function saved(){try{return localStorage.getItem(key)==='true'}catch{return false}}
 function apply(enabled){document.documentElement.dataset.spoilerFree=String(Boolean(enabled));return Boolean(enabled)}
 apply(saved());return {key,saved,apply};
})();
