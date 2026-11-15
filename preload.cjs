const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('coach',{load:()=>ipcRenderer.invoke('load'),save:data=>ipcRenderer.invoke('save',data),speak:text=>ipcRenderer.invoke('speak',text),export:()=>ipcRenderer.invoke('export')});
