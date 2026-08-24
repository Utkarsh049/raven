export function ThemeScript() {
  const script = `(function(){try{var k="raven-settings";var raw=localStorage.getItem(k);var t="system";try{var j=raw?JSON.parse(raw):null;var s=j&&j.state&&j.state.theme;if(s==="light"||s==="dark"||s==="system")t=s;}catch(e){}var r=t;if(t==="system")r=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",r);if(r==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
