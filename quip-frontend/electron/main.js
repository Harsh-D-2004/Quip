import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (!app.isPackaged) {
        // Dev: load Vite dev server
        win.loadURL("http://localhost:8080");
        win.webContents.openDevTools();
    } else {
        // Prod: load Vite build
        win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
