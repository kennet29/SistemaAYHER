import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('ayher', {
  getApiBase: async (): Promise<string> => {
    try {
      const val = await ipcRenderer.invoke('ayher:get-api-base');
      return typeof val === 'string' ? val : 'http://127.0.0.1:4000';
    } catch {
      return 'http://127.0.0.1:4000';
    }
  },
});

export {};

