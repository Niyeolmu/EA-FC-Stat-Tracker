const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, 'public/trophy.webp'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Menü çubuğunu gizlemek istersen true yapabilirsin
    autoHideMenuBar: true,
  });

  // Üretim modunda (build sonrası) dist klasöründeki index.html'i yükle
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  } else {
    // Geliştirme modunda Vite server'ı yükle
    win.loadURL('http://localhost:3000');
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
